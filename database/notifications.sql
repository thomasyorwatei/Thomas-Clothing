-- ============================================================
-- NOTIFICATIONS TABLE
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = admin notification
    type        VARCHAR(50) NOT NULL,   -- 'new_order' | 'order_status'
    title       VARCHAR(255) NOT NULL,
    message     TEXT NOT NULL,
    order_id    INT REFERENCES orders(id) ON DELETE CASCADE,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Users see only their own; service_role (backend) bypasses RLS
CREATE POLICY notifications_owner ON notifications FOR SELECT
    USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));
