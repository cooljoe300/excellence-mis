-- Super Admin: ensure admin can manage everything via RLS

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Admin full access policies (keeps existing policies intact)
DO $$
BEGIN
  -- profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.profiles FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- academic_terms
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'academic_terms' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.academic_terms FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- programs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'programs' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.programs FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- courses
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'courses' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.courses FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- students
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'students' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.students FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- enrollments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'enrollments' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.enrollments FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- attendance
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'attendance' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.attendance FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;

  -- fee_payments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fee_payments' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin full access" ON public.fee_payments FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
END $$;

