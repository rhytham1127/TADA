-- Migration: Add user role + approval/rejection tracking + override flag
-- Created: 2026-05-18

-- 1) Add role to users (VARCHAR + CHECK constraint)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(50);

-- Default role to 'user'
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Add CHECK constraint (ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('superadmin','admin','subadmin','user'));
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- 2) Add approval/audit fields to tada_claims
ALTER TABLE tada_claims
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS override_flag BOOLEAN DEFAULT FALSE;

-- Backfill override_flag to false where NULL
UPDATE tada_claims SET override_flag = FALSE WHERE override_flag IS NULL;

-- 3) Optional: constraints (don’t fail if already present)
DO $$
BEGIN
  -- Ensure override_flag is boolean-like (it already is, but keep safety)
  NULL;
END $$;

