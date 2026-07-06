const { supabasePublic, supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { validateLogin } = require('../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const errors = validateLogin(body);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const email = body.email.toLowerCase().trim();
    const password = body.password;

    try {
        // Sign in via Supabase Auth
        const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            // Return generic message to avoid exposing whether email exists
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Fetch profile from users table
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .select('id, first_name, last_name, email, role, is_active')
            .eq('auth_id', authData.user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({ error: 'User profile not found' });
        }

        if (!profile.is_active) {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });
        }

        return res.status(200).json({
            token: authData.session.access_token,
            user: {
                id: profile.id,
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email,
                role: profile.role
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
