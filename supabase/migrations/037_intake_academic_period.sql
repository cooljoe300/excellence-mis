-- Link intakes to academic terms and keep academic_year populated so
-- timetable entries can resolve Programme → Intake → Academic Period every time.

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL;

UPDATE public.intakes
SET academic_year = EXTRACT(YEAR FROM start_date)::TEXT || '/' || (EXTRACT(YEAR FROM start_date) + 1)::TEXT
WHERE academic_year IS NULL OR btrim(academic_year) = '';

UPDATE public.intakes AS i
SET term_id = matched.term_id
FROM (
  SELECT DISTINCT ON (i2.id)
    i2.id AS intake_id,
    t.id AS term_id
  FROM public.intakes i2
  INNER JOIN public.academic_terms t
    ON i2.start_date BETWEEN t.start_date AND t.end_date
  ORDER BY i2.id, t.is_current DESC, t.start_date DESC
) AS matched
WHERE i.id = matched.intake_id
  AND i.term_id IS NULL;

CREATE INDEX IF NOT EXISTS intakes_term_id_idx ON public.intakes (term_id);

COMMENT ON COLUMN public.intakes.academic_year IS 'Academic year (e.g. 2026/2027) associated with this intake';
COMMENT ON COLUMN public.intakes.term_id IS 'Academic term/period associated with this intake';
