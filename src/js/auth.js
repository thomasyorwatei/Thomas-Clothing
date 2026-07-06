// Authentication state management

const Auth = {
    getUser() {
        try {
            const raw = localStorage.getItem(CONFIG.AUTH_USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    },

    getToken() {
        return localStorage.getItem(CONFIG.AUTH_TOKEN_KEY);
    },

    isLoggedIn() {
        return !!this.getToken() && !!this.getUser();
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    },

    async login(email, password) {
        const data = await API.post('/api/auth/login', { email, password });
        localStorage.setItem(CONFIG.AUTH_TOKEN_KEY, data.token);
        localStorage.setItem(CONFIG.AUTH_USER_KEY, JSON.stringify(data.user));
        return data.user;
    },

    async register(first_name, last_name, email, password) {
        const data = await API.post('/api/auth/register', { first_name, last_name, email, password });
        return data;
    },

    logout() {
        localStorage.removeItem(CONFIG.AUTH_TOKEN_KEY);
        localStorage.removeItem(CONFIG.AUTH_USER_KEY);
        window.location.href = '/account.html';
    },

    // Update the nav based on login state
    updateNav() {
        const user = this.getUser();
        const accountLink = document.querySelector('a[href*="account.html"]');
        const cartCountBadge = document.getElementById('cart-count');

        if (user && accountLink) {
            accountLink.textContent = user.first_name;
            accountLink.href = '/profile.html';
        }

        // Show admin link if admin
        if (this.isAdmin()) {
            const nav = document.querySelector('.nav-menu');
            if (nav && !document.getElementById('admin-nav-link')) {
                const li = document.createElement('li');
                li.className = 'nav-item';
                li.innerHTML = '<a href="/admin.html" id="admin-nav-link">Admin</a>';
                nav.appendChild(li);
            }
        }
    }
};

// Run nav update on every page load
document.addEventListener('DOMContentLoaded', () => {
    Auth.updateNav();
});
