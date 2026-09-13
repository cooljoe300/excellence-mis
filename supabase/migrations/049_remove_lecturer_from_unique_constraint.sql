-- Remove lecturer_id from unique constraint to allow lecturers to teach multiple classes
-- This allows lecturers to teach multiple programmes, classes, and units simultaneously
-- as per the real teaching model at Excellence Online College

-- Drop the old constraint if it exists (with lecturer_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'timetables_unique_schedule'
  ) THEN
    ALTER TABLE timetables DROP CONSTRAINT timetables_unique_schedule;
  END IF;
END $$;

-- Add the new unique constraint WITHOUT lecturer_id
ALTER TABLE timetables
ADD CONSTRAINT timetables_unique_schedule 
UNIQUE (day, start_time, end_time, program_id, intake_id, course_id, academic_year);

-- Add comment
COMMENT ON CONSTRAINT timetables_unique_schedule ON timetables IS 
'Prevents duplicate timetable entries with the same schedule details (lecturer can teach multiple classes)';
