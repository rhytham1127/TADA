-- TADA Database Schema

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

-- TADA Expenses table (detailed expense breakdown)
CREATE TABLE IF NOT EXISTS tada_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  place_from VARCHAR(255),
  place_to VARCHAR(255),
  mode VARCHAR(50), -- Air, Train, Bus
  fare DECIMAL(10, 2) DEFAULT 0,
  accommodation DECIMAL(10, 2) DEFAULT 0,
  conveyance DECIMAL(10, 2) DEFAULT 0,
  da DECIMAL(10, 2) DEFAULT 0,
  phone DECIMAL(10, 2) DEFAULT 0,
  internet DECIMAL(10, 2) DEFAULT 0,
  guest_entertainment DECIMAL(10, 2) DEFAULT 0,
  others DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0, -- Auto-calculated
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy expense items table (kept for backward compatibility)
CREATE TABLE IF NOT EXISTS expense_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL,
  expense_type VARCHAR(100) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded documents table
CREATE TABLE IF NOT EXISTS claim_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  expense_item_id UUID REFERENCES expense_items(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_details_updated_at BEFORE UPDATE ON bank_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tada_claims_updated_at BEFORE UPDATE ON tada_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tada_expenses_updated_at BEFORE UPDATE ON tada_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trail table (tracks all claim status changes)
CREATE TABLE IF NOT EXISTS claim_audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id     UUID NOT NULL REFERENCES tada_claims(id) ON DELETE CASCADE,
  action       VARCHAR(50) NOT NULL,  -- 'approved', 'rejected', 'reverted_to_submitted'
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  remarks      TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_claim_id ON claim_audit_logs(claim_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON claim_audit_logs(created_at DESC);
