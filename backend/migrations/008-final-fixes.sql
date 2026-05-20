-- Migration 008: Final consistency fixes
-- Date: 2026-05-19

-- 1. Normalize all status values to lowercase (safe to re-run)
UPDATE tada_claims SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL AND status != LOWER(TRIM(status));

-- 2. Normalize all user roles to lowercase and strip underscores
UPDATE users SET role = LOWER(REPLACE(TRIM(role), '_', '')) WHERE role IS NOT NULL;

-- 3. Ensure tada_claims has created_at column (some older schemas may use submitted_at only)
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 4. Backfill created_at from submitted_at for existing rows
UPDATE tada_claims SET created_at = submitted_at WHERE created_at IS NULL AND submitted_at IS NOT NULL;

-- 5. Ensure 'pending' is allowed in status constraint (for legacy data)
-- Drop and recreate constraint to include 'pending' as valid
ALTER TABLE tada_claims DROP CONSTRAINT IF EXISTS check_valid_status;
ALTER TABLE tada_claims ADD CONSTRAINT check_valid_status 
  CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected'));

-- 6. Re-normalize 'pending' -> 'submitted' for clean state (optional, comment out to keep pending)
-- UPDATE tada_claims SET status = 'submitted' WHERE status = 'pending';
