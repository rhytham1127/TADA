-- Migration 011: Full Audit Log System

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(200),
  role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  module VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  remarks TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

CREATE TABLE IF NOT EXISTS designation_masters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  da_rate INTEGER NOT NULL DEFAULT 1000,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO designation_masters (name, da_rate) VALUES
  ('Project Analyst', 800),
  ('Software Developer', 800),
  ('Junior Software Developer', 800),
  ('Senior Software Developer', 800),
  ('UI/UX Designer', 800),
  ('Data Analyst', 800),
  ('System Administrator', 800),
  ('Operations Executive', 800),
  ('Project Manager', 900),
  ('Assistant Manager', 900),
  ('Branch Manager', 900),
  ('Regional Head', 900),
  ('Clerk', 800),
  ('Cashier', 800),
  ('SDG', 1000),
  ('DG', 1000),
  ('Director General', 1000),
  ('Director', 1000)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
