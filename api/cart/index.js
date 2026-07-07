const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { isPositiveInteger } = require('../_lib/validators');

const TAX_RATE = 0.18;
const SHIPPING_KIGALI = 2000;

async function getOrCreateCart(userId, sessionId) {
    if (!userId && !sessionId) return { cart: null, error: 'No session or user ID' };
    let query = supabaseAdmin.from('carts').select('id');
    if (userId) { query = query.eq('user_id', userId); } else { query = query.eq('session_id', sessionId); }
    let { data: cart } = await query.single();
    if (!cart) {
        const insertData = userId ? { user_id: userId } : { session_id: sessionId };
        const { data: newCart, error } = await supabaseAdmin.from('carts').insert(insertData).select('id').single();
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
    const { data: profile } = await supabaseAdmin.from('users').select('id').eq('auth_id', user.id).single();
    return profile ? profile.id : null;
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    const url = req.url.split('?')[0].replace(/\/$/, '');
    const itemsMatch = url.match(/\/cart\/items\/([^/]+)$/);
    const isItems = url.endsWith('/cart/items');

    // /api/cart/items/:itemId — PUT or DELETE
    if (itemsMatch) {
        const itemId = itemsMatch[1];
        if (req.method === 'PUT') return updateCartItem(req, res, itemId);
        if (req.method === 'DELETE') return removeCartItem(req, res, itemId);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // /api/cart/items — POST
    if (isItems) {
        if (req.method === 'POST') return addCartItem(req, res);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // /api/cart — GET or DELETE
    if (req.method === 'GET') return getCart(req, res);
    if (req.method === 'DELETE') return clearCart(req, res);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function getCart(req, res) {
    try {
        const sessionId = req.headers['x-session-id'];
        const userId = await getUserFromRequest(req);
        const { cart, error: cartError } = await getOrCreateCart(userId, sessionId);
        if (cartError || !cart) return res.status(200).json({ cart: { items: [], subtotal: 0, total: 0 } });

        const { data: items, error } = await supabaseAdmin.from('cart_items')
            .select('id, quantity, size, products ( id, name, slug, price, image_url, stock_qty, sizes )')
            .eq('cart_id', cart.id);

        if (error) return res.status(500).json({ error: 'Failed to fetch cart' });

        const subtotal = items.reduce((sum, item) => sum + (item.products.price * item.quantity), 0);
        const tax = Math.round(subtotal * TAX_RATE);
        const shipping = items.length > 0 ? SHIPPING_KIGALI : 0;

        return res.status(200).json({ cart: { id: cart.id, items, subtotal, tax, shipping, total: subtotal + tax + shipping, item_count: items.reduce((sum, item) => sum + item.quantity, 0) } });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function clearCart(req, res) {
    try {
        const sessionId = req.headers['x-session-id'];
        const userId = await getUserFromRequest(req);
        const { cart } = await getOrCreateCart(userId, sessionId);
        if (!cart) return res.status(200).json({ message: 'Cart already empty' });
        await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);
        return res.status(200).json({ message: 'Cart cleared' });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function addCartItem(req, res) {
    const body = req.body || {};
    const { product_id, quantity = 1, size } = body;
    if (!product_id || !isPositiveInteger(product_id)) return res.status(400).json({ error: 'Valid product_id is required' });
    if (!isPositiveInteger(quantity)) return res.status(400).json({ error: 'Quantity must be a positive integer' });

    try {
        const sessionId = req.headers['x-session-id'];
        const userId = await getUserFromRequest(req);
        const { cart, error: cartError } = await getOrCreateCart(userId, sessionId);
        if (cartError || !cart) return res.status(400).json({ error: 'Could not create cart. Provide X-Session-ID header or login.' });

        const { data: product, error: productError } = await supabaseAdmin.from('products').select('id, name, price, stock_qty, is_active').eq('id', parseInt(product_id)).single();
        if (productError || !product || !product.is_active) return res.status(404).json({ error: 'Product not found' });
        if (product.stock_qty < parseInt(quantity)) return res.status(400).json({ error: `Only ${product.stock_qty} items in stock` });

        const { data: existingItem } = await supabaseAdmin.from('cart_items').select('id, quantity').eq('cart_id', cart.id).eq('product_id', parseInt(product_id)).eq('size', size || null).single();

        let cartItem;
        if (existingItem) {
            const newQty = existingItem.quantity + parseInt(quantity);
            if (product.stock_qty < newQty) return res.status(400).json({ error: `Cannot add ${quantity} more. Only ${product.stock_qty} in stock.` });
            const { data, error } = await supabaseAdmin.from('cart_items').update({ quantity: newQty }).eq('id', existingItem.id).select().single();
            if (error) return res.status(500).json({ error: 'Failed to update cart' });
            cartItem = data;
        } else {
            const { data, error } = await supabaseAdmin.from('cart_items').insert({ cart_id: cart.id, product_id: parseInt(product_id), quantity: parseInt(quantity), size: size || null }).select().single();
            if (error) return res.status(500).json({ error: 'Failed to add item to cart' });
            cartItem = data;
        }

        return res.status(201).json({ message: 'Item added to cart', item: cartItem });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateCartItem(req, res, itemId) {
    const { quantity } = req.body || {};
    if (!quantity || !isPositiveInteger(quantity)) return res.status(400).json({ error: 'Quantity must be a positive integer' });

    try {
        const { data: item, error: itemError } = await supabaseAdmin.from('cart_items').select('id, product_id').eq('id', parseInt(itemId)).single();
        if (itemError || !item) return res.status(404).json({ error: 'Cart item not found' });

        const { data: product } = await supabaseAdmin.from('products').select('stock_qty').eq('id', item.product_id).single();
        if (product && product.stock_qty < parseInt(quantity)) return res.status(400).json({ error: `Only ${product.stock_qty} items in stock` });

        const { data, error } = await supabaseAdmin.from('cart_items').update({ quantity: parseInt(quantity) }).eq('id', parseInt(itemId)).select().single();
        if (error) return res.status(500).json({ error: 'Failed to update item' });
        return res.status(200).json({ message: 'Quantity updated', item: data });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function removeCartItem(req, res, itemId) {
    try {
        const { error } = await supabaseAdmin.from('cart_items').delete().eq('id', parseInt(itemId));
        if (error) return res.status(500).json({ error: 'Failed to remove item' });
        return res.status(200).json({ message: 'Item removed from cart' });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports.getOrCreateCart = getOrCreateCart;
