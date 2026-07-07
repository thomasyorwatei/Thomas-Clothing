const { supabasePublic, supabaseAdmin } = require('../_lib/supabase');
const { createClient } = require('@supabase/supabase-js');
const { handleCors } = require('../_lib/cors');
const { authMiddleware } = require('../_lib/authMiddleware');
const { validateLogin, validateRegister, sanitizeString } = require('../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;

    const url = req.url.split('?')[0].replace(/\/$/, '');

    if (url.endsWith('/login'))           return login(req, res);
    if (url.endsWith('/register'))        return register(req, res);
    if (url.endsWith('/me'))              return me(req, res);
    if (url.endsWith('/forgot-password')) return forgotPassword(req, res);
    if (url.endsWith('/reset-password'))  return resetPassword(req, res);

    return res.status(404).json({ error: 'Not found' });
};

async function login(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    const errors = validateLogin(body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const email = body.email.toLowerCase().trim();
    try {
        const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({ email, password: body.password });
        if (authError) return res.status(401).json({ error: 'Invalid email or password' });

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users').select('id, first_name, last_name, email, role, is_active')
            .eq('auth_id', authData.user.id).single();

        if (profileError || !profile) return res.status(401).json({ error: 'User profile not found' });
        if (!profile.is_active) return res.status(403).json({ error: 'Your account has been deactivated. Please contact support.' });

        return res.status(200).json({
            token: authData.session.access_token,
            user: { id: profile.id, first_name: profile.first_name, last_name: profile.last_name, email: profile.email, role: profile.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function register(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    const errors = validateRegister(body);
    if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

    const firstName = sanitizeString(body.first_name, 100);
    const lastName  = sanitizeString(body.last_name, 100);
    const email     = body.email.toLowerCase().trim();

    try {
        const { data: existing } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
        if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ email, password: body.password, email_confirm: true });
        if (authError) return res.status(400).json({ error: authError.message });

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users').insert({ auth_id: authData.user.id, first_name: firstName, last_name: lastName, email, role: 'customer' })
            .select('id, first_name, last_name, email, role').single();

        if (profileError) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return res.status(500).json({ error: 'Failed to create user profile' });
        }

        return res.status(201).json({ message: 'Account created successfully', user: profile });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function me(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const user = await authMiddleware(req, res);
    if (!user) return;
    return res.status(200).json({ user });
}

async function forgotPassword(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { email, new_password } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'A valid email address is required' });

    if (!new_password) {
        const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
        return res.status(200).json({ exists: !!user });
    }

    if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const { data: profile } = await supabaseAdmin.from('users').select('auth_id').eq('email', normalizedEmail).maybeSingle();
        if (!profile || !profile.auth_id) return res.status(404).json({ error: 'No account found with that email' });

        const { error } = await supabaseAdmin.auth.admin.updateUserById(profile.auth_id, { password: new_password });
        if (error) return res.status(400).json({ error: error.message });

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Forgot password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function resetPassword(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { access_token, new_password } = req.body || {};
    if (!access_token) return res.status(400).json({ error: 'Reset token is required' });
    if (!new_password || new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    try {
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(access_token);
        if (userError || !user) return res.status(401).json({ error: 'Invalid or expired reset link. Please request a new one.' });

        const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: `Bearer ${access_token}` } }
        });

        const { error: updateError } = await userClient.auth.updateUser({ password: new_password });
        if (updateError) return res.status(400).json({ error: updateError.message });

        return res.status(200).json({ message: 'Password updated successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
