-- Migration 006: Normalize all status values to lowercase
-- This ensures consistency across the entire system
-- Date: 2026-05-19

-- Normalize tada_claims status to lowercase
UPDATE tada_claims SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;

-- Normalize users role to lowercase
UPDATE users SET role = LOWER(TRIM(role)) WHERE role IS NOT NULL;

-- Verify the changes
-- SELECT DISTINCT status FROM tada_claims ORDER BY status;
-- SELECT DISTINCT role FROM users ORDER BY role;
