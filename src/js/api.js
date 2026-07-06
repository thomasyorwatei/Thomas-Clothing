// Central API client — all fetch calls go through here

function getSessionId() {
    let id = localStorage.getItem(CONFIG.CART_SESSION_KEY);
    if (!id) {
        id = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem(CONFIG.CART_SESSION_KEY, id);
    }
    return id;
}

function getToken() {
    return localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
}

async function apiRequest(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId()
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
    });

    const contentType = response.headers.get('content-type');
    const data = contentType && contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

    if (!response.ok) {
        const error = new Error(data.error || data.message || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

const API = {
    get: (path) => apiRequest(path, { method: 'GET' }),
    post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path) => apiRequest(path, { method: 'DELETE' })
};
