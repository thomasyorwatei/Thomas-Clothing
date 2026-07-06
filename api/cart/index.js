const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');

// Helper: get or create cart by session_id or user_id
async function getOrCreateCart(userId, sessionId) {
    if (!userId && !sessionId) return { cart: null, error: 'No session or user ID' };

    let query = supabaseAdmin.from('carts').select('id');
    if (userId) {
        query = query.eq('user_id', userId);
    } else {
        query = query.eq('session_id', sessionId);
    }

    let { data: cart, error } = await query.single();

    if (!cart) {
        const insertData = userId
            ? { user_id: userId }
            : { session_id: sessionId };

        const { data: newCart, error: createError } = await supabaseAdmin
            .from('carts')
            .insert(insertData)
            .select('id')
            .single();

        if (createError) return { cart: null, error: createError.message };
        cart = newCart;
    }

    return { cart, error: null };
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (req.method === 'GET') return getCart(req, res);
    if (req.method === 'DELETE') return clearCart(req, res);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function getCart(req, res) {
    try {
        const sessionId = req.headers['x-session-id'];
        const authHeader = req.headers.authorization;

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('auth_id', user.id)
                    .single();
                if (profile) userId = profile.id;
            }
        }

        const { cart, error: cartError } = await getOrCreateCart(userId, sessionId);
        if (cartError || !cart) {
            return res.status(200).json({ cart: { items: [], subtotal: 0, total: 0 } });
        }

        const { data: items, error } = await supabaseAdmin
            .from('cart_items')
            .select(`
                id, quantity, size,
                products ( id, name, slug, price, image_url, stock_qty, sizes )
            `)
            .eq('cart_id', cart.id);

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch cart' });
        }

        const TAX_RATE = 0.18;
        const SHIPPING_KIGALI = 2000;

        const subtotal = items.reduce((sum, item) => {
            return sum + (item.products.price * item.quantity);
        }, 0);

        const tax = Math.round(subtotal * TAX_RATE);
        const shipping = items.length > 0 ? SHIPPING_KIGALI : 0;
        const total = subtotal + tax + shipping;

        return res.status(200).json({
            cart: {
                id: cart.id,
                items,
                subtotal,
                tax,
                shipping,
                total,
                item_count: items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });

    } catch (err) {
        console.error('Get cart error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function clearCart(req, res) {
    try {
        const sessionId = req.headers['x-session-id'];
        const authHeader = req.headers.authorization;

        let userId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('users').select('id').eq('auth_id', user.id).single();
                if (profile) userId = profile.id;
            }
        }

        const { cart } = await getOrCreateCart(userId, sessionId);
        if (!cart) return res.status(200).json({ message: 'Cart already empty' });

        await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);

        return res.status(200).json({ message: 'Cart cleared' });

    } catch (err) {
        console.error('Clear cart error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports.getOrCreateCart = getOrCreateCart;
