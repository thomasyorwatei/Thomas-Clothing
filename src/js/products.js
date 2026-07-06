// Product rendering and dynamic product logic

function formatPrice(amount) {
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0
    }).format(amount);
}

function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return (
        '<i class="fa fa-star"></i>'.repeat(full) +
        (half ? '<i class="fa fa-star-half-o"></i>' : '') +
        '<i class="fa fa-star-o"></i>'.repeat(empty)
    );
}

function renderProductCard(product) {
    const card = document.createElement('div');
    card.className = 'childprods';
    card.innerHTML = `
        <a href="/product_details.html?id=${product.id}">
            <img src="${product.image_url}" alt="${product.name}" loading="lazy">
        </a>
        <h4>${product.name}</h4>
        <div class="rating">${renderStars(product.rating_avg || 0)}</div>
        <p>${formatPrice(product.price)}</p>
    `;
    return card;
}

// ─────────────────────────────────────────────
// HOMEPAGE — Featured and Latest products
// ─────────────────────────────────────────────
async function loadHomepageProducts() {
    const featuredContainer = document.getElementById('featured-products');
    const latestContainer = document.getElementById('latest-products');

    if (!featuredContainer && !latestContainer) return;

    try {
        // Featured products
        if (featuredContainer) {
            featuredContainer.innerHTML = '<p style="text-align:center">Loading...</p>';
            const data = await API.get('/api/products?featured=true&limit=4');
            featuredContainer.innerHTML = '';
            if (data.products.length === 0) {
                featuredContainer.innerHTML = '<p style="text-align:center">No featured products.</p>';
            } else {
                data.products.forEach(p => featuredContainer.appendChild(renderProductCard(p)));
            }
        }

        // Latest products
        if (latestContainer) {
            latestContainer.innerHTML = '<p style="text-align:center">Loading...</p>';
            const data = await API.get('/api/products?sort=created_at&order=desc&limit=12');
            latestContainer.innerHTML = '';
            data.products.forEach(p => latestContainer.appendChild(renderProductCard(p)));
        }

    } catch (err) {
        console.error('Failed to load homepage products:', err);
        if (featuredContainer) featuredContainer.innerHTML = '<p style="text-align:center;color:salmon">Failed to load products.</p>';
        if (latestContainer) latestContainer.innerHTML = '<p style="text-align:center;color:salmon">Failed to load products.</p>';
    }
}

// ─────────────────────────────────────────────
// PRODUCTS PAGE — Full catalog with search/filter
// ─────────────────────────────────────────────
let currentPage = 1;
let currentFilters = {};

async function loadProductsPage() {
    const grid = document.getElementById('products-grid');
    const pagination = document.getElementById('pagination');
    if (!grid) return;

    grid.innerHTML = '<p style="text-align:center;padding:40px">Loading products...</p>';

    try {
        const params = new URLSearchParams();
        params.set('page', currentPage);
        params.set('limit', 12);
        if (currentFilters.category) params.set('category', currentFilters.category);
        if (currentFilters.search) params.set('search', currentFilters.search);
        if (currentFilters.sort) params.set('sort', currentFilters.sort);
        if (currentFilters.order) params.set('order', currentFilters.order);
        if (currentFilters.minPrice) params.set('minPrice', currentFilters.minPrice);
        if (currentFilters.maxPrice) params.set('maxPrice', currentFilters.maxPrice);

        const data = await API.get(`/api/products?${params.toString()}`);

        grid.innerHTML = '';
        if (data.products.length === 0) {
            grid.innerHTML = '<p style="text-align:center;padding:40px">No products found.</p>';
        } else {
            data.products.forEach(p => grid.appendChild(renderProductCard(p)));
        }

        // Render pagination
        if (pagination && data.pagination.totalPages > 1) {
            renderPagination(pagination, data.pagination);
        }

    } catch (err) {
        console.error('Failed to load products:', err);
        grid.innerHTML = '<p style="text-align:center;color:salmon">Failed to load products. Please refresh.</p>';
    }
}

function renderPagination(container, { page, totalPages }) {
    container.innerHTML = '';
    const prev = document.createElement('span');
    prev.innerHTML = '&#8592;';
    prev.style.cursor = page > 1 ? 'pointer' : 'default';
    prev.style.opacity = page > 1 ? '1' : '0.4';
    if (page > 1) prev.addEventListener('click', () => { currentPage--; loadProductsPage(); });
    container.appendChild(prev);

    for (let i = 1; i <= totalPages; i++) {
        const span = document.createElement('span');
        const a = document.createElement('a');
        a.textContent = i;
        a.href = '#';
        if (i === page) a.style.fontWeight = 'bold';
        a.addEventListener('click', (e) => { e.preventDefault(); currentPage = i; loadProductsPage(); });
        span.appendChild(a);
        container.appendChild(span);
    }

    const next = document.createElement('span');
    next.innerHTML = '&#8594;';
    next.style.cursor = page < totalPages ? 'pointer' : 'default';
    next.style.opacity = page < totalPages ? '1' : '0.4';
    if (page < totalPages) next.addEventListener('click', () => { currentPage++; loadProductsPage(); });
    container.appendChild(next);
}

async function loadCategories() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;

    try {
        const data = await API.get('/api/categories');
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Categories';
        categoryFilter.appendChild(allOption);

        data.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.slug;
            option.textContent = `${cat.name} (${cat.product_count})`;
            categoryFilter.appendChild(option);
        });

        // Pre-select from URL params
        const urlParams = new URLSearchParams(window.location.search);
        const catParam = urlParams.get('category');
        if (catParam) {
            categoryFilter.value = catParam;
            currentFilters.category = catParam;
        }

    } catch (err) {
        console.error('Failed to load categories:', err);
    }
}

// ─────────────────────────────────────────────
// PRODUCT DETAIL PAGE
// ─────────────────────────────────────────────
async function loadProductDetail() {
    const detailContainer = document.getElementById('product-detail');
    if (!detailContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        detailContainer.innerHTML = '<p>Product not found. <a href="/products.html">Browse products</a></p>';
        return;
    }

    detailContainer.innerHTML = '<p style="text-align:center;padding:40px">Loading product...</p>';

    try {
        const data = await API.get(`/api/products/${productId}`);
        const p = data.product;

        document.title = `${p.name} | Rwanda Trad`;

        const sizesHtml = (p.sizes || []).length > 0
            ? `<select id="selected-size">
                <option disabled selected>Select Size</option>
                ${p.sizes.map(s => `<option value="${s}">${s}</option>`).join('')}
               </select>`
            : '';

        detailContainer.innerHTML = `
            <div class="child">
                <div class="halfchild">
                    <img src="${p.image_url}" alt="${p.name}" width="550px" height="500px" id="prodImg"><br><br>
                    <div class="small-img-child">
                        ${(p.images || [p.image_url]).slice(0, 4).map(img =>
                            `<div class="small-img-col">
                                <img src="${img}" alt="${p.name} view" width="100%" class="small-img">
                             </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="halfchild">
                    <p>Home / <a href="/products.html">Products</a> / ${p.categories ? p.categories.name : ''}</p>
                    <h1>${p.name}</h1>
                    <h4>${formatPrice(p.price)}</h4>
                    <div class="rating">${renderStars(p.rating_avg || 0)}</div>
                    ${sizesHtml}
                    <input type="number" id="product-quantity" value="1" min="1" max="${p.stock_qty}">
                    <button class="btn" id="add-to-cart-btn" data-product-id="${p.id}">Add To Cart</button>
                    ${p.stock_qty === 0 ? '<p style="color:salmon">Out of stock</p>' : `<small>${p.stock_qty} in stock</small>`}
                    <h3>Product Details <i class="fa fa-indent"></i></h3>
                    <br>
                    <p>${p.description || ''}</p>
                </div>
            </div>
        `;

        // Image gallery click handler
        document.querySelectorAll('.small-img').forEach(img => {
            img.addEventListener('click', () => {
                document.getElementById('prodImg').src = img.src;
            });
        });

        // Add to cart
        const addBtn = document.getElementById('add-to-cart-btn');
        if (addBtn && p.stock_qty > 0) {
            addBtn.addEventListener('click', async () => {
                const qty = parseInt(document.getElementById('product-quantity').value) || 1;
                const size = document.getElementById('selected-size')
                    ? document.getElementById('selected-size').value
                    : null;

                try {
                    addBtn.textContent = 'Adding...';
                    addBtn.disabled = true;
                    await Cart.addItem(p.id, qty, size !== 'Select Size' ? size : null);
                    addBtn.textContent = 'Added ✓';
                    await Cart.updateBadge();
                    setTimeout(() => {
                        addBtn.textContent = 'Add To Cart';
                        addBtn.disabled = false;
                    }, 2000);
                } catch (err) {
                    addBtn.textContent = 'Failed — try again';
                    addBtn.disabled = false;
                    alert(err.message || 'Failed to add to cart');
                }
            });
        }

        // Load related products
        loadRelatedProducts(p.categories ? p.categories.id : null, p.id);

    } catch (err) {
        console.error('Product detail error:', err);
        detailContainer.innerHTML = '<p style="text-align:center;color:salmon">Product not found. <a href="/products.html">Browse products</a></p>';
    }
}

async function loadRelatedProducts(categoryId, excludeId) {
    const container = document.getElementById('related-products');
    if (!container || !categoryId) return;

    try {
        const data = await API.get(`/api/products?category_id=${categoryId}&limit=4`);
        const related = data.products.filter(p => p.id !== parseInt(excludeId)).slice(0, 4);
        container.innerHTML = '';
        related.forEach(p => container.appendChild(renderProductCard(p)));
    } catch {
        container.innerHTML = '';
    }
}
