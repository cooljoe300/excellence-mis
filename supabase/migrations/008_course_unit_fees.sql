-- Per-unit (course) fees and student self-enrollment billing

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS unit_fee DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Set default unit fees for existing courses
UPDATE public.courses SET unit_fee = 18000.00 WHERE code LIKE 'CS%' AND unit_fee = 0;
UPDATE public.courses SET unit_fee = 15000.00 WHERE code LIKE 'BA%' AND unit_fee = 0;

CREATE TABLE IF NOT EXISTS public.fee_payment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_payment_id UUID NOT NULL REFERENCES public.fee_payments(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fee_payment_items ENABLE ROW LEVEL SECURITY;

-- Students can enroll in courses for their own student record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enrollments' AND policyname = 'Students can enroll own courses'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can enroll own courses" ON public.enrollments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_student()
        AND EXISTS (
          SELECT 1 FROM public.students
          WHERE students.id = student_id AND students.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'enrollments' AND policyname = 'Students can drop own enrollments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can drop own enrollments" ON public.enrollments
      FOR DELETE
      TO authenticated
      USING (
        is_student()
        AND grade IS NULL
        AND score IS NULL
        AND EXISTS (
          SELECT 1 FROM public.students
          WHERE students.id = student_id AND students.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_payments' AND policyname = 'Students can create own fees'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can create own fees" ON public.fee_payments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_student()
        AND EXISTS (
          SELECT 1 FROM public.students
          WHERE students.id = student_id AND students.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_payment_items' AND policyname = 'Students can create own fee items'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can create own fee items" ON public.fee_payment_items
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_student()
        AND EXISTS (
          SELECT 1 FROM public.fee_payments fp
          JOIN public.students s ON s.id = fp.student_id
          WHERE fp.id = fee_payment_id AND s.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_payment_items' AND policyname = 'Students can view own fee items'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students can view own fee items" ON public.fee_payment_items
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.fee_payments fp
          JOIN public.students s ON s.id = fp.student_id
          WHERE fp.id = fee_payment_id AND s.profile_id = auth.uid()
        )
        OR is_staff_or_admin()
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fee_payment_items' AND policyname = 'Staff manage fee items'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff manage fee items" ON public.fee_payment_items
      FOR ALL
      USING (is_staff_or_admin())
      WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;
END $$;
