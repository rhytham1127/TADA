-- TADA Application Database Schema
-- Run this file to set up the database

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  designation VARCHAR(200),
  department VARCHAR(200),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bank details table
CREATE TABLE IF NOT EXISTS bank_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_holder_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(200) NOT NULL,
  branch_name VARCHAR(200),
  ifsc_code VARCHAR(20) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'Savings',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- TADA claims table
CREATE TABLE IF NOT EXISTS tada_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ref_no VARCHAR(100),
  journey_purpose VARCHAR(500) NOT NULL,
  project VARCHAR(500),
  tour_date_from DATE NOT NULL,
  tour_date_to DATE NOT NULL,
  time_from VARCHAR(20),
  time_to VARCHAR(20),
  status VARCHAR(50) DEFAULT 'pending',
  total_fare DECIMAL(12,2) DEFAULT 0,
  total_accommodation DECIMAL(12,2) DEFAULT 0,
  total_conveyance DECIMAL(12,2) DEFAULT 0,
  total_da DECIMAL(12,2) DEFAULT 0,
  total_phone DECIMAL(12,2) DEFAULT 0,
  total_internet DECIMAL(12,2) DEFAULT 0,
  total_guest_entertainment DECIMAL(12,2) DEFAULT 0,
  total_others DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) DEFAULT 0,
  advance_cash DECIMAL(12,2) DEFAULT 0,
  advance_ticket DECIMAL(12,2) DEFAULT 0,
  advance_vehicle DECIMAL(12,2) DEFAULT 0,
  advance_accommodation DECIMAL(12,2) DEFAULT 0,
  advance_other DECIMAL(12,2) DEFAULT 0,
  advance_total DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trip rows/entries table
CREATE TABLE IF NOT EXISTS trip_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  entry_date DATE,
  place_from VARCHAR(200),
  place_to VARCHAR(200),
  mode VARCHAR(100),
  fare DECIMAL(12,2) DEFAULT 0,
  accommodation DECIMAL(12,2) DEFAULT 0,
  conveyance DECIMAL(12,2) DEFAULT 0,
  da DECIMAL(12,2) DEFAULT 0,
  phone DECIMAL(12,2) DEFAULT 0,
  internet DECIMAL(12,2) DEFAULT 0,
  guest_entertainment DECIMAL(12,2) DEFAULT 0,
  others DECIMAL(12,2) DEFAULT 0,
  row_total DECIMAL(12,2) DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- File attachments table
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID REFERENCES tada_claims(id) ON DELETE CASCADE,
  original_name VARCHAR(500) NOT NULL,
  stored_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tada_claims_user_id ON tada_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_entries_claim_id ON trip_entries(claim_id);
CREATE INDEX IF NOT EXISTS idx_attachments_claim_id ON attachments(claim_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_details_updated_at BEFORE UPDATE ON bank_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tada_claims_updated_at BEFORE UPDATE ON tada_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
