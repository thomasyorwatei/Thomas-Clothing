// Checkout page logic

function formatPrice(amount) {
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0
    }).format(amount);
}

async function loadCheckoutSummary() {
    const summaryContainer = document.getElementById('checkout-summary-items');
    const totalEl = document.getElementById('checkout-total');

    if (!summaryContainer) return null;

    try {
        const data = await API.get('/api/cart');
        const { items, subtotal, tax, shipping, total } = data.cart;

        if (!items || items.length === 0) {
            window.location.href = '/cart.html';
            return null;
        }

        summaryContainer.innerHTML = '';
        items.forEach(item => {
            const p = item.products;
            const li = document.createElement('li');
            li.className = 'checkout-item';
            li.innerHTML = `
                <img src="${p.image_url}" alt="${p.name}">
                <span>${p.name}${item.size ? ` (${item.size})` : ''} × ${item.quantity}</span>
                <span>${formatPrice(p.price * item.quantity)}</span>
            `;
            summaryContainer.appendChild(li);
        });

        document.getElementById('checkout-subtotal').textContent = formatPrice(subtotal);
        document.getElementById('checkout-tax').textContent = formatPrice(tax);
        document.getElementById('checkout-shipping').textContent = formatPrice(shipping);
        if (totalEl) totalEl.textContent = formatPrice(total);

        return { items, subtotal, tax, shipping, total };

    } catch (err) {
        console.error('Checkout summary error:', err);
        return null;
    }
}

function validateCheckoutForm() {
    const errors = [];
    const getValue = id => (document.getElementById(id)?.value || '').trim();

    const firstName = getValue('checkout-first-name');
    const lastName = getValue('checkout-last-name');
    const email = getValue('checkout-email');
    const street = getValue('checkout-street');
    const city = getValue('checkout-city');
    const payment = getValue('checkout-payment');

    if (!firstName || firstName.length < 2) errors.push('First name is required');
    if (!lastName || lastName.length < 2) errors.push('Last name is required');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Valid email is required');
    if (!street || street.length < 5) errors.push('Street address is required');
    if (!city || city.length < 2) errors.push('City is required');
    if (!payment) errors.push('Please select a payment method');

    return errors;
}

function showFormErrors(errors) {
    let errorBox = document.getElementById('form-errors');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.id = 'form-errors';
        errorBox.className = 'error-box';
        document.getElementById('checkout-form').prepend(errorBox);
    }
    errorBox.innerHTML = errors.map(e => `<p>• ${e}</p>`).join('');
    errorBox.scrollIntoView({ behavior: 'smooth' });
}

function clearFormErrors() {
    const errorBox = document.getElementById('form-errors');
    if (errorBox) errorBox.innerHTML = '';
}

async function submitCheckout(cartData) {
    const getValue = id => (document.getElementById(id)?.value || '').trim();

    const orderPayload = {
        first_name: getValue('checkout-first-name'),
        last_name: getValue('checkout-last-name'),
        email: getValue('checkout-email'),
        phone: getValue('checkout-phone'),
        shipping_street: getValue('checkout-street'),
        shipping_city: getValue('checkout-city'),
        shipping_province: getValue('checkout-province'),
        payment_method: getValue('checkout-payment'),
        notes: getValue('checkout-notes'),
        items: cartData.items.map(item => ({
            product_id: item.products.id,
            quantity: item.quantity,
            size: item.size
        }))
    };

    return await API.post('/api/checkout', orderPayload);
}

// ─────────────────────────────────────────────
// INIT CHECKOUT PAGE
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    // Pre-fill form if user is logged in
    const user = Auth.getUser();
    if (user) {
        const firstName = document.getElementById('checkout-first-name');
        const lastName = document.getElementById('checkout-last-name');
        const email = document.getElementById('checkout-email');
        if (firstName) firstName.value = user.first_name || '';
        if (lastName) lastName.value = user.last_name || '';
        if (email) email.value = user.email || '';
    }

    const cartData = await loadCheckoutSummary();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearFormErrors();

        const errors = validateCheckoutForm();
        if (errors.length > 0) {
            showFormErrors(errors);
            return;
        }

        const submitBtn = document.getElementById('place-order-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Placing Order...';

        try {
            // Re-fetch cart at submit time to ensure we have fresh data
            const freshCartData = await loadCheckoutSummary();
            if (!freshCartData || !freshCartData.items || freshCartData.items.length === 0) {
                showFormErrors(['Your cart is empty. Please add items before placing an order.']);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Place Order';
                return;
            }
            const result = await submitCheckout(freshCartData);
            window.location.href = `/order-confirmation.html?order=${result.order.order_number}`;
        } catch (err) {
            showFormErrors([err.message || 'Failed to place order. Please try again.']);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        }
    });
});
