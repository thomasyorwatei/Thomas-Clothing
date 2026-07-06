-- ============================================================
-- RWANDA TRAD E-COMMERCE DATABASE SCHEMA
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id            SERIAL PRIMARY KEY,
    category_id   INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL UNIQUE,
    description   TEXT,
    price         NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    stock_qty     INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    image_url     VARCHAR(500),
    images        JSONB DEFAULT '[]',
    sizes         JSONB DEFAULT '[]',
    rating_avg    NUMERIC(3, 2) DEFAULT 0.00 CHECK (rating_avg BETWEEN 0 AND 5),
    rating_count  INT DEFAULT 0,
    is_featured   BOOLEAN DEFAULT FALSE,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category  ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug      ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_price     ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_search    ON products
    USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- ============================================================
-- USERS  (mirrors Supabase auth.users — stores extra profile data)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id        UUID UNIQUE,
    first_name     VARCHAR(100) NOT NULL,
    last_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    phone          VARCHAR(20),
    role           VARCHAR(20) NOT NULL DEFAULT 'customer'
                   CHECK (role IN ('customer', 'admin')),
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role    ON users(role);

-- ============================================================
-- CARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS carts (
    id          SERIAL PRIMARY KEY,
    user_id     UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    session_id  VARCHAR(255) UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id          SERIAL PRIMARY KEY,
    cart_id     INT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    size        VARCHAR(10),
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (cart_id, product_id, size)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id                   SERIAL PRIMARY KEY,
    user_id              UUID REFERENCES users(id) ON DELETE SET NULL,
    order_number         VARCHAR(50) NOT NULL UNIQUE,
    status               VARCHAR(30) NOT NULL DEFAULT 'pending'
                         CHECK (status IN (
                             'pending','confirmed','processing',
                             'shipped','delivered','cancelled','refunded'
                         )),
    customer_first_name  VARCHAR(100) NOT NULL,
    customer_last_name   VARCHAR(100) NOT NULL,
    customer_email       VARCHAR(255) NOT NULL,
    customer_phone       VARCHAR(20),
    shipping_street      VARCHAR(255) NOT NULL,
    shipping_city        VARCHAR(100) NOT NULL,
    shipping_province    VARCHAR(100),
    shipping_country     VARCHAR(100) NOT NULL DEFAULT 'Rwanda',
    subtotal             NUMERIC(12, 2) NOT NULL,
    shipping_fee         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_amount           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount         NUMERIC(12, 2) NOT NULL,
    currency             VARCHAR(10) NOT NULL DEFAULT 'RWF',
    payment_method       VARCHAR(50) NOT NULL DEFAULT 'cash_on_delivery'
                         CHECK (payment_method IN (
                             'cash_on_delivery','mobile_money','bank_transfer'
                         )),
    notes                TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user         ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at DESC);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id             SERIAL PRIMARY KEY,
    order_id       INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id     INT REFERENCES products(id) ON DELETE SET NULL,
    product_name   VARCHAR(255) NOT NULL,
    product_image  VARCHAR(500),
    size           VARCHAR(10),
    unit_price     NUMERIC(12, 2) NOT NULL,
    quantity       INT NOT NULL CHECK (quantity > 0),
    line_total     NUMERIC(12, 2) NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
    id                SERIAL PRIMARY KEY,
    order_id          INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    transaction_ref   VARCHAR(100) NOT NULL UNIQUE,
    payment_method    VARCHAR(50) NOT NULL DEFAULT 'cash_on_delivery',
    status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','completed','failed','refunded')),
    amount            NUMERIC(12, 2) NOT NULL,
    currency          VARCHAR(10) NOT NULL DEFAULT 'RWF',
    gateway_response  JSONB,
    processed_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_order ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_ref   ON transactions(transaction_ref);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_carts_updated_at
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Users table: users can only read/update their own row
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_self_select ON users FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY users_self_update ON users FOR UPDATE USING (auth.uid() = auth_id);

-- Products: anyone can read, only service_role can write
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY products_public_read ON products FOR SELECT USING (is_active = TRUE);

-- Categories: public read
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_public_read ON categories FOR SELECT USING (TRUE);

-- Carts: users can only access their own cart
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY carts_owner ON carts FOR ALL USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR session_id IS NOT NULL
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cart_items_owner ON cart_items FOR ALL USING (
    cart_id IN (
        SELECT id FROM carts WHERE
            user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
            OR session_id IS NOT NULL
    )
);

-- Orders: users see their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_owner ON orders FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    OR user_id IS NULL
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_items_owner ON order_items FOR SELECT USING (
    order_id IN (
        SELECT id FROM orders WHERE
            user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactions_owner ON transactions FOR SELECT USING (
    order_id IN (
        SELECT id FROM orders WHERE
            user_id = (SELECT id FROM users WHERE auth_id = auth.uid())
    )
);
