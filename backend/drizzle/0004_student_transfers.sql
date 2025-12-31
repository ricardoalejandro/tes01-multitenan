-- Migration: Add student_transfers table
-- For managing student transfers between branches

-- Create transfer status enum
DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create student_transfers table
CREATE TABLE IF NOT EXISTS student_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  target_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status transfer_status NOT NULL DEFAULT 'pending',
  transfer_type TEXT NOT NULL, -- 'outgoing' | 'incoming'
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP,
  rejection_reason TEXT,
  expires_at TIMESTAMP NOT NULL,
  removed_from_groups TEXT, -- JSON array of group IDs
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_transfers_student ON student_transfers(student_id);
CREATE INDEX IF NOT EXISTS idx_transfers_source_branch ON student_transfers(source_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_target_branch ON student_transfers(target_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON student_transfers(status);

-- Add can_manage_transfers field to roles table if not exists
DO $$ BEGIN
  ALTER TABLE roles ADD COLUMN can_manage_transfers BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
