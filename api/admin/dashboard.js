const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        const [ordersRes, usersRes, productsRes, revenueRes, recentOrdersRes] = await Promise.all([
            // Total orders count
            supabaseAdmin.from('orders').select('id', { count: 'exact', head: true }),

            // Total customers count
            supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('role', 'customer'),

            // Total active products count
            supabaseAdmin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),

            // Total revenue from completed/delivered orders
            supabaseAdmin.from('orders')
                .select('total_amount')
                .in('status', ['confirmed', 'processing', 'shipped', 'delivered']),

            // 5 most recent orders
            supabaseAdmin.from('orders')
                .select('id, order_number, customer_first_name, customer_last_name, total_amount, status, created_at')
                .order('created_at', { ascending: false })
                .limit(5)
        ]);

        const totalRevenue = (revenueRes.data || []).reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

        // Orders by status
        const { data: statusData } = await supabaseAdmin
            .from('orders')
            .select('status');

        const ordersByStatus = {};
        (statusData || []).forEach(o => {
            ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1;
        });

        return res.status(200).json({
            stats: {
                total_orders: ordersRes.count || 0,
                total_customers: usersRes.count || 0,
                total_products: productsRes.count || 0,
                total_revenue: Math.round(totalRevenue)
            },
            orders_by_status: ordersByStatus,
            recent_orders: recentOrdersRes.data || []
        });

    } catch (err) {
        console.error('Dashboard error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
