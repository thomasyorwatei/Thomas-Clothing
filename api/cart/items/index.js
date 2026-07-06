const { supabaseAdmin } = require('../../_lib/supabase');
const { handleCors } = require('../../_lib/cors');
const { isPositiveInteger } = require('../../_lib/validators');

async function getOrCreateCart(userId, sessionId) {
    if (!userId && !sessionId) return { cart: null, error: 'No identifier' };

    let query = supabaseAdmin.from('carts').select('id');
    if (userId) {
        query = query.eq('user_id', userId);
    } else {
        query = query.eq('session_id', sessionId);
    }

    let { data: cart } = await query.single();

    if (!cart) {
        const insertData = userId ? { user_id: userId } : { session_id: sessionId };
        const { data: newCart, error } = await supabaseAdmin
            .from('carts').insert(insertData).select('id').single();
        if (error) return { cart: null, error: error.message };
        cart = newCart;
    }

    return { cart, error: null };
}

async function getUserFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin
        .from('users').select('id').eq('auth_id', user.id).single();
    return profile ? profile.id : null;
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const { product_id, quantity = 1, size } = body;

    if (!product_id || !isPositiveInteger(product_id)) {
        return res.status(400).json({ error: 'Valid product_id is required' });
    }
    if (!isPositiveInteger(quantity)) {
        return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    try {
        const sessionId = req.headers['x-session-id'];
        const userId = await getUserFromRequest(req);

        const { cart, error: cartError } = await getOrCreateCart(userId, sessionId);
        if (cartError || !cart) {
            return res.status(400).json({ error: 'Could not create cart. Provide X-Session-ID header or login.' });
        }

        // Verify product exists and has stock
        const { data: product, error: productError } = await supabaseAdmin
            .from('products')
            .select('id, name, price, stock_qty, is_active')
            .eq('id', parseInt(product_id))
            .single();

        if (productError || !product || !product.is_active) {
            return res.status(404).json({ error: 'Product not found' });
        }
        if (product.stock_qty < parseInt(quantity)) {
            return res.status(400).json({ error: `Only ${product.stock_qty} items in stock` });
        }

        // Upsert — if same product+size already in cart, increase quantity
        const { data: existingItem } = await supabaseAdmin
            .from('cart_items')
            .select('id, quantity')
            .eq('cart_id', cart.id)
            .eq('product_id', parseInt(product_id))
            .eq('size', size || null)
            .single();

        let cartItem;
        if (existingItem) {
            const newQty = existingItem.quantity + parseInt(quantity);
            if (product.stock_qty < newQty) {
                return res.status(400).json({ error: `Cannot add ${quantity} more. Only ${product.stock_qty} in stock.` });
            }
            const { data, error } = await supabaseAdmin
                .from('cart_items')
                .update({ quantity: newQty })
                .eq('id', existingItem.id)
                .select()
                .single();
            if (error) return res.status(500).json({ error: 'Failed to update cart' });
            cartItem = data;
        } else {
            const { data, error } = await supabaseAdmin
                .from('cart_items')
                .insert({
                    cart_id: cart.id,
                    product_id: parseInt(product_id),
                    quantity: parseInt(quantity),
                    size: size || null
                })
                .select()
                .single();
            if (error) return res.status(500).json({ error: 'Failed to add item to cart' });
            cartItem = data;
        }

        return res.status(201).json({ message: 'Item added to cart', item: cartItem });

    } catch (err) {
        console.error('Add to cart error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
