// Cart logic — manages cart state and renders cart UI

const Cart = {
    async getCart() {
        return await API.get('/api/cart');
    },

    async addItem(productId, quantity, size) {
        return await API.post('/api/cart/items', { product_id: productId, quantity, size });
    },

    async updateItem(itemId, quantity) {
        return await API.put(`/api/cart/items/${itemId}`, { quantity });
    },

    async removeItem(itemId) {
        return await API.delete(`/api/cart/items/${itemId}`);
    },

    async clearCart() {
        return await API.delete('/api/cart');
    },

    async updateBadge() {
        try {
            const badge = document.getElementById('cart-count');
            if (!badge) return;
            const data = await this.getCart();
            const count = data.cart.item_count || 0;
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'inline-block' : 'none';
        } catch {
            // Badge update failure is non-fatal
        }
    }
};

// ─────────────────────────────────────────────
// CART PAGE RENDER
// ─────────────────────────────────────────────
async function renderCartPage() {
    const tableBody = document.getElementById('cart-items-body');
    const summaryContainer = document.getElementById('cart-summary');
    const emptyMsg = document.getElementById('cart-empty');
    const cartTable = document.getElementById('cart-table');

    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px">Loading cart...</td></tr>';

    try {
        const data = await Cart.getCart();
        const { items, subtotal, tax, shipping, total, item_count } = data.cart;

        if (!items || items.length === 0) {
            if (emptyMsg) emptyMsg.style.display = 'block';
            if (cartTable) cartTable.style.display = 'none';
            if (summaryContainer) summaryContainer.style.display = 'none';
            return;
        }

        if (emptyMsg) emptyMsg.style.display = 'none';
        if (cartTable) cartTable.style.display = 'table';
        if (summaryContainer) summaryContainer.style.display = 'block';

        tableBody.innerHTML = '';

        items.forEach(item => {
            const product = item.products;
            const lineTotal = product.price * item.quantity;
            const tr = document.createElement('tr');
            tr.dataset.itemId = item.id;
            tr.innerHTML = `
                <td>
                    <div class="cart-product">
                        <img src="${product.image_url}" alt="${product.name}">
                        <div>
                            <strong>${product.name}</strong>
                            ${item.size ? `<br><small>Size: ${item.size}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${formatPrice(product.price)}</td>
                <td>
                    <div class="qty-control">
                        <button class="qty-btn" data-action="decrease" data-item-id="${item.id}" data-qty="${item.quantity}">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" data-action="increase" data-item-id="${item.id}" data-qty="${item.quantity}">+</button>
                    </div>
                </td>
                <td class="line-total">${formatPrice(lineTotal)}</td>
                <td>
                    <button class="remove-item-btn" data-item-id="${item.id}">&#10005;</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Update summary
        document.getElementById('summary-subtotal').textContent = formatPrice(subtotal);
        document.getElementById('summary-tax').textContent = formatPrice(tax);
        document.getElementById('summary-shipping').textContent = formatPrice(shipping);
        document.getElementById('summary-total').textContent = formatPrice(total);

        // Attach event handlers
        attachCartHandlers();

    } catch (err) {
        console.error('Cart render error:', err);
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:salmon">Failed to load cart. Please refresh.</td></tr>';
    }
}

function formatPrice(amount) {
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0
    }).format(amount);
}

function attachCartHandlers() {
    // Quantity change buttons
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const itemId = btn.dataset.itemId;
            const currentQty = parseInt(btn.dataset.qty);
            const action = btn.dataset.action;
            const newQty = action === 'increase' ? currentQty + 1 : currentQty - 1;

            if (newQty < 1) return;

            btn.disabled = true;
            try {
                await Cart.updateItem(itemId, newQty);
                await renderCartPage();
                await Cart.updateBadge();
            } catch (err) {
                alert(err.message || 'Failed to update quantity');
                btn.disabled = false;
            }
        });
    });

    // Remove item buttons
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const itemId = btn.dataset.itemId;
            if (!confirm('Remove this item from cart?')) return;
            btn.disabled = true;
            try {
                await Cart.removeItem(itemId);
                await renderCartPage();
                await Cart.updateBadge();
            } catch (err) {
                alert(err.message || 'Failed to remove item');
                btn.disabled = false;
            }
        });
    });
}
