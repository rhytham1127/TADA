-- Migration: Add approval_message and standardize status defaults
-- Created: 2024

-- Step 1: Add approval_message column to tada_claims if it doesn't exist
ALTER TABLE tada_claims ADD COLUMN IF NOT EXISTS approval_message TEXT;

-- Step 2: Update status default from 'pending' to 'draft'
-- First, update any existing 'pending' status to 'submitted' (since they were submitted when created)
UPDATE tada_claims SET status = 'submitted' WHERE status = 'pending';

-- Step 3: Add check constraint to ensure valid status values (optional but recommended)
-- This may fail if the constraint already exists, which is fine
DO $$
BEGIN
  ALTER TABLE tada_claims 
  ADD CONSTRAINT check_valid_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'));
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Step 4: Create an index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_tada_claims_status ON tada_claims(status);

-- Verification query to check if column was added successfully
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'tada_claims' AND column_name = 'approval_message';
