-- ============================================================
-- ADD SECURITY QUESTION TO USERS TABLE
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS security_question VARCHAR(255),
    ADD COLUMN IF NOT EXISTS security_answer   VARCHAR(255);
