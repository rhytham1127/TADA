-- Migration 010: Ensure designation column & valid roles/designations

-- Add designation column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);

-- Add role column if missing (should already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';

-- Add updated_at column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add department column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Update any NULL roles to 'user'
UPDATE users SET role = 'user' WHERE role IS NULL OR role = '';

-- Create index on designation for performance
CREATE INDEX IF NOT EXISTS idx_users_designation ON users(designation);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comment documenting valid values (informational only)
COMMENT ON COLUMN users.designation IS 'BISAG-N designations: Project Analyst, Software Developer, Junior Software Developer, Senior Software Developer, UI/UX Designer, System Administrator, Data Analyst, Project Manager, SDG, DG';
COMMENT ON COLUMN users.role IS 'RBAC roles: user, admin, superadmin';
