-- Revert-to-admin fields + indexes

BEGIN;

ALTER TABLE tada_claims
  ADD COLUMN IF NOT EXISTS reverted_by UUID,
  ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMP;

-- Helpful indexes (safe to create if missing)
CREATE INDEX IF NOT EXISTS idx_tada_claims_reverted_at ON tada_claims (reverted_at);

COMMIT;

