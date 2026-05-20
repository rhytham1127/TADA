-- Migration: claim_audit_logs for approval/rejection audit
-- Created: 2026-05-18

-- Create audit log table
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  performed_by UUID NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_claim
    FOREIGN KEY (claim_id)
    REFERENCES tada_claims(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user
    FOREIGN KEY (performed_by)
    REFERENCES users(id)
    ON DELETE SET NULL
);

