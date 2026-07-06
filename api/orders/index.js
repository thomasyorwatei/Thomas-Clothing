const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { authMiddleware } = require('../_lib/authMiddleware');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await authMiddleware(req, res);
    if (!user) return;

    try {
        const { data: orders, error } = await supabaseAdmin
            .from('orders')
            .select(`
                id, order_number, status, total_amount, currency,
                payment_method, created_at,
                order_items ( id, product_name, product_image, quantity, unit_price, size, line_total )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch orders' });
        }

        return res.status(200).json({ orders });

    } catch (err) {
        console.error('Orders error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
