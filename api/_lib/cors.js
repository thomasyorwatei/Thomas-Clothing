const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:3000',
    'http://127.0.0.1:8080',
    process.env.FRONTEND_URL
].filter(Boolean);

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'production') {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-ID');
    res.setHeader('Access-Control-Max-Age', '86400');
}

function handleCors(req, res) {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    return false;
}

module.exports = { setCorsHeaders, handleCors };
