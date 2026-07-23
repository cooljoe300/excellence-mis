-- Add unique constraint to prevent duplicate enrollments
-- This ensures a student cannot enroll in the same course for the same term more than once

-- Create a unique index on (student_id, course_id, term_id)
-- This will prevent duplicate enrollment records at the database level
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_term_unique 
ON enrollments (student_id, course_id, term_id) 
WHERE status IN ('active', 'pending');

-- Add comment explaining the constraint
COMMENT ON INDEX enrollments_student_course_term_unique IS 'Prevents duplicate enrollments: a student can only enroll in a course once per term (for active/pending statuses)';
