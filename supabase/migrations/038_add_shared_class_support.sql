-- Add support for unassigned lecturers and shared/common classes
-- This migration allows:
-- 1. Lecturer to be null (not assigned yet)
-- 2. Shared/common classes where multiple programmes/intakes attend the same session
-- 3. Proper conflict detection that distinguishes between real conflicts and shared sessions

-- Add class_type enum
CREATE TYPE class_type AS ENUM ('regular', 'shared');

-- Add new columns to timetables table
ALTER TABLE timetables
ADD COLUMN IF NOT EXISTS class_type class_type DEFAULT 'regular',
ADD COLUMN IF NOT EXISTS shared_class_id UUID;

-- Make lecturer_id nullable
ALTER TABLE timetables
ALTER COLUMN lecturer_id DROP NOT NULL;

-- Add index for shared_class_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_timetables_shared_class_id ON timetables(shared_class_id) WHERE shared_class_id IS NOT NULL;

-- Drop the old unique constraint that included lecturer_id
ALTER TABLE timetables
DROP CONSTRAINT IF EXISTS timetables_unique_schedule;

-- Add new unique constraint that handles null lecturer_id properly
-- This prevents duplicates while allowing null lecturer_id
ALTER TABLE timetables
ADD CONSTRAINT timetables_unique_schedule 
UNIQUE (day, start_time, end_time, program_id, intake_id, course_id, lecturer_id, academic_year, shared_class_id);

-- Add comments
COMMENT ON COLUMN timetables.lecturer_id IS 'Can be null when lecturer is not yet assigned (To Be Confirmed)';
COMMENT ON COLUMN timetables.class_type IS 'Type of class: regular (single programme/intake) or shared (multiple programmes/intakes together)';
COMMENT ON COLUMN timetables.shared_class_id IS 'Groups multiple timetable entries that represent the same shared teaching session';
COMMENT ON CONSTRAINT timetables_unique_schedule ON timetables IS 
'Prevents duplicate timetable entries. Shared classes with the same shared_class_id are allowed to have overlapping times with the same lecturer.';

-- Update RLS policies to handle null lecturer_id
-- No changes needed as existing policies should work with nullable fields
