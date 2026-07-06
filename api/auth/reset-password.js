const { supabaseAdmin } = require('../_lib/supabase');
const { createClient } = require('@supabase/supabase-js');
const { handleCors } = require('../_lib/cors');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { access_token, new_password } = req.body || {};

    if (!access_token) return res.status(400).json({ error: 'Reset token is required' });
    if (!new_password || new_password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    try {
        // Verify the token belongs to a real user
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token);
        if (userError || !user) {
            return res.status(401).json({ error: 'Invalid or expired reset link. Please request a new one.' });
        }

        // Update the password using a client scoped to this user's token
        const userClient = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            { global: { headers: { Authorization: `Bearer ${access_token}` } } }
        );

        const { error: updateError } = await userClient.auth.updateUser({ password: new_password });
        if (updateError) {
            return res.status(400).json({ error: updateError.message });
        }

        return res.status(200).json({ message: 'Password updated successfully. You can now log in.' });

    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
