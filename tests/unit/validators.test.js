const {
    isValidEmail,
    isValidPhone,
    isValidPassword,
    isPositiveInteger,
    sanitizeString,
    validateRegister,
    validateLogin,
    validateCheckout,
    validateProduct
} = require('../../api/_lib/validators');

describe('Validators - isValidEmail', () => {
    test('accepts valid email', () => {
        expect(isValidEmail('user@example.com')).toBe(true);
        expect(isValidEmail('test.email+tag@domain.co.rw')).toBe(true);
    });
    test('rejects invalid email', () => {
        expect(isValidEmail('notanemail')).toBe(false);
        expect(isValidEmail('missing@')).toBe(false);
        expect(isValidEmail('@nodomain.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
    });
});

describe('Validators - isValidPhone', () => {
    test('accepts valid Rwanda phone numbers', () => {
        expect(isValidPhone('0781234567')).toBe(true);
        expect(isValidPhone('+250781234567')).toBe(true);
        expect(isValidPhone('250781234567')).toBe(true);
    });
    test('accepts empty phone (optional field)', () => {
        expect(isValidPhone('')).toBe(true);
        expect(isValidPhone(null)).toBe(true);
        expect(isValidPhone(undefined)).toBe(true);
    });
    test('rejects invalid phone', () => {
        expect(isValidPhone('12345')).toBe(false);
        expect(isValidPhone('abcdefghij')).toBe(false);
    });
});

describe('Validators - isValidPassword', () => {
    test('accepts password 8+ characters', () => {
        expect(isValidPassword('password123')).toBe(true);
        expect(isValidPassword('12345678')).toBe(true);
    });
    test('rejects short password', () => {
        expect(isValidPassword('short')).toBe(false);
        expect(isValidPassword('')).toBe(false);
        expect(isValidPassword(null)).toBe(false);
    });
});

describe('Validators - isPositiveInteger', () => {
    test('accepts positive integers', () => {
        expect(isPositiveInteger(1)).toBe(true);
        expect(isPositiveInteger('5')).toBe(true);
        expect(isPositiveInteger(100)).toBe(true);
    });
    test('rejects zero, negative, floats', () => {
        expect(isPositiveInteger(0)).toBe(false);
        expect(isPositiveInteger(-1)).toBe(false);
        expect(isPositiveInteger(1.5)).toBe(false);
        expect(isPositiveInteger('abc')).toBe(false);
    });
});

describe('Validators - sanitizeString', () => {
    test('removes angle brackets', () => {
        // Both < and > are stripped, so tags become tagless content
        expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
        expect(sanitizeString('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });
    test('trims whitespace', () => {
        expect(sanitizeString('  hello  ')).toBe('hello');
    });
    test('respects maxLength', () => {
        expect(sanitizeString('abcdefghij', 5)).toBe('abcde');
    });
});

describe('validateRegister', () => {
    const valid = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123'
    };

    test('returns no errors for valid data', () => {
        expect(validateRegister(valid)).toHaveLength(0);
    });
    test('requires first_name', () => {
        const errors = validateRegister({ ...valid, first_name: '' });
        expect(errors.length).toBeGreaterThan(0);
    });
    test('requires valid email', () => {
        const errors = validateRegister({ ...valid, email: 'bademail' });
        expect(errors.length).toBeGreaterThan(0);
    });
    test('requires password 8+ chars', () => {
        const errors = validateRegister({ ...valid, password: '123' });
        expect(errors.length).toBeGreaterThan(0);
    });
});

describe('validateLogin', () => {
    test('returns no errors for valid data', () => {
        expect(validateLogin({ email: 'user@test.com', password: 'pass' })).toHaveLength(0);
    });
    test('requires email', () => {
        expect(validateLogin({ email: '', password: 'pass' }).length).toBeGreaterThan(0);
    });
    test('requires password', () => {
        expect(validateLogin({ email: 'user@test.com', password: '' }).length).toBeGreaterThan(0);
    });
});

describe('validateCheckout', () => {
    const valid = {
        first_name: 'Amina',
        last_name: 'Uwase',
        email: 'amina@example.com',
        shipping_street: 'KN 5 Ave',
        shipping_city: 'Kigali',
        payment_method: 'cash_on_delivery',
        items: [{ product_id: 1, quantity: 2 }]
    };

    test('returns no errors for valid data', () => {
        expect(validateCheckout(valid)).toHaveLength(0);
    });
    test('requires email', () => {
        expect(validateCheckout({ ...valid, email: 'bademail' }).length).toBeGreaterThan(0);
    });
    test('requires items array', () => {
        expect(validateCheckout({ ...valid, items: [] }).length).toBeGreaterThan(0);
    });
    test('rejects invalid payment method', () => {
        expect(validateCheckout({ ...valid, payment_method: 'crypto' }).length).toBeGreaterThan(0);
    });
});

describe('validateProduct', () => {
    const valid = { name: 'Test Product', category_id: 1, price: 50000 };

    test('returns no errors for valid data', () => {
        expect(validateProduct(valid)).toHaveLength(0);
    });
    test('requires name', () => {
        expect(validateProduct({ ...valid, name: '' }).length).toBeGreaterThan(0);
    });
    test('requires positive price', () => {
        expect(validateProduct({ ...valid, price: -100 }).length).toBeGreaterThan(0);
    });
    test('requires category_id', () => {
        expect(validateProduct({ ...valid, category_id: 0 }).length).toBeGreaterThan(0);
    });
});
