// Central API configuration
// In production on Vercel, API routes are on the same domain so base is empty string
// Locally you can override this

const CONFIG = {
    API_BASE: '',  // Vercel serves /api/* on the same domain — no prefix needed
    SUPABASE_URL: '',   // Set via environment — not needed in frontend (we call our own API)
    SUPABASE_ANON_KEY: '',
    CURRENCY: 'RWF',
    LOCALE: 'rw-RW',
    TAX_RATE: 0.18,
    SHIPPING_KIGALI: 2000,
    SHIPPING_OTHER: 5000,
    CART_SESSION_KEY: 'rwt_session_id',
    AUTH_TOKEN_KEY: 'rwt_token',
    AUTH_USER_KEY: 'rwt_user'
};

// Freeze so config is never accidentally mutated
Object.freeze(CONFIG);
