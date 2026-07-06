const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');
const { sendToUser } = require('../notifications/sseClients');

const VALID_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (req.method === 'GET') return getAllOrders(req, res);
    if (req.method === 'PUT') return updateOrderStatus(req, res);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function getAllOrders(req, res) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabaseAdmin
            .from('orders')
            .select(`
                id, order_number, status, total_amount, currency,
                customer_first_name, customer_last_name, customer_email,
                payment_method, created_at
            `, { count: 'exact' });

        if (status) query = query.eq('status', status);
        if (search) {
            query = query.or(
                `order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_last_name.ilike.%${search}%`
            );
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: orders, error, count } = await query;
        if (error) return res.status(500).json({ error: 'Failed to fetch orders' });

        return res.status(200).json({
            orders,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            }
        });

    } catch (err) {
        console.error('Admin orders error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateOrderStatus(req, res) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    const { id, status } = req.body || {};

    if (!id || !status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Valid order ID and status required. Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('orders')
            .update({ status })
            .eq('id', parseInt(id))
            .select('id, order_number, status')
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Notify the order owner if they have an account
        const { data: fullOrder } = await supabaseAdmin
            .from('orders').select('user_id, order_number').eq('id', parseInt(id)).single();
        if (fullOrder && fullOrder.user_id) {
            const notifTitle = `Order ${fullOrder.order_number} Updated`;
            const notifMsg = `Your order status has been updated to: ${status}`;
            const { data: notif } = await supabaseAdmin
                .from('notifications')
                .insert({ user_id: fullOrder.user_id, type: 'order_status', title: notifTitle, message: notifMsg, order_id: parseInt(id) })
                .select('id, type, title, message, order_id, is_read, created_at')
                .single();
            if (notif) sendToUser(fullOrder.user_id, notif);
        }

        return res.status(200).json({ message: 'Order status updated', order: data });

    } catch (err) {
        console.error('Update order status error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
