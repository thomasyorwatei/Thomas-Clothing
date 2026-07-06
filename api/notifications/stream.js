const { supabaseAdmin } = require('../_lib/supabase');
const { handleCors } = require('../_lib/cors');
const { addClient, removeClient } = require('./sseClients');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    // Identify caller: admin or user
    const authHeader = req.headers.authorization;
    const tokenFromQuery = req.query.token;
    const rawToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : tokenFromQuery;

    if (!rawToken) return res.status(401).json({ error: 'Unauthorized' });

    const token = rawToken;
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile } = await supabaseAdmin
        .from('users').select('id, role').eq('auth_id', user.id).single();
    if (!profile) return res.status(401).json({ error: 'Unauthorized' });

    const clientKey = profile.role === 'admin' ? 'admin' : profile.id;

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    addClient(clientKey, res);

    // Heartbeat every 25 s to keep connection alive
    const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch (_) { clearInterval(heartbeat); }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        removeClient(clientKey, res);
    });
};
