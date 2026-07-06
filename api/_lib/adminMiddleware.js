const { authMiddleware } = require('./authMiddleware');

async function adminMiddleware(req, res) {
    const user = await authMiddleware(req, res);
    if (!user) return null;

    if (user.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
        return null;
    }

    return user;
}

module.exports = { adminMiddleware };
