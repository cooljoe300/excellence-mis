-- Add is_visible field to time_slots table
-- This allows hiding time slots from the main timetable without deleting them

ALTER TABLE time_slots 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing records to be visible by default
UPDATE time_slots 
SET is_visible = TRUE 
WHERE is_visible IS NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN time_slots.is_visible IS 'Controls whether the time slot appears in the main timetable. Hidden slots remain in database and can be managed by admins.';
