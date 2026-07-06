const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');

async function getProfile(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return null;
    const { data: profile } = await supabaseAdmin
        .from('users').select('id, role').eq('auth_id', user.id).single();
    return profile || null;
}

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    const profile = await getProfile(req);
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    // GET — fetch notifications
    if (req.method === 'GET') {
        let query = supabaseAdmin
            .from('notifications')
            .select('id, type, title, message, order_id, is_read, created_at')
            .order('created_at', { ascending: false })
            .limit(30);

        // Admins see notifications where user_id IS NULL; users see their own
        if (profile.role === 'admin') {
            query = query.is('user_id', null);
        } else {
            query = query.eq('user_id', profile.id);
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: 'Failed to fetch notifications' });

        return res.status(200).json({ notifications: data });
    }

    // PATCH — mark as read
    if (req.method === 'PATCH') {
        const { id } = req.body || {};

        let query = supabaseAdmin
            .from('notifications')
            .update({ is_read: true });

        if (id) {
            query = query.eq('id', parseInt(id));
        } else {
            // Mark all read
            query = profile.role === 'admin'
                ? query.is('user_id', null)
                : query.eq('user_id', profile.id);
        }

        const { error } = await query;
        if (error) return res.status(500).json({ error: 'Failed to update notifications' });

        return res.status(200).json({ message: 'Marked as read' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
};
