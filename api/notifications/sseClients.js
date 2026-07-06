// In-memory SSE client registry
// Key: userId (UUID string) or 'admin'
// Value: Set of response objects
const clients = new Map();

function addClient(key, res) {
    if (!clients.has(key)) clients.set(key, new Set());
    clients.get(key).add(res);
}

function removeClient(key, res) {
    const set = clients.get(key);
    if (set) { set.delete(res); if (!set.size) clients.delete(key); }
}

function send(key, data) {
    const set = clients.get(key);
    if (!set) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    set.forEach(res => { try { res.write(payload); } catch (_) {} });
}

// Broadcast to all connected admin clients
function sendToAdmins(data) { send('admin', data); }

// Send to a specific user
function sendToUser(userId, data) { send(userId, data); }

module.exports = { addClient, removeClient, sendToAdmins, sendToUser };
