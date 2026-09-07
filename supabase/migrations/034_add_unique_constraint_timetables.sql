-- Add unique constraint to prevent duplicate timetable entries
-- A duplicate is defined as the same combination of:
-- day, start_time, end_time, program_id, intake_id, course_id, lecturer_id, academic_year

-- First, check for existing duplicates
SELECT 
  day, 
  start_time, 
  end_time, 
  program_id, 
  intake_id, 
  course_id, 
  lecturer_id, 
  academic_year,
  COUNT(*) as duplicate_count
FROM timetables
GROUP BY 
  day, 
  start_time, 
  end_time, 
  program_id, 
  intake_id, 
  course_id, 
  lecturer_id, 
  academic_year
HAVING COUNT(*) > 1;

-- Add the unique constraint
ALTER TABLE timetables
ADD CONSTRAINT timetables_unique_schedule 
UNIQUE (day, start_time, end_time, program_id, intake_id, course_id, lecturer_id, academic_year);

-- Add comment
COMMENT ON CONSTRAINT timetables_unique_schedule ON timetables IS 
'Prevents duplicate timetable entries with the same schedule details';
