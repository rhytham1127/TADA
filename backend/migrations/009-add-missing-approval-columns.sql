-- Migration 009: Add ALL approval-related columns if missing
-- This is the definitive "make approve work" migration.
-- Safe to run multiple times (uses IF NOT EXISTS / DO $$ blocks).

-- Ensure uuid extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add approval columns to tada_claims
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approved_by  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS rejected_by  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS rejected_at  TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS reverted_by  UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS reverted_at  TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approval_message TEXT;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS remarks       TEXT;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add role + profile columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role        VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name   VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department  VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone       VARCHAR(20);

-- Backfill full_name from name if needed
UPDATE users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Backfill submitted_at / created_at for existing rows
UPDATE tada_claims SET submitted_at = updated_at WHERE submitted_at IS NULL AND updated_at IS NOT NULL;
UPDATE tada_claims SET created_at   = updated_at WHERE created_at   IS NULL AND updated_at IS NOT NULL;

-- Normalize status to lowercase
UPDATE tada_claims SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;

-- Normalize role to lowercase (strip underscores)
UPDATE users SET role = LOWER(REPLACE(TRIM(COALESCE(role, 'user')), '_', ''));

-- Drop & recreate status constraint to be permissive
ALTER TABLE tada_claims DROP CONSTRAINT IF EXISTS check_valid_status;
ALTER TABLE tada_claims ADD CONSTRAINT check_valid_status
  CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected'));

-- Create audit log table if missing
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id     UUID NOT NULL REFERENCES tada_claims(id) ON DELETE CASCADE,
  action       VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_claim_id    ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON claim_audit_logs(created_at DESC);
