const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');
const { sendToUser } = require('../notifications/sseClients');

const VALID_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    const url = req.url.split('?')[0].replace(/\/$/, '');

    if (url.endsWith('/dashboard')) return dashboard(req, res);
    if (url.endsWith('/orders'))    return orders(req, res);
    if (url.endsWith('/products'))  return adminProducts(req, res);
    if (url.endsWith('/users'))     return users(req, res);

    return res.status(404).json({ error: 'Not found' });
};

async function dashboard(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        const [ordersRes, usersRes, productsRes, revenueRes, recentOrdersRes] = await Promise.all([
            supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
            supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
            supabaseAdmin.from('orders').select('total_amount').in('status', ['confirmed','processing','shipped','delivered']),
            supabaseAdmin.from('orders').select('id, order_number, customer_first_name, customer_last_name, total_amount, status, created_at').order('created_at', { ascending: false }).limit(5)
        ]);

        const totalRevenue = (revenueRes.data || []).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
        const { data: statusData } = await supabaseAdmin.from('orders').select('status');
        const ordersByStatus = {};
        (statusData || []).forEach(o => { ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1; });

        return res.status(200).json({
            stats: { total_orders: ordersRes.count || 0, total_customers: usersRes.count || 0, total_products: productsRes.count || 0, total_revenue: Math.round(totalRevenue) },
            orders_by_status: ordersByStatus,
            recent_orders: recentOrdersRes.data || []
        });
    } catch (err) {
        console.error('Dashboard error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function orders(req, res) {
    if (req.method === 'GET') {
        const admin = await adminMiddleware(req, res);
        if (!admin) return;
        try {
            const { page = 1, limit = 20, status, search } = req.query;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            let query = supabaseAdmin.from('orders').select('id, order_number, status, total_amount, currency, customer_first_name, customer_last_name, customer_email, payment_method, created_at', { count: 'exact' });
            if (status) query = query.eq('status', status);
            if (search) query = query.or(`order_number.ilike.%${search}%,customer_email.ilike.%${search}%,customer_last_name.ilike.%${search}%`);
            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data: ordersList, error, count } = await query;
            if (error) return res.status(500).json({ error: 'Failed to fetch orders' });
            return res.status(200).json({ orders: ordersList, pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) } });
        } catch (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'PUT') {
        const admin = await adminMiddleware(req, res);
        if (!admin) return;
        const { id, status } = req.body || {};
        if (!id || !status || !VALID_STATUSES.includes(status)) return res.status(400).json({ error: `Valid order ID and status required.` });

        try {
            const { data, error } = await supabaseAdmin.from('orders').update({ status }).eq('id', parseInt(id)).select('id, order_number, status').single();
            if (error || !data) return res.status(404).json({ error: 'Order not found' });

            const { data: fullOrder } = await supabaseAdmin.from('orders').select('user_id, order_number').eq('id', parseInt(id)).single();
            if (fullOrder && fullOrder.user_id) {
                const { data: notif } = await supabaseAdmin.from('notifications')
                    .insert({ user_id: fullOrder.user_id, type: 'order_status', title: `Order ${fullOrder.order_number} Updated`, message: `Your order status has been updated to: ${status}`, order_id: parseInt(id) })
                    .select('id, type, title, message, order_id, is_read, created_at').single();
                if (notif) sendToUser(fullOrder.user_id, notif);
            }
            return res.status(200).json({ message: 'Order status updated', order: data });
        } catch (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

async function adminProducts(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        const { page = 1, limit = 20, search, category } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabaseAdmin.from('products').select('id, name, slug, price, stock_qty, image_url, is_active, is_featured, rating_avg, rating_count, created_at, categories ( id, name, slug )', { count: 'exact' });
        if (search) query = query.ilike('name', `%${search}%`);
        if (category) {
            const { data: cat } = await supabaseAdmin.from('categories').select('id').eq('slug', category).single();
            if (cat) query = query.eq('category_id', cat.id);
        }
        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: products, error, count } = await query;
        if (error) return res.status(500).json({ error: 'Failed to fetch products' });
        return res.status(200).json({ products, pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) } });
    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function users(req, res) {
    if (req.method === 'GET') {
        const admin = await adminMiddleware(req, res);
        if (!admin) return;
        try {
            const { page = 1, limit = 20, search } = req.query;
            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
            const from = (pageNum - 1) * limitNum;
            const to = from + limitNum - 1;

            let query = supabaseAdmin.from('users').select('id, first_name, last_name, email, phone, role, is_active, created_at', { count: 'exact' });
            if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
            query = query.order('created_at', { ascending: false }).range(from, to);

            const { data: usersList, error, count } = await query;
            if (error) return res.status(500).json({ error: 'Failed to fetch users' });
            return res.status(200).json({ users: usersList, pagination: { total: count, page: pageNum, limit: limitNum, totalPages: Math.ceil(count / limitNum) } });
        } catch (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    if (req.method === 'PUT') {
        const admin = await adminMiddleware(req, res);
        if (!admin) return;
        const { id, is_active } = req.body || {};
        if (!id || is_active === undefined) return res.status(400).json({ error: 'User ID and is_active status are required' });
        if (id === admin.id) return res.status(400).json({ error: 'You cannot deactivate your own account' });

        try {
            const { data, error } = await supabaseAdmin.from('users').update({ is_active: Boolean(is_active) }).eq('id', id).select('id, email, is_active').single();
            if (error || !data) return res.status(404).json({ error: 'User not found' });
            return res.status(200).json({ message: `User ${is_active ? 'activated' : 'deactivated'} successfully`, user: data });
        } catch (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
