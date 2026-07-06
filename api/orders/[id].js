const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { id } = req.query;

    try {
        // Support lookup by numeric ID or order number (e.g. RWT-abc-XYZ)
        let query = supabaseAdmin
            .from('orders')
            .select(`
                id, order_number, status, total_amount, subtotal,
                shipping_fee, tax_amount, currency, payment_method,
                customer_first_name, customer_last_name, customer_email, customer_phone,
                shipping_street, shipping_city, shipping_province, shipping_country,
                notes, created_at, updated_at,
                order_items (
                    id, product_name, product_image, size,
                    quantity, unit_price, line_total
                )
            `);

        if (isNaN(id)) {
            query = query.eq('order_number', id.toUpperCase());
        } else {
            query = query.eq('id', parseInt(id));
        }

        const { data: order, error } = await query.single();

        if (error || !order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // If request has a token, verify ownership
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { data: { user } } = await supabaseAdmin.auth.getUser(token);
            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('users').select('id, role').eq('auth_id', user.id).single();
                if (profile && profile.role !== 'admin' && order.user_id && order.user_id !== profile.id) {
                    return res.status(403).json({ error: 'Access denied' });
                }
            }
        }

        return res.status(200).json({ order });

    } catch (err) {
        console.error('Get order error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
