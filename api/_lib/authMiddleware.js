const { supabaseAdmin } = require('./supabase');

async function authMiddleware(req, res) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return null;
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token using Supabase — this checks signature and expiry
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !user) {
            res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
            return null;
        }

        // Fetch profile from our users table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('id, first_name, last_name, email, role, is_active')
            .eq('auth_id', user.id)
            .single();

        if (profileError || !profile) {
            res.status(401).json({ error: 'Unauthorized: User profile not found' });
            return null;
        }

        if (!profile.is_active) {
            res.status(403).json({ error: 'Forbidden: Account is deactivated' });
            return null;
        }

        return profile;
    } catch (err) {
        res.status(401).json({ error: 'Unauthorized: Token verification failed' });
        return null;
    }
}

module.exports = { authMiddleware };
