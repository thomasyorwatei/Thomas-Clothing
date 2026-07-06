const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { validateCheckout, sanitizeString } = require('../_lib/validators');
const { v4: uuidv4 } = require('uuid');
const { sendToAdmins } = require('../notifications/sseClients');

function generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RWT-${timestamp}-${random}`;
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const errors = validateCheckout(body);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    try {
        // Get optional user identity
        let userId = null;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('users').select('id').eq('auth_id', user.id).single();
                if (profile) userId = profile.id;
            }
        }

        // Validate and price all items from the database (never trust client-side prices)
        const productIds = body.items.map(i => parseInt(i.product_id));
        const { data: products, error: productsError } = await supabaseAdmin
            .from('products')
            .select('id, name, price, stock_qty, image_url, is_active')
            .in('id', productIds);

        if (productsError) {
            return res.status(500).json({ error: 'Failed to validate products' });
        }

        const productMap = {};
        products.forEach(p => { productMap[p.id] = p; });

        // Validate each item
        const validatedItems = [];
        for (const item of body.items) {
            const product = productMap[parseInt(item.product_id)];
            if (!product || !product.is_active) {
                return res.status(400).json({ error: `Product ${item.product_id} not found` });
            }
            if (product.stock_qty < parseInt(item.quantity)) {
                return res.status(400).json({
                    error: `Insufficient stock for "${product.name}". Available: ${product.stock_qty}`
                });
            }
            validatedItems.push({
                product_id: product.id,
                product_name: product.name,
                product_image: product.image_url,
                size: item.size || null,
                unit_price: product.price,
                quantity: parseInt(item.quantity),
                line_total: product.price * parseInt(item.quantity)
            });
        }

        const TAX_RATE = 0.18;
        const SHIPPING_KIGALI = 2000;
        const SHIPPING_OTHER = 5000;

        const subtotal = validatedItems.reduce((sum, i) => sum + i.line_total, 0);
        const isKigali = (body.shipping_city || '').toLowerCase().includes('kigali');
        const shippingFee = isKigali ? SHIPPING_KIGALI : SHIPPING_OTHER;
        const taxAmount = Math.round(subtotal * TAX_RATE);
        const totalAmount = subtotal + shippingFee + taxAmount;

        const orderNumber = generateOrderNumber();

        // Create order
        const { data: order, error: orderError } = await supabaseAdmin
            .from('orders')
            .insert({
                user_id: userId,
                order_number: orderNumber,
                status: 'pending',
                customer_first_name: sanitizeString(body.first_name, 100),
                customer_last_name: sanitizeString(body.last_name, 100),
                customer_email: body.email.toLowerCase().trim(),
                customer_phone: sanitizeString(body.phone || '', 20),
                shipping_street: sanitizeString(body.shipping_street, 255),
                shipping_city: sanitizeString(body.shipping_city, 100),
                shipping_province: sanitizeString(body.shipping_province || '', 100),
                shipping_country: 'Rwanda',
                subtotal,
                shipping_fee: shippingFee,
                tax_amount: taxAmount,
                total_amount: totalAmount,
                currency: 'RWF',
                payment_method: body.payment_method,
                notes: sanitizeString(body.notes || '', 500)
            })
            .select()
            .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
            return res.status(500).json({ error: 'Failed to create order' });
        }

        // Insert order items
        const orderItems = validatedItems.map(item => ({
            ...item,
            order_id: order.id
        }));

        const { error: itemsError } = await supabaseAdmin
            .from('order_items')
            .insert(orderItems);

        if (itemsError) {
            // Rollback order
            await supabaseAdmin.from('orders').delete().eq('id', order.id);
            return res.status(500).json({ error: 'Failed to save order items' });
        }

        // Create transaction record
        const { error: txError } = await supabaseAdmin
            .from('transactions')
            .insert({
                order_id: order.id,
                transaction_ref: uuidv4(),
                payment_method: body.payment_method,
                status: 'pending',
                amount: totalAmount,
                currency: 'RWF'
            });

        if (txError) {
            console.error('Transaction creation error:', txError);
            // Non-fatal — order already created
        }

        // Reduce stock for each product using direct update
        for (const item of validatedItems) {
            const newStock = productMap[item.product_id].stock_qty - item.quantity;
            await supabaseAdmin
                .from('products')
                .update({ stock_qty: newStock })
                .eq('id', item.product_id);
        }

        // Clear the cart
        const sessionId = req.headers['x-session-id'];
        if (userId) {
            const { data: cart } = await supabaseAdmin
                .from('carts').select('id').eq('user_id', userId).single();
            if (cart) {
                await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);
            }
        } else if (sessionId) {
            const { data: cart } = await supabaseAdmin
                .from('carts').select('id').eq('session_id', sessionId).single();
            if (cart) {
                await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);
            }
        }

        // Notify admin of new order
        const notifTitle = `New Order: ${order.order_number}`;
        const notifMsg = `${order.customer_first_name} ${order.customer_last_name} placed an order for ${order.currency} ${order.total_amount.toLocaleString()}`;
        const { data: notif } = await supabaseAdmin
            .from('notifications')
            .insert({ user_id: null, type: 'new_order', title: notifTitle, message: notifMsg, order_id: order.id })
            .select('id, type, title, message, order_id, is_read, created_at')
            .single();
        if (notif) sendToAdmins(notif);

        return res.status(201).json({
            message: 'Order placed successfully',
            order: {
                id: order.id,
                order_number: order.order_number,
                status: order.status,
                total_amount: order.total_amount,
                currency: order.currency,
                created_at: order.created_at
            }
        });

    } catch (err) {
        console.error('Checkout error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
