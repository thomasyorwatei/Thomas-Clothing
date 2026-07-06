const { handleCors } = require('../_lib/cors');
const { authMiddleware } = require('../_lib/authMiddleware');

module.exports = async function handler(req, res) {
    if (handleCors(req, res)) return;
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const user = await authMiddleware(req, res);
    if (!user) return;

    return res.status(200).json({ user });
};
