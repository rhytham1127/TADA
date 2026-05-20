-- =====================================================
-- TADA SYSTEM: DATABASE INITIALIZATION & FIX GUIDE
-- =====================================================

-- This file contains all necessary migrations and setup steps
-- Run these in order to ensure complete system functionality

-- =====================================================
-- STEP 1: Initial Schema (if not exists)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  designation VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bank details table
CREATE TABLE IF NOT EXISTS bank_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  ifsc_code VARCHAR(20) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'savings',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- TADA Claims table
CREATE TABLE IF NOT EXISTS tada_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  claim_number VARCHAR(50) UNIQUE NOT NULL,
  purpose_of_travel TEXT NOT NULL,
  travel_from VARCHAR(255) NOT NULL,
  travel_to VARCHAR(255) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted',
  total_amount DECIMAL(12, 2) DEFAULT 0,
  remarks TEXT,
  approval_message TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMP,
  reverted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reverted_at TIMESTAMP,
  CONSTRAINT check_valid_status CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'rejected'))
);

-- TADA Expenses table
CREATE TABLE IF NOT EXISTS tada_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  place_from VARCHAR(255),
  place_to VARCHAR(255),
  mode VARCHAR(50),
  fare DECIMAL(10, 2) DEFAULT 0,
  accommodation DECIMAL(10, 2) DEFAULT 0,
  conveyance DECIMAL(10, 2) DEFAULT 0,
  da DECIMAL(10, 2) DEFAULT 0,
  phone DECIMAL(10, 2) DEFAULT 0,
  internet DECIMAL(10, 2) DEFAULT 0,
  guest_entertainment DECIMAL(10, 2) DEFAULT 0,
  others DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded documents table
CREATE TABLE IF NOT EXISTS claim_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit trail table
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES tada_claims(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 2: CRITICAL FIX - Normalize all existing data
-- =====================================================

-- Normalize all status values to lowercase
UPDATE tada_claims SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;

-- Normalize all role values to lowercase
UPDATE users SET role = LOWER(TRIM(role)) WHERE role IS NOT NULL;

-- =====================================================
-- STEP 3: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tada_claims_user_id ON tada_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_tada_claims_status ON tada_claims(status);
CREATE INDEX IF NOT EXISTS idx_tada_claims_created_at ON tada_claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tada_expenses_claim_id ON tada_expenses(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_documents_claim_id ON claim_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_claim_id ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON claim_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================================
-- STEP 4: Update Timestamps Function (Trigger automatic updated_at)
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_details_updated_at BEFORE UPDATE ON bank_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tada_claims_updated_at BEFORE UPDATE ON tada_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tada_expenses_updated_at BEFORE UPDATE ON tada_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: Verify all changes
-- =====================================================

-- Check all status values are lowercase
SELECT DISTINCT LOWER(status) as status FROM tada_claims ORDER BY status;

-- Check all role values are lowercase
SELECT DISTINCT LOWER(role) as role FROM users ORDER BY role;

-- Check claim counts by status
SELECT 
  LOWER(status) as status,
  COUNT(*) as count
FROM tada_claims
GROUP BY LOWER(status)
ORDER BY status;

-- =====================================================
-- KEY NOTES FOR DEVELOPERS
-- =====================================================
--
-- 1. STATUS VALUES (must be lowercase):
--    - 'draft' → Saved locally, not submitted
--    - 'submitted' → Submitted by user, awaiting admin approval
--    - 'approved' → Approved, payment processing
--    - 'rejected' → Rejected with remarks
--    - 'pending' → (legacy, use 'submitted' for new claims)
--
-- 2. ROLE VALUES (must be lowercase):
--    - 'user' → Regular employee
--    - 'admin' → Can approve/reject claims
--    - 'superadmin' → Full access, can revert approvals
--
-- 3. ALWAYS NORMALIZE:
--    - Backend: status = status.toLowerCase().trim()
--    - Backend: role = (role || '').toLowerCase().trim()
--    - Frontend: status comparisons with normalizeStatus()
--    - Frontend: role checks with normalizeRole()
--
-- 4. APPROVAL FLOW:
--    submitted → approved (admin action)
--    submitted → rejected (admin action)
--    approved → submitted (superadmin revert only, within 24h)
--
-- 5. API ENDPOINTS:
--    POST   /api/admin/claims/:id/approve
--    PUT    /api/admin/claims/:id/reject
--    PUT    /api/admin/claims/:id/revert (superadmin only)
