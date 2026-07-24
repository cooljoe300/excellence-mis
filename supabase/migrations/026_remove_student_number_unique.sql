-- Remove unique constraint from student_number
-- student_number is now just a copy of admission_number for backward compatibility
-- The unique constraint should only be on admission_number to avoid duplicate key errors
-- during concurrent student registration

-- Drop the unique constraint if it exists
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_number_key;

-- Add a comment explaining the change
COMMENT ON COLUMN students.student_number IS 'Legacy field - copy of admission_number for backward compatibility. Not unique.';
