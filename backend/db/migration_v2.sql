-- =====================================================
-- Migration v2: Add approval/rejection/revert columns
-- and audit trail table
-- Run once against your PostgreSQL database
-- =====================================================

-- Add missing columns to tada_claims (safe with IF NOT EXISTS equivalent)
DO $$
BEGIN
  -- approved_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tada_claims' AND column_name='approved_by'
  ) THEN
    ALTER TABLE tada_claims ADD COLUMN approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- approved_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tada_claims' AND column_name='approved_at'
  ) THEN
    ALTER TABLE tada_claims ADD COLUMN approved_at TIMESTAMP;
  END IF;

  -- rejected_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tada_claims' AND column_name='rejected_by'
  ) THEN
    ALTER TABLE tada_claims ADD COLUMN rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- rejected_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tada_claims' AND column_name='rejected_at'
  ) THEN
    ALTER TABLE tada_claims ADD COLUMN rejected_at TIMESTAMP;
  END IF;

  -- reverted_by (Super Admin revert)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tada_claims' AND column_name='reverted_by'
  ) THEN
    ALTER TABLE tada_claims ADD COLUMN reverted_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- reverted_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='tada_claims' AND column_name='reverted_at'
  ) THEN
    ALTER TABLE tada_claims ADD COLUMN reverted_at TIMESTAMP;
  END IF;
END $$;

-- Update the status check constraint to include 'pending' for backward compat
ALTER TABLE tada_claims DROP CONSTRAINT IF EXISTS check_valid_status;
ALTER TABLE tada_claims ADD CONSTRAINT check_valid_status
  CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected'));

-- Audit trail table
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id     UUID NOT NULL REFERENCES tada_claims(id) ON DELETE CASCADE,
  action       VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_claim_id ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON claim_audit_logs(created_at DESC);
