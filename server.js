require('dotenv').config();

const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware — required for all POST/PUT handlers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static frontend files
app.use(express.static(path.join(__dirname)));

// ── Auth routes ──────────────────────────────
app.all('/api/auth/register',        require('./api/auth/register'));
app.all('/api/auth/login',           require('./api/auth/login'));
app.all('/api/auth/me',              require('./api/auth/me'));
app.all('/api/auth/forgot-password', require('./api/auth/forgot-password'));

// ── Product routes ───────────────────────────
app.all('/api/products',        require('./api/products/index'));
app.all('/api/products/:id',    (req, res) => {
    req.query.id = req.params.id;
    require('./api/products/[id]')(req, res);
});

// ── Category routes ──────────────────────────
app.all('/api/categories',      require('./api/categories/index'));

// ── Cart routes ──────────────────────────────
app.all('/api/cart',            require('./api/cart/index'));
app.all('/api/cart/items',      require('./api/cart/items/index'));
app.all('/api/cart/items/:itemId', (req, res) => {
    req.query.itemId = req.params.itemId;
    require('./api/cart/items/[itemId]')(req, res);
});

// ── Order routes ─────────────────────────────
app.all('/api/orders',          require('./api/orders/index'));
app.all('/api/orders/:id',      (req, res) => {
    req.query.id = req.params.id;
    require('./api/orders/[id]')(req, res);
});

// ── Checkout route ───────────────────────────
app.all('/api/checkout',        require('./api/checkout/index'));

// ── Contact route ────────────────────────────
app.all('/api/contact',         require('./api/contact/index'));

// ── Notifications routes ─────────────────────
app.get('/api/notifications/stream', require('./api/notifications/stream'));
app.all('/api/notifications',        require('./api/notifications/index'));

// ── Admin routes ─────────────────────────────
app.all('/api/admin/dashboard', require('./api/admin/dashboard'));
app.all('/api/admin/orders',    require('./api/admin/orders'));
app.all('/api/admin/products',  require('./api/admin/products'));
app.all('/api/admin/users',     require('./api/admin/users'));

// ── HTML page routes ─────────────────────────
const pages = ['products', 'cart', 'checkout', 'account', 'profile', 'admin', 'contact'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) =>
        res.sendFile(path.join(__dirname, `${page}.html`))
    );
});
app.get('/product/:id', (req, res) =>
    res.sendFile(path.join(__dirname, 'product_details.html'))
);
app.get('/order-confirmation', (req, res) =>
    res.sendFile(path.join(__dirname, 'order-confirmation.html'))
);
app.get('/', (req, res) =>
    res.sendFile(path.join(__dirname, 'index.html'))
);
app.use((req, res) =>
    res.status(404).sendFile(path.join(__dirname, '404.html'))
);

app.listen(PORT, () => {
    console.log(`\n Rwanda Trad dev server running at http://localhost:${PORT}\n`);
});

module.exports = app;
