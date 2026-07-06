// Admin Dashboard logic

function formatPrice(amount) {
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-RW', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

// ─────────────────────────────────────────────
// GUARD: redirect non-admins
// ─────────────────────────────────────────────
function guardAdmin() {
    if (!Auth.isLoggedIn()) {
        window.location.href = '/account.html?redirect=admin';
        return false;
    }
    if (!Auth.isAdmin()) {
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
async function loadDashboard() {
    try {
        const data = await API.get('/api/admin/dashboard');
        const { stats, orders_by_status, recent_orders } = data;

        document.getElementById('stat-orders').textContent = stats.total_orders.toLocaleString();
        document.getElementById('stat-customers').textContent = stats.total_customers.toLocaleString();
        document.getElementById('stat-products').textContent = stats.total_products.toLocaleString();
        document.getElementById('stat-revenue').textContent = formatPrice(stats.total_revenue);

        // Recent orders table
        const tbody = document.getElementById('recent-orders-body');
        if (tbody) {
            tbody.innerHTML = recent_orders.map(o => `
                <tr>
                    <td>${o.order_number}</td>
                    <td>${o.customer_first_name} ${o.customer_last_name}</td>
                    <td>${formatPrice(o.total_amount)}</td>
                    <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                    <td>${formatDate(o.created_at)}</td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Dashboard load error:', err);
        alert('Failed to load dashboard data');
    }
}

// ─────────────────────────────────────────────
// ORDERS MANAGEMENT
// ─────────────────────────────────────────────
async function loadAdminOrders(page = 1, search = '', status = '') {
    const tbody = document.getElementById('admin-orders-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading...</td></tr>';

    try {
        let url = `/api/admin/orders?page=${page}&limit=20`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status) url += `&status=${status}`;

        const data = await API.get(url);

        tbody.innerHTML = data.orders.map(o => `
            <tr>
                <td>${o.order_number}</td>
                <td>${o.customer_first_name} ${o.customer_last_name}</td>
                <td>${o.customer_email}</td>
                <td>${formatPrice(o.total_amount)}</td>
                <td>
                    <select class="status-select" data-order-id="${o.id}" data-current="${o.status}">
                        ${['pending','confirmed','processing','shipped','delivered','cancelled','refunded']
                            .map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </td>
                <td>${o.payment_method.replace('_', ' ')}</td>
                <td>${formatDate(o.created_at)}</td>
            </tr>
        `).join('');

        // Status change handlers
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async () => {
                const orderId = select.dataset.orderId;
                const newStatus = select.value;
                try {
                    await API.put('/api/admin/orders', { id: parseInt(orderId), status: newStatus });
                } catch (err) {
                    alert('Failed to update status: ' + err.message);
                    select.value = select.dataset.current;
                }
            });
        });

        renderAdminPagination('orders-pagination', data.pagination, (p) => loadAdminOrders(p, search, status));

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:salmon;text-align:center">${err.message}</td></tr>`;
    }
}

// ─────────────────────────────────────────────
// PRODUCTS MANAGEMENT
// ─────────────────────────────────────────────
async function loadAdminProducts(page = 1, search = '') {
    const tbody = document.getElementById('admin-products-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading...</td></tr>';

    try {
        let url = `/api/admin/products?page=${page}&limit=20`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const data = await API.get(url);

        tbody.innerHTML = data.products.map(p => `
            <tr>
                <td><img src="${p.image_url || ''}" style="width:50px;border-radius:4px" alt="${p.name}"></td>
                <td>${p.name}</td>
                <td>${p.categories ? p.categories.name : '—'}</td>
                <td>${formatPrice(p.price)}</td>
                <td>${p.stock_qty}</td>
                <td>
                    <span class="${p.is_active ? 'badge-active' : 'badge-inactive'}">${p.is_active ? 'Active' : 'Inactive'}</span>
                    <button class="btn-sm toggle-product-btn" data-id="${p.id}" data-active="${p.is_active}">
                        ${p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="btn-sm edit-product-btn" style="background:#3a6ea5"
                        data-id="${p.id}"
                        data-name="${encodeURIComponent(p.name)}"
                        data-category="${p.categories ? p.categories.id : ''}"
                        data-price="${p.price}"
                        data-stock="${p.stock_qty}"
                        data-image="${encodeURIComponent(p.image_url || '')}"
                        data-description="${encodeURIComponent(p.description || '')}"
                        data-featured="${p.is_featured}">
                        Edit
                    </button>
                    <button class="btn-sm delete-product-btn" style="background:#7a2020" data-id="${p.id}" data-name="${encodeURIComponent(p.name)}">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.toggle-product-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const isActive = btn.dataset.active === 'true';
                try {
                    await API.put(`/api/products/${id}`, { is_active: !isActive });
                    loadAdminProducts(page, search);
                } catch (err) {
                    alert('Failed to update product: ' + err.message);
                }
            });
        });

        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', () => openProductModal({
                id: btn.dataset.id,
                name: decodeURIComponent(btn.dataset.name),
                category_id: btn.dataset.category,
                price: btn.dataset.price,
                stock_qty: btn.dataset.stock,
                image_url: decodeURIComponent(btn.dataset.image),
                description: decodeURIComponent(btn.dataset.description),
                is_featured: btn.dataset.featured === 'true'
            }));
        });

        document.querySelectorAll('.delete-product-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const name = decodeURIComponent(btn.dataset.name);
                if (!confirm(`Delete "${name}"? This will deactivate the product.`)) return;
                try {
                    await API.delete(`/api/products/${btn.dataset.id}`);
                    loadAdminProducts(page, search);
                } catch (err) {
                    alert('Failed to delete product: ' + err.message);
                }
            });
        });

        renderAdminPagination('products-pagination', data.pagination, (p) => loadAdminProducts(p, search));

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:salmon;text-align:center">${err.message}</td></tr>`;
    }
}

// ─────────────────────────────────────────────
// PRODUCT MODAL (Create / Edit)
// ─────────────────────────────────────────────
let _categories = [];

async function loadCategories() {
    if (_categories.length) return _categories;
    const data = await API.get('/api/categories');
    _categories = data.categories;
    return _categories;
}

function updateImagePreview(url) {
    const preview = document.getElementById('pf-image-preview');
    const img = document.getElementById('pf-image-preview-img');
    if (url && url.startsWith('http')) {
        img.src = url;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
}

async function openProductModal(product = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('product-modal-title');
    const errBox = document.getElementById('product-form-error');

    errBox.style.display = 'none';
    title.textContent = product ? 'Edit Product' : 'Add Product';

    // Populate category dropdown
    const cats = await loadCategories();
    const catSelect = document.getElementById('pf-category');
    catSelect.innerHTML = cats.map(c =>
        `<option value="${c.id}" ${product && product.category_id == c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    document.getElementById('pf-id').value = product ? product.id : '';
    document.getElementById('pf-name').value = product ? product.name : '';
    document.getElementById('pf-price').value = product ? product.price : '';
    document.getElementById('pf-stock').value = product ? product.stock_qty : '';
    document.getElementById('pf-image').value = product ? product.image_url : '';
    updateImagePreview(product ? product.image_url : '');
    document.getElementById('pf-description').value = product ? product.description : '';
    document.getElementById('pf-featured').checked = product ? product.is_featured : false;

    modal.style.display = 'block';
}

function initProductModal() {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const errBox = document.getElementById('product-form-error');

    document.getElementById('add-product-btn').addEventListener('click', () => openProductModal());
    document.getElementById('product-modal-cancel').addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBox.style.display = 'none';

        const id = document.getElementById('pf-id').value;
        const payload = {
            name: document.getElementById('pf-name').value.trim(),
            category_id: parseInt(document.getElementById('pf-category').value),
            price: parseFloat(document.getElementById('pf-price').value),
            stock_qty: parseInt(document.getElementById('pf-stock').value),
            image_url: document.getElementById('pf-image').value.trim(),
            description: document.getElementById('pf-description').value.trim(),
            is_featured: document.getElementById('pf-featured').checked
        };

        try {
            if (id) {
                await API.put(`/api/products/${id}`, payload);
            } else {
                await API.post('/api/products', payload);
            }
            modal.style.display = 'none';
            loadAdminProducts(1, document.getElementById('products-search').value);
        } catch (err) {
            errBox.textContent = err.message || 'Failed to save product';
            errBox.style.display = 'block';
        }
    });
}

// ─────────────────────────────────────────────
// USERS MANAGEMENT
// ─────────────────────────────────────────────
async function loadAdminUsers(page = 1, search = '') {
    const tbody = document.getElementById('admin-users-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Loading...</td></tr>';

    try {
        let url = `/api/admin/users?page=${page}&limit=20`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        const data = await API.get(url);

        tbody.innerHTML = data.users.map(u => `
            <tr>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td><span class="${u.is_active ? 'badge-active' : 'badge-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <button class="btn-sm toggle-user-btn"
                        data-id="${u.id}"
                        data-active="${u.is_active}">
                        ${u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.toggle-user-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const isActive = btn.dataset.active === 'true';
                try {
                    await API.put('/api/admin/users', { id, is_active: !isActive });
                    loadAdminUsers(page, search);
                } catch (err) {
                    alert('Failed to update user: ' + err.message);
                }
            });
        });

        renderAdminPagination('users-pagination', data.pagination, (p) => loadAdminUsers(p, search));

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:salmon;text-align:center">${err.message}</td></tr>`;
    }
}

function renderAdminPagination(containerId, { page, totalPages }, callback) {
    const container = document.getElementById(containerId);
    if (!container || totalPages <= 1) return;
    container.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.className = 'btn-sm' + (i === page ? ' btn-active' : '');
        btn.addEventListener('click', () => callback(i));
        container.appendChild(btn);
    }
}
