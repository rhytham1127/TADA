-- Migration 005: Ensure all required columns exist (safe - uses IF NOT EXISTS)
-- Run this if upgrading from an older schema

ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS reverted_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approval_message TEXT;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;

-- Ensure submitted_at is populated for existing submitted claims
UPDATE tada_claims SET submitted_at = updated_at WHERE LOWER(status) = 'submitted' AND submitted_at IS NULL;

-- Ensure users table has role column with correct defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create claim_audit_logs if not exists
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES tada_claims(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
