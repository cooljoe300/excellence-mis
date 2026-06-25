-- Allow students to self-register their own student record
-- Requirements:
-- - Students can INSERT one student row linked to their auth user (profile_id = auth.uid()).
-- - Students can UPDATE their own student record.
-- - Students should not be able to modify LMS sync fields.

-- Helper: check if current user is a student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Students can insert their own record
CREATE POLICY IF NOT EXISTS "Students can self register" ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  is_student()
  AND profile_id = auth.uid()
);

-- Students can update their own record (excluding LMS/admin fields enforced by app; RLS ensures row ownership)
CREATE POLICY IF NOT EXISTS "Students can update own record" ON public.students
FOR UPDATE
TO authenticated
USING (is_student() AND profile_id = auth.uid())
WITH CHECK (is_student() AND profile_id = auth.uid());

