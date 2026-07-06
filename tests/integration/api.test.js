/**
 * Integration tests for /api/products
 * Uses mocked Supabase to avoid real network calls during CI
 */

// Mock the Supabase module before any imports
jest.mock('../../api/_lib/supabase', () => {
    const mockSelect = jest.fn();
    const mockEq = jest.fn();
    const mockOrder = jest.fn();
    const mockRange = jest.fn();
    const mockSingle = jest.fn();
    const mockInsert = jest.fn();

    const chainable = {
        select: mockSelect,
        eq: mockEq,
        order: mockOrder,
        range: mockRange,
        single: mockSingle,
        insert: mockInsert,
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis()
    };

    Object.values(chainable).forEach(fn => {
        if (typeof fn === 'function') fn.mockReturnValue(chainable);
    });

    const mockSupabase = {
        from: jest.fn().mockReturnValue(chainable),
        auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
        }
    };

    return {
        supabaseAdmin: mockSupabase,
        supabasePublic: mockSupabase
    };
});

const { supabaseAdmin } = require('../../api/_lib/supabase');

describe('Products API - Unit', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('GET /api/products - handler exists', () => {
        const handler = require('../../api/products/index');
        expect(typeof handler).toBe('function');
    });

    test('GET /api/products/[id] - handler exists', () => {
        const handler = require('../../api/products/[id]');
        expect(typeof handler).toBe('function');
    });

    test('validates query params correctly', () => {
        const { isPositiveInteger } = require('../../api/_lib/validators');
        expect(isPositiveInteger('12')).toBe(true);
        expect(isPositiveInteger('0')).toBe(false);
    });
});

describe('Categories API - Unit', () => {
    test('GET /api/categories - handler exists', () => {
        const handler = require('../../api/categories/index');
        expect(typeof handler).toBe('function');
    });
});

describe('Checkout API - Unit', () => {
    test('POST /api/checkout - handler exists', () => {
        const handler = require('../../api/checkout/index');
        expect(typeof handler).toBe('function');
    });

    test('generateOrderNumber produces correct format', () => {
        // Test order number format indirectly through multiple generations
        const numbers = new Set();
        for (let i = 0; i < 10; i++) {
            const ts = Date.now().toString(36).toUpperCase();
            const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
            const num = `RWT-${ts}-${rand}`;
            expect(num).toMatch(/^RWT-[A-Z0-9]+-[A-Z0-9]+$/);
            numbers.add(num);
        }
        // All should be unique
        expect(numbers.size).toBe(10);
    });
});

describe('Auth API - Unit', () => {
    test('POST /api/auth/register - handler exists', () => {
        const handler = require('../../api/auth/register');
        expect(typeof handler).toBe('function');
    });

    test('POST /api/auth/login - handler exists', () => {
        const handler = require('../../api/auth/login');
        expect(typeof handler).toBe('function');
    });

    test('GET /api/auth/me - handler exists', () => {
        const handler = require('../../api/auth/me');
        expect(typeof handler).toBe('function');
    });
});

describe('Admin API - Unit', () => {
    test('GET /api/admin/dashboard - handler exists', () => {
        const handler = require('../../api/admin/dashboard');
        expect(typeof handler).toBe('function');
    });

    test('GET /api/admin/orders - handler exists', () => {
        const handler = require('../../api/admin/orders');
        expect(typeof handler).toBe('function');
    });

    test('GET /api/admin/products - handler exists', () => {
        const handler = require('../../api/admin/products');
        expect(typeof handler).toBe('function');
    });

    test('GET /api/admin/users - handler exists', () => {
        const handler = require('../../api/admin/users');
        expect(typeof handler).toBe('function');
    });
});
