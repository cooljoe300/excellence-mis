-- Create student_intakes junction table to support multiple intakes per student
-- This fixes the duplicate student issue where the same student appears multiple times
-- due to having records in different intakes

-- Create junction table
CREATE TABLE IF NOT EXISTS public.student_intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status student_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, intake_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_intakes_student_id ON public.student_intakes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_intakes_intake_id ON public.student_intakes(intake_id);
CREATE INDEX IF NOT EXISTS idx_student_intakes_is_primary ON public.student_intakes(is_primary);

-- Enable RLS
ALTER TABLE public.student_intakes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_intakes' AND policyname = 'Authenticated users can view student intakes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can view student intakes" ON public.student_intakes
      FOR SELECT TO authenticated USING (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_intakes' AND policyname = 'Staff can manage student intakes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff can manage student intakes" ON public.student_intakes
      FOR ALL USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_intakes' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin full access" ON public.student_intakes
      FOR ALL USING (is_admin()) WITH CHECK (is_admin())
    $policy$;
  END IF;
END $$;

-- Migrate existing intake_id data from students table to student_intakes
-- This preserves all existing intake associations
INSERT INTO public.student_intakes (student_id, intake_id, is_primary, enrollment_date, status)
SELECT 
  id as student_id, 
  intake_id, 
  TRUE as is_primary,  -- Mark existing intake as primary
  enrollment_date,
  status
FROM public.students
WHERE intake_id IS NOT NULL
ON CONFLICT (student_id, intake_id) DO NOTHING;

-- After migration, we can optionally drop the intake_id column from students
-- For now, we'll keep it for backward compatibility and mark it as deprecated
COMMENT ON COLUMN public.students.intake_id IS 'DEPRECATED: Use student_intakes junction table instead. This column is kept for backward compatibility.';

COMMENT ON TABLE public.student_intakes IS 'Junction table allowing students to have multiple intakes. Each student can be enrolled in multiple intakes with different enrollment dates and statuses.';
