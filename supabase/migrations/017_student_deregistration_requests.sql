-- Students request unit deregistration or full withdrawal; staff/admin approve or reject

CREATE TYPE public.deregistration_request_type AS ENUM ('units', 'full_withdrawal');
CREATE TYPE public.deregistration_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS public.student_deregistration_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  request_type public.deregistration_request_type NOT NULL DEFAULT 'units',
  course_ids UUID[] NOT NULL DEFAULT '{}',
  reason TEXT NOT NULL,
  status public.deregistration_request_status NOT NULL DEFAULT 'pending',
  review_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS student_deregistration_requests_student_idx
  ON public.student_deregistration_requests(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS student_deregistration_requests_status_idx
  ON public.student_deregistration_requests(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS student_deregistration_one_pending_per_student
  ON public.student_deregistration_requests(student_id)
  WHERE status = 'pending';

CREATE TRIGGER student_deregistration_requests_updated_at
  BEFORE UPDATE ON public.student_deregistration_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.student_deregistration_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_deregistration_requests'
      AND policyname = 'Students view own deregistration requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students view own deregistration requests"
      ON public.student_deregistration_requests
      FOR SELECT
      TO authenticated
      USING (
        is_student()
        AND EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_id AND s.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_deregistration_requests'
      AND policyname = 'Students create own deregistration requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students create own deregistration requests"
      ON public.student_deregistration_requests
      FOR INSERT
      TO authenticated
      WITH CHECK (
        is_student()
        AND EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_id AND s.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_deregistration_requests'
      AND policyname = 'Students cancel own pending deregistration requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Students cancel own pending deregistration requests"
      ON public.student_deregistration_requests
      FOR UPDATE
      TO authenticated
      USING (
        is_student()
        AND status = 'pending'
        AND EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_id AND s.profile_id = auth.uid()
        )
      )
      WITH CHECK (
        is_student()
        AND status = 'cancelled'
        AND EXISTS (
          SELECT 1 FROM public.students s
          WHERE s.id = student_id AND s.profile_id = auth.uid()
        )
      )
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'student_deregistration_requests'
      AND policyname = 'Staff manage deregistration requests'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff manage deregistration requests"
      ON public.student_deregistration_requests
      FOR ALL
      USING (is_staff_or_admin())
      WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;
END $$;
