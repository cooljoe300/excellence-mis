-- Program-based admission numbers: EOC/{CODE}/{SEQ3}/{YY}
-- {CODE} comes from programs.admission_prefix (falls back to programs.code)

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS admission_prefix TEXT;

UPDATE public.programs
SET admission_prefix = upper(btrim(code))
WHERE admission_prefix IS NULL OR btrim(admission_prefix) = '';

-- EOC programs (upsert by code)
INSERT INTO public.programs (name, code, admission_prefix, description, duration_months, tuition_fee)
VALUES
  (
    'Certificate in Financial Accounting',
    'CIFA',
    'CIFA',
    'Certificate in Financial Accounting (CIFA).',
    12,
    0
  ),
  (
    'CPA Foundation Level',
    'CPA-FDN',
    'CPAF',
    'CPA Foundation Level.',
    12,
    0
  ),
  (
    'CPA Intermediate Level',
    'CPA-INT',
    'CPAI',
    'CPA Intermediate Level.',
    12,
    0
  )
ON CONFLICT (code) DO UPDATE SET
  admission_prefix = EXCLUDED.admission_prefix,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Per-program, per-year sequence counters
DROP TABLE IF EXISTS public.admission_counters;

CREATE TABLE public.admission_counters (
  prefix TEXT NOT NULL,
  year INTEGER NOT NULL,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (prefix, year)
);

ALTER TABLE public.admission_counters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admission_counters'
      AND policyname = 'Admin manage counters'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin manage counters" ON public.admission_counters FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.next_admission_seq(p_prefix text, p_year integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
  v_prefix text;
BEGIN
  v_prefix := upper(btrim(p_prefix));
  IF v_prefix IS NULL OR v_prefix = '' THEN
    v_prefix := 'GEN';
  END IF;

  INSERT INTO public.admission_counters(prefix, year, last_value)
  VALUES (v_prefix, p_year, 1)
  ON CONFLICT (prefix, year) DO UPDATE
    SET last_value = public.admission_counters.last_value + 1,
        updated_at = NOW()
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

ALTER FUNCTION public.next_admission_seq(text, integer) SET search_path = public;

-- Drop old single-argument overload if present
DROP FUNCTION IF EXISTS public.next_admission_seq(integer);

-- Default format template (admin can edit in Settings)
INSERT INTO public.system_settings(key, value)
VALUES ('admission_number_format', 'EOC/{CODE}/{SEQ3}/{YY}')
ON CONFLICT (key) DO NOTHING;

UPDATE public.system_settings
SET value = 'EOC/{CODE}/{SEQ3}/{YY}', updated_at = NOW()
WHERE key = 'admission_number_format'
  AND value = 'ADM-{YYYY}-{SEQ4}';

CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year_int integer;
  v_year text;
  v_yy text;
  v_seq integer;
  v_format text;
  v_number text;
  v_code text;
BEGIN
  v_year_int := EXTRACT(YEAR FROM NOW())::integer;
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_yy := TO_CHAR(NOW(), 'YY');

  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    SELECT value INTO v_format
    FROM public.system_settings
    WHERE key = 'admission_number_format';

    IF v_format IS NULL OR btrim(v_format) = '' THEN
      v_format := 'EOC/{CODE}/{SEQ3}/{YY}';
    END IF;

    v_code := NULL;
    IF NEW.program_id IS NOT NULL THEN
      SELECT upper(COALESCE(NULLIF(btrim(admission_prefix), ''), NULLIF(btrim(code), '')))
      INTO v_code
      FROM public.programs
      WHERE id = NEW.program_id;
    END IF;

    IF v_code IS NULL OR v_code = '' THEN
      v_code := 'GEN';
    END IF;

    v_seq := public.next_admission_seq(v_code, v_year_int);

    v_number := v_format;
    v_number := replace(v_number, '{YYYY}', v_year);
    v_number := replace(v_number, '{YY}', v_yy);
    v_number := replace(v_number, '{CODE}', v_code);
    v_number := replace(v_number, '{SEQ4}', lpad(v_seq::text, 4, '0'));
    v_number := replace(v_number, '{SEQ3}', lpad(v_seq::text, 3, '0'));
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
