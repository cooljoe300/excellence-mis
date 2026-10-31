-- 058_student_intakes_backfill.sql
--
-- Fix empty Intake(s) on the Students list.
--
-- The list reads the student_intakes junction table. Self-registered students
-- never get junction rows because:
--   * the self-registration form has no intake picker, so students.intake_id
--     stays NULL, and
--   * the junction table's RLS policy only allows staff/admin inserts, so the
--     student portal cannot create the row itself.
--
-- This migration:
--   1. backfills junction rows from the legacy students.intake_id column
--   2. assigns students with no intake at all to the current active intake
--   3. installs a SECURITY DEFINER trigger so students.intake_id and the
--      junction table stay in sync for every future insert/update, including
--      rows written by student sessions that the junction RLS would block

-- ---------------------------------------------------------------------------
-- 1. Backfill junction rows from the legacy column (missing pairs only)
-- ---------------------------------------------------------------------------

INSERT INTO public.student_intakes (student_id, intake_id, is_primary, enrollment_date, status)
SELECT
  s.id,
  s.intake_id,
  NOT EXISTS (
    SELECT 1
    FROM public.student_intakes si
    WHERE si.student_id = s.id AND si.is_primary = TRUE
  ),
  COALESCE(s.enrollment_date, CURRENT_DATE),
  s.status
FROM public.students s
WHERE s.intake_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.student_intakes si
    WHERE si.student_id = s.id AND si.intake_id = s.intake_id
  )
ON CONFLICT (student_id, intake_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Assign students with no intake to the current active intake
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_intake_id UUID;
BEGIN
  -- Prefer the intake flagged current; otherwise the most recently started
  -- active intake. If there is no active intake, leave students unassigned.
  SELECT id INTO v_intake_id
  FROM public.intakes
  WHERE is_active = TRUE
  ORDER BY is_current DESC, start_date DESC
  LIMIT 1;

  IF v_intake_id IS NULL THEN
    RAISE NOTICE 'No active intake found; students were not assigned intakes.';
    RETURN;
  END IF;

  INSERT INTO public.student_intakes (student_id, intake_id, is_primary, enrollment_date, status)
  SELECT s.id, v_intake_id, TRUE, COALESCE(s.enrollment_date, CURRENT_DATE), s.status
  FROM public.students s
  WHERE s.intake_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.student_intakes si WHERE si.student_id = s.id
    )
  ON CONFLICT (student_id, intake_id) DO NOTHING;

  RAISE NOTICE 'Assigned students without an intake to the current intake.';
END $$;

-- Keep the legacy column in sync with the junction table for any student
-- whose junction rows exist but whose legacy intake_id is still NULL.
UPDATE public.students s
SET intake_id = (
  SELECT si.intake_id
  FROM public.student_intakes si
  WHERE si.student_id = s.id
  ORDER BY si.is_primary DESC, si.created_at DESC
  LIMIT 1
)
WHERE s.intake_id IS NULL
  AND EXISTS (SELECT 1 FROM public.student_intakes si WHERE si.student_id = s.id);

-- ---------------------------------------------------------------------------
-- 3. Keep the junction table in sync from now on
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_student_intake_junction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.intake_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only one primary intake per student.
  UPDATE public.student_intakes
  SET is_primary = FALSE
  WHERE student_id = NEW.id
    AND is_primary = TRUE
    AND intake_id <> NEW.intake_id;

  INSERT INTO public.student_intakes (student_id, intake_id, is_primary, enrollment_date, status)
  VALUES (NEW.id, NEW.intake_id, TRUE, COALESCE(NEW.enrollment_date, CURRENT_DATE), NEW.status)
  ON CONFLICT (student_id, intake_id) DO UPDATE
    SET is_primary = TRUE;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sync_student_intake_junction ON public.students;
CREATE TRIGGER sync_student_intake_junction
  AFTER INSERT OR UPDATE OF intake_id ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_intake_junction();

-- ---------------------------------------------------------------------------
-- Verification: both queries should return zero rows.
-- ---------------------------------------------------------------------------

-- Students with an intake in the legacy column but no matching junction row.
SELECT s.id, s.admission_number, s.student_number, s.intake_id
FROM public.students s
WHERE s.intake_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.student_intakes si
    WHERE si.student_id = s.id AND si.intake_id = s.intake_id
  );

-- Students with a junction row but a mismatched (or empty) legacy column.
SELECT s.id, s.admission_number, s.student_number, s.intake_id
FROM public.students s
WHERE s.intake_id IS NULL
  AND EXISTS (SELECT 1 FROM public.student_intakes si WHERE si.student_id = s.id);
