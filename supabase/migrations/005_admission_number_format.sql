-- Configurable admission number format
-- Default: ADM-{YYYY}-{SEQ4}

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access (requires is_admin() from 004_super_admin_policies.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'Admin manage settings'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin manage settings" ON public.system_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
END $$;

INSERT INTO public.system_settings(key, value)
VALUES ('admission_number_format', 'ADM-{YYYY}-{SEQ4}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admission_counters (
  year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admission_counters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'admission_counters' AND policyname = 'Admin manage counters'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin manage counters" ON public.admission_counters FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.next_admission_seq(p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO public.admission_counters(year, last_value)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_value = public.admission_counters.last_value + 1,
        updated_at = NOW()
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

ALTER FUNCTION public.next_admission_seq(integer) SET search_path = public;

-- Replace generator to use configurable format.
-- Supported tokens:
-- - {YYYY} current year (e.g. 2026)
-- - {YY} last 2 digits (e.g. 26)
-- - {SEQ} sequence number (no padding)
-- - {SEQ4} sequence number padded to 4 digits
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year_int integer;
  v_year text;
  v_yy text;
  v_seq integer;
  v_format text;
  v_number text;
BEGIN
  v_year_int := EXTRACT(YEAR FROM NOW())::integer;
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_yy := TO_CHAR(NOW(), 'YY');

  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    SELECT value INTO v_format
    FROM public.system_settings
    WHERE key = 'admission_number_format';

    IF v_format IS NULL OR btrim(v_format) = '' THEN
      v_format := 'ADM-{YYYY}-{SEQ4}';
    END IF;

    v_seq := public.next_admission_seq(v_year_int);

    v_number := v_format;
    v_number := replace(v_number, '{YYYY}', v_year);
    v_number := replace(v_number, '{YY}', v_yy);
    v_number := replace(v_number, '{SEQ4}', lpad(v_seq::text, 4, '0'));
    v_number := replace(v_number, '{SEQ}', v_seq::text);

    NEW.admission_number := v_number;
    NEW.student_number := v_number;
  END IF;

  IF NEW.student_number IS NULL OR NEW.student_number = '' THEN
    NEW.student_number := NEW.admission_number;
  END IF;

  IF NEW.id_card_issued_at IS NULL THEN
    NEW.id_card_issued_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION public.generate_admission_number() SET search_path = public;

