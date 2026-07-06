// Real-Time Notifications — shared bell logic for admin & user pages

const Notifications = (() => {
    let unreadCount = 0;
    let eventSource = null;

    function getBellEl()   { return document.getElementById('notif-bell'); }
    function getBadgeEl()  { return document.getElementById('notif-badge'); }
    function getDropEl()   { return document.getElementById('notif-dropdown'); }

    function updateBadge() {
        const badge = getBadgeEl();
        if (!badge) return;
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
    }

    function prependItem(n) {
        const drop = getDropEl();
        if (!drop) return;
        const empty = drop.querySelector('.notif-empty');
        if (empty) empty.remove();

        const item = document.createElement('div');
        item.className = 'notif-item' + (n.is_read ? '' : ' notif-unread');
        item.dataset.id = n.id;
        item.innerHTML = `
            <strong>${n.title}</strong>
            <p>${n.message}</p>
            <small>${new Date(n.created_at).toLocaleString()}</small>
        `;
        item.addEventListener('click', () => markRead(n.id, item));
        drop.insertBefore(item, drop.firstChild);
    }

    async function markRead(id, el) {
        try {
            await API.patch('/api/notifications', id ? { id } : {});
            if (el) el.classList.remove('notif-unread');
            if (id && unreadCount > 0) { unreadCount--; updateBadge(); }
        } catch (_) {}
    }

    async function loadInitial() {
        try {
            const { notifications } = await API.get('/api/notifications');
            const drop = getDropEl();
            if (!drop) return;
            drop.innerHTML = '';
            if (!notifications.length) {
                drop.innerHTML = '<div class="notif-empty">No notifications</div>';
                return;
            }
            notifications.forEach(n => {
                if (!n.is_read) unreadCount++;
                prependItem(n);
            });
            updateBadge();
        } catch (_) {}
    }

    function connectSSE() {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        eventSource = new EventSource(`/api/notifications/stream`, {
            // EventSource doesn't support custom headers natively;
            // we pass token as query param handled server-side
        });

        // Reconnect with token via URL since EventSource can't set headers
        eventSource.close();
        // Use fetch-based polyfill approach: re-open with token in URL
        const url = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
        eventSource = new EventSource(url);

        eventSource.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'connected') return;
            unreadCount++;
            updateBadge();
            prependItem({ ...data, is_read: false });
            showToast(data.title, data.message);
        };

        eventSource.onerror = () => {
            eventSource.close();
            setTimeout(connectSSE, 5000); // reconnect after 5 s
        };
    }

    function showToast(title, message) {
        const toast = document.createElement('div');
        toast.className = 'notif-toast';
        toast.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('notif-toast-show'), 10);
        setTimeout(() => { toast.classList.remove('notif-toast-show'); setTimeout(() => toast.remove(), 400); }, 4000);
    }

    function init() {
        const bell = getBellEl();
        const drop = getDropEl();
        if (!bell || !drop) return;

        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = drop.style.display === 'block';
            drop.style.display = open ? 'none' : 'block';
            if (!open) {
                // Mark all read when opening
                markRead(null, null);
                unreadCount = 0;
                updateBadge();
                document.querySelectorAll('.notif-unread').forEach(el => el.classList.remove('notif-unread'));
            }
        });

        document.addEventListener('click', () => { drop.style.display = 'none'; });
        drop.addEventListener('click', e => e.stopPropagation());

        loadInitial();
        connectSSE();
    }

    return { init };
})();
