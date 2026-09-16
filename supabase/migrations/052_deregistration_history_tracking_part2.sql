-- PART 2: Add deregistration history tracking (must run after 051)
-- This migration adds the ability to track deregistered units without deleting enrollment data
-- Run this AFTER migration 051 (which adds the 'deregistered' enum value)

-- Add deregistration tracking fields to enrollments table
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS deregistered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deregistered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS deregistration_reason TEXT;

-- Add indexes for deregistration queries
CREATE INDEX IF NOT EXISTS enrollments_deregistered_idx 
ON enrollments(status, deregistered_at DESC) 
WHERE status = 'deregistered';

CREATE INDEX IF NOT EXISTS enrollments_student_term_status_idx 
ON enrollments(student_id, term_id, status);

-- Add comments
COMMENT ON COLUMN enrollments.deregistered_at IS 'Timestamp when the enrollment was deregistered';
COMMENT ON COLUMN enrollments.deregistered_by IS 'Profile ID of who deregistered the enrollment (student or admin)';
COMMENT ON COLUMN enrollments.deregistration_reason IS 'Reason provided for deregistration';

-- Create a view for easy querying of deregistered units with all relevant information
CREATE OR REPLACE VIEW deregistered_units_view AS
SELECT 
  e.id as enrollment_id,
  e.student_id,
  s.student_number,
  s.first_name,
  s.last_name,
  s.email,
  s.phone,
  s.status as student_status,
  s.intake_id,
  i.name as intake_name,
  i.code as intake_code,
  s.program_id,
  p.name as program_name,
  p.code as program_code,
  e.course_id,
  c.code as course_code,
  c.name as course_name,
  c.credits,
  c.instructor_id,
  prof.full_name as instructor_name,
  e.term_id,
  t.name as term_name,
  t.code as term_code,
  e.enrolled_at,
  e.deregistered_at,
  e.deregistered_by,
  deregistrator.full_name as deregistered_by_name,
  e.deregistration_reason,
  e.status,
  e.grade,
  e.score
FROM enrollments e
JOIN students s ON e.student_id = s.id
LEFT JOIN intakes i ON s.intake_id = i.id
LEFT JOIN programs p ON s.program_id = p.id
JOIN courses c ON e.course_id = c.id
LEFT JOIN profiles prof ON c.instructor_id = prof.id
JOIN academic_terms t ON e.term_id = t.id
LEFT JOIN profiles deregistrator ON e.deregistered_by = deregistrator.id
WHERE e.status = 'deregistered';

-- Add comment for the view
COMMENT ON VIEW deregistered_units_view IS 'View of all deregistered units with complete student, course, and deregistration information';

-- Create a function to get deregistered units with filtering
CREATE OR REPLACE FUNCTION get_deregistered_units(
  p_search TEXT DEFAULT NULL,
  p_program_id UUID DEFAULT NULL,
  p_intake_id UUID DEFAULT NULL,
  p_term_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  enrollment_id UUID,
  student_id UUID,
  student_number TEXT,
  student_name TEXT,
  student_email TEXT,
  student_phone TEXT,
  student_status student_status,
  intake_id UUID,
  intake_name TEXT,
  intake_code TEXT,
  program_id UUID,
  program_name TEXT,
  program_code TEXT,
  course_id UUID,
  course_code TEXT,
  course_name TEXT,
  course_credits INTEGER,
  instructor_id UUID,
  instructor_name TEXT,
  term_id UUID,
  term_name TEXT,
  term_code TEXT,
  enrolled_at TIMESTAMPTZ,
  deregistered_at TIMESTAMPTZ,
  deregistered_by UUID,
  deregistered_by_name TEXT,
  deregistration_reason TEXT,
  status enrollment_status,
  grade TEXT,
  score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as enrollment_id,
    e.student_id,
    s.student_number,
    s.first_name || ' ' || s.last_name as student_name,
    s.email as student_email,
    s.phone as student_phone,
    s.status as student_status,
    s.intake_id,
    i.name as intake_name,
    i.code as intake_code,
    s.program_id,
    p.name as program_name,
    p.code as program_code,
    e.course_id,
    c.code as course_code,
    c.name as course_name,
    c.credits as course_credits,
    c.instructor_id,
    prof.full_name as instructor_name,
    e.term_id,
    t.name as term_name,
    t.code as term_code,
    e.enrolled_at,
    e.deregistered_at,
    e.deregistered_by,
    deregistrator.full_name as deregistered_by_name,
    e.deregistration_reason,
    e.status,
    e.grade,
    e.score
  FROM enrollments e
  JOIN students s ON e.student_id = s.id
  LEFT JOIN intakes i ON s.intake_id = i.id
  LEFT JOIN programs p ON s.program_id = p.id
  JOIN courses c ON e.course_id = c.id
  LEFT JOIN profiles prof ON c.instructor_id = prof.id
  JOIN academic_terms t ON e.term_id = t.id
  LEFT JOIN profiles deregistrator ON e.deregistered_by = deregistrator.id
  WHERE e.status = 'deregistered'
    AND (p_search IS NULL OR 
        s.student_number ILIKE '%' || p_search || '%' OR
        s.first_name ILIKE '%' || p_search || '%' OR
        s.last_name ILIKE '%' || p_search || '%' OR
        s.email ILIKE '%' || p_search || '%')
    AND (p_program_id IS NULL OR s.program_id = p_program_id)
    AND (p_intake_id IS NULL OR s.intake_id = p_intake_id)
    AND (p_term_id IS NULL OR e.term_id = p_term_id)
    AND (p_course_id IS NULL OR e.course_id = p_course_id)
    AND (p_date_from IS NULL OR e.deregistered_at >= p_date_from)
    AND (p_date_to IS NULL OR e.deregistered_at <= p_date_to + INTERVAL '1 day')
  ORDER BY e.deregistered_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission on the function
REVOKE ALL ON FUNCTION public.get_deregistered_units FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_deregistered_units TO authenticated;

-- Add comment for the function
COMMENT ON FUNCTION public.get_deregistered_units IS 'Get deregistered units with optional filtering by search, program, intake, term, course, and date range';

-- Create a function to count deregistered units for pagination
CREATE OR REPLACE FUNCTION count_deregistered_units(
  p_search TEXT DEFAULT NULL,
  p_program_id UUID DEFAULT NULL,
  p_intake_id UUID DEFAULT NULL,
  p_term_id UUID DEFAULT NULL,
  p_course_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM enrollments e
  JOIN students s ON e.student_id = s.id
  WHERE e.status = 'deregistered'
    AND (p_search IS NULL OR 
        s.student_number ILIKE '%' || p_search || '%' OR
        s.first_name ILIKE '%' || p_search || '%' OR
        s.last_name ILIKE '%' || p_search || '%' OR
        s.email ILIKE '%' || p_search || '%')
    AND (p_program_id IS NULL OR s.program_id = p_program_id)
    AND (p_intake_id IS NULL OR s.intake_id = p_intake_id)
    AND (p_term_id IS NULL OR e.term_id = p_term_id)
    AND (p_course_id IS NULL OR e.course_id = p_course_id)
    AND (p_date_from IS NULL OR e.deregistered_at >= p_date_from)
    AND (p_date_to IS NULL OR e.deregistered_at <= p_date_to + INTERVAL '1 day');
  
  RETURN v_count;
END;
$$;

-- Grant execute permission on the count function
REVOKE ALL ON FUNCTION public.count_deregistered_units FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_deregistered_units TO authenticated;

-- Add comment for the count function
COMMENT ON FUNCTION public.count_deregistered_units IS 'Count deregistered units with the same filtering options as get_deregistered_units';
