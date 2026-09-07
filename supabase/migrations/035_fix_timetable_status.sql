-- Fix timetable status values to ensure consistency
-- This migration ensures all status values are lowercase and valid enum values

-- Update any NULL or invalid status values to 'draft'
UPDATE timetables
SET status = 'draft'
WHERE status IS NULL 
   OR status NOT IN ('draft', 'active', 'archived');

-- Ensure the enum contains the correct values
-- (This is defensive - the enum should already have these values from migration 018)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type 
    WHERE typname = 'timetable_status'
  ) THEN
    CREATE TYPE timetable_status AS ENUM ('draft', 'active', 'archived');
  END IF;
END $$;

-- Add comment to clarify the status values
COMMENT ON TYPE timetable_status IS 'Timetable entry status: draft (saved but not published), active (published and visible to students), archived (no longer in use)';
