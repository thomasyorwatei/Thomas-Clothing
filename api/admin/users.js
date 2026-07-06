const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { adminMiddleware } = require('../_lib/adminMiddleware');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    if (req.method === 'GET') return getAllUsers(req, res);
    if (req.method === 'PUT') return updateUserStatus(req, res);

    return res.status(405).json({ error: 'Method not allowed' });
};

async function getAllUsers(req, res) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    try {
        const { page = 1, limit = 20, search } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabaseAdmin
            .from('users')
            .select('id, first_name, last_name, email, phone, role, is_active, created_at', { count: 'exact' });

        if (search) {
            query = query.or(
                `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
            );
        }

        query = query.order('created_at', { ascending: false }).range(from, to);

        const { data: users, error, count } = await query;
        if (error) return res.status(500).json({ error: 'Failed to fetch users' });

        return res.status(200).json({
            users,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            }
        });

    } catch (err) {
        console.error('Admin users error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateUserStatus(req, res) {
    const admin = await adminMiddleware(req, res);
    if (!admin) return;

    const { id, is_active } = req.body || {};

    if (!id || is_active === undefined) {
        return res.status(400).json({ error: 'User ID and is_active status are required' });
    }

    // Prevent admin from deactivating themselves
    if (id === admin.id) {
        return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ is_active: Boolean(is_active) })
            .eq('id', id)
            .select('id, email, is_active')
            .single();

        if (error || !data) return res.status(404).json({ error: 'User not found' });

        return res.status(200).json({
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            user: data
        });

    } catch (err) {
        console.error('Update user status error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
