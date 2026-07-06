const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { validateRegister, sanitizeString } = require('../_lib/validators');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = req.body || {};
    const errors = validateRegister(body);
    if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const firstName = sanitizeString(body.first_name, 100);
    const lastName  = sanitizeString(body.last_name, 100);
    const email     = body.email.toLowerCase().trim();
    const password  = body.password;

    try {
        // Check if email already exists
        const { data: existing } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        // Create Supabase Auth user (bcrypt hashing handled by Supabase)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

        if (authError) {
            return res.status(400).json({ error: authError.message });
        }

        // Insert profile row linked to the auth user
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('users')
            .insert({
                auth_id:    authData.user.id,
                first_name: firstName,
                last_name:  lastName,
                email,
                role: 'customer'
            })
            .select('id, first_name, last_name, email, role')
            .single();

        if (profileError) {
            // Rollback auth user so the email is not orphaned
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.error('Profile insert error:', profileError);
            return res.status(500).json({ error: 'Failed to create user profile' });
        }

        return res.status(201).json({
            message: 'Account created successfully',
            user: profile
        });

    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
