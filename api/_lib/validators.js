function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function isValidPhone(phone) {
    if (!phone) return true; // phone is optional
    return /^(\+?250|0)?[0-9]{9}$/.test(String(phone).replace(/\s/g, ''));
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isPositiveNumber(value) {
    return !isNaN(value) && Number(value) >= 0;
}

function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength)
        .replace(/[<>]/g, ''); // basic XSS prevention
}

function validateRegister(body) {
    const errors = [];
    if (!body.first_name || body.first_name.trim().length < 2) {
        errors.push('First name must be at least 2 characters');
    }
    if (!body.last_name || body.last_name.trim().length < 2) {
        errors.push('Last name must be at least 2 characters');
    }
    if (!body.email || !isValidEmail(body.email)) {
        errors.push('Valid email address is required');
    }
    if (!body.password || !isValidPassword(body.password)) {
        errors.push('Password must be at least 8 characters');
    }
    return errors;
}

function validateLogin(body) {
    const errors = [];
    if (!body.email || !isValidEmail(body.email)) {
        errors.push('Valid email address is required');
    }
    if (!body.password) {
        errors.push('Password is required');
    }
    return errors;
}

function validateCheckout(body) {
    const errors = [];
    if (!body.first_name || body.first_name.trim().length < 2) {
        errors.push('First name is required');
    }
    if (!body.last_name || body.last_name.trim().length < 2) {
        errors.push('Last name is required');
    }
    if (!body.email || !isValidEmail(body.email)) {
        errors.push('Valid email address is required');
    }
    if (body.phone && !isValidPhone(body.phone)) {
        errors.push('Invalid phone number format');
    }
    if (!body.shipping_street || body.shipping_street.trim().length < 5) {
        errors.push('Street address is required');
    }
    if (!body.shipping_city || body.shipping_city.trim().length < 2) {
        errors.push('City is required');
    }
    if (!body.payment_method || !['cash_on_delivery', 'mobile_money', 'bank_transfer'].includes(body.payment_method)) {
        errors.push('Valid payment method is required');
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        errors.push('Order must contain at least one item');
    }
    return errors;
}

function validateProduct(body) {
    const errors = [];
    if (!body.name || body.name.trim().length < 2) {
        errors.push('Product name is required');
    }
    if (!body.category_id || !isPositiveInteger(body.category_id)) {
        errors.push('Valid category is required');
    }
    if (body.price === undefined || !isPositiveNumber(body.price)) {
        errors.push('Valid price is required');
    }
    if (body.stock_qty !== undefined && !isPositiveInteger(body.stock_qty) && body.stock_qty !== 0) {
        errors.push('Stock quantity must be a non-negative integer');
    }
    return errors;
}

module.exports = {
    isValidEmail,
    isValidPhone,
    isValidPassword,
    isPositiveInteger,
    sanitizeString,
    validateRegister,
    validateLogin,
    validateCheckout,
    validateProduct
};
