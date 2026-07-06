const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, new_password } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'A valid email address is required' });
    }

    // Step 1 — verify email exists (returns same message either way to avoid enumeration)
    if (!new_password) {
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email.toLowerCase().trim())
            .maybeSingle();

        return res.status(200).json({ exists: !!user });
    }

    // Step 2 — reset the password
    if (new_password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();

        // Look up the auth_id for this email
        const { data: profile } = await supabaseAdmin
            .from('users')
            .select('auth_id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!profile || !profile.auth_id) {
            return res.status(404).json({ error: 'No account found with that email' });
        }

        // Use service role to update password directly — no email/token needed
        const { error } = await supabaseAdmin.auth.admin.updateUserById(
            profile.auth_id,
            { password: new_password }
        );

        if (error) return res.status(400).json({ error: error.message });

        return res.status(200).json({ message: 'Password updated successfully' });

    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
