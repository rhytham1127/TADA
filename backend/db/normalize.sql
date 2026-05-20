-- ============================================================
-- Migration: normalize all existing data
-- Safe to run multiple times (idempotent)
-- ============================================================

-- 1. Ensure tada_claims has all required columns
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approved_by   UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS rejected_by   UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS rejected_at   TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS reverted_by   UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS reverted_at   TIMESTAMP;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approval_message TEXT;
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS remarks       TEXT;

-- 2. Normalize status to lowercase
UPDATE tada_claims SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;

-- 3. Map any legacy "pending" values to "submitted"
UPDATE tada_claims SET status = 'submitted' WHERE LOWER(TRIM(status)) = 'pending';

-- 4. Drop old constraint if it included 'pending', add clean one
ALTER TABLE tada_claims DROP CONSTRAINT IF EXISTS check_valid_status;
ALTER TABLE tada_claims DROP CONSTRAINT IF EXISTS tada_claims_status_check;
ALTER TABLE tada_claims ADD CONSTRAINT tada_claims_status_check
  CHECK (status IN ('draft','submitted','approved','rejected'));

-- 5. Normalize user roles to lowercase
UPDATE users SET role = LOWER(TRIM(role)) WHERE role IS NOT NULL;

-- 6. Ensure claim_documents has no expense_item_id FK (simplified schema)
ALTER TABLE claim_documents DROP COLUMN IF EXISTS expense_item_id;

-- 7. Ensure audit logs table exists
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id     UUID NOT NULL REFERENCES tada_claims(id) ON DELETE CASCADE,
  action       VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_claim_id   ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON claim_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_status    ON tada_claims(status);
