-- Intakes (admission cohorts e.g. September 2022)

CREATE TABLE IF NOT EXISTS public.intakes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL;

ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'intakes' AND policyname = 'Authenticated users can view intakes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can view intakes" ON public.intakes
      FOR SELECT TO authenticated USING (true)
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'intakes' AND policyname = 'Staff can manage intakes'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Staff can manage intakes" ON public.intakes
      FOR ALL USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin())
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'intakes' AND policyname = 'Admin full access'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Admin full access" ON public.intakes
      FOR ALL USING (is_admin()) WITH CHECK (is_admin())
    $policy$;
  END IF;
END $$;
