-- ============================================================================
-- 055: Configuration-driven Programme Enrollment / Programme Change
--
-- Adds:
--   1. Programme-level admission-number + study-mode configuration
--   2. Programme -> Curriculum -> Academic Year/Version -> Semester -> Units
--   3. Student curriculum / semester / study mode / academic year fields
--   4. Programme change history
--   5. A single reusable admission-number builder (format -> number)
--   6. Atomic, transactional programme-change RPCs
--   7. Guards so programme / admission-number edits cannot bypass the workflow
--   8. RLS for the new tables
--
-- Nothing in this migration hard-codes a programme name, code, prefix, unit
-- list or semester. Everything is driven by rows in programs,
-- programme_curricula and curriculum_units.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Programme configuration columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS admission_number_format TEXT,
  ADD COLUMN IF NOT EXISTS admission_sequence_start INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS study_modes TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS campus TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'programs_admission_sequence_start_check'
  ) THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT programs_admission_sequence_start_check
      CHECK (admission_sequence_start >= 1);
  END IF;
END $$;

COMMENT ON COLUMN public.programs.admission_number_format IS
  'Optional per-programme admission number template. Falls back to system_settings.admission_number_format.';
COMMENT ON COLUMN public.programs.admission_sequence_start IS
  'First sequence value used for a brand new programme/year counter.';
COMMENT ON COLUMN public.programs.study_modes IS
  'Supported study modes for this programme, e.g. {Full-time,Part-time}.';
COMMENT ON COLUMN public.programs.campus IS
  'Optional campus / centre label available to the {CAMPUS} admission token.';

-- ---------------------------------------------------------------------------
-- 2. Curriculum structure
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.programme_curricula (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from DATE,
  effective_to DATE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT programme_curricula_unique_version UNIQUE (program_id, academic_year, version)
);

CREATE INDEX IF NOT EXISTS idx_programme_curricula_program
  ON public.programme_curricula(program_id);
CREATE INDEX IF NOT EXISTS idx_programme_curricula_active
  ON public.programme_curricula(program_id, is_active);

COMMENT ON TABLE public.programme_curricula IS
  'A curriculum/version for a programme and academic year. Units are attached per semester.';

CREATE TABLE IF NOT EXISTS public.curriculum_units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  curriculum_id UUID NOT NULL REFERENCES public.programme_curricula(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT curriculum_units_unique_unit UNIQUE (curriculum_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_units_curriculum
  ON public.curriculum_units(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_units_semester
  ON public.curriculum_units(curriculum_id, semester);

COMMENT ON TABLE public.curriculum_units IS
  'Units that belong to a curriculum for a given semester.';

-- A unit may only be placed in a curriculum of its own programme.
CREATE OR REPLACE FUNCTION public.validate_curriculum_unit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_curriculum_program UUID;
  v_course_program UUID;
  v_course_code TEXT;
BEGIN
  SELECT program_id INTO v_curriculum_program
  FROM public.programme_curricula
  WHERE id = NEW.curriculum_id;

  IF v_curriculum_program IS NULL THEN
    RAISE EXCEPTION 'The selected curriculum does not exist.';
  END IF;

  SELECT program_id, code INTO v_course_program, v_course_code
  FROM public.courses
  WHERE id = NEW.course_id;

  IF v_course_program IS NOT NULL AND v_course_program <> v_curriculum_program THEN
    RAISE EXCEPTION
      'Unit % belongs to a different programme and cannot be added to this curriculum.',
      COALESCE(v_course_code, NEW.course_id::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_curriculum_unit ON public.curriculum_units;
CREATE TRIGGER validate_curriculum_unit
  BEFORE INSERT OR UPDATE OF curriculum_id, course_id
  ON public.curriculum_units
  FOR EACH ROW EXECUTE FUNCTION public.validate_curriculum_unit();

-- ---------------------------------------------------------------------------
-- 3. Student programme / curriculum state
-- ---------------------------------------------------------------------------

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS curriculum_id UUID REFERENCES public.programme_curricula(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_semester SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS study_mode TEXT,
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'students_current_semester_check'
  ) THEN
    ALTER TABLE public.students
      ADD CONSTRAINT students_current_semester_check
      CHECK (current_semester BETWEEN 1 AND 20);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_students_curriculum ON public.students(curriculum_id);

COMMENT ON COLUMN public.students.curriculum_id IS
  'Pinned curriculum used to resolve available units for this student.';
COMMENT ON COLUMN public.students.current_semester IS
  'Semester the student is currently registered in for the pinned curriculum.';

-- ---------------------------------------------------------------------------
-- 4. Programme change history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.programme_change_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  previous_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  new_program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  previous_program_code TEXT,
  previous_program_name TEXT,
  new_program_code TEXT,
  new_program_name TEXT,
  previous_admission_number TEXT,
  new_admission_number TEXT,
  previous_intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  new_intake_id UUID REFERENCES public.intakes(id) ON DELETE SET NULL,
  previous_intake_name TEXT,
  new_intake_name TEXT,
  previous_study_mode TEXT,
  new_study_mode TEXT,
  previous_curriculum_id UUID REFERENCES public.programme_curricula(id) ON DELETE SET NULL,
  new_curriculum_id UUID REFERENCES public.programme_curricula(id) ON DELETE SET NULL,
  previous_curriculum_name TEXT,
  new_curriculum_name TEXT,
  previous_semester SMALLINT,
  new_semester SMALLINT,
  previous_academic_year TEXT,
  new_academic_year TEXT,
  reason TEXT NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_programme_change_history_student
  ON public.programme_change_history(student_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_programme_change_history_changed_by
  ON public.programme_change_history(changed_by, changed_at DESC);

COMMENT ON TABLE public.programme_change_history IS
  'Immutable audit trail of student programme changes, including snapshots of programme/intake names and admission numbers.';

-- ---------------------------------------------------------------------------
-- 5. Backfill: give every existing programme a default curriculum so current
--    students keep working exactly as before (all existing active courses in
--    semester 1). Nothing is deleted and no enrollment is touched.
-- ---------------------------------------------------------------------------

INSERT INTO public.programme_curricula (program_id, name, academic_year, version, is_active, effective_from)
SELECT
  p.id,
  p.name || ' Curriculum',
  COALESCE(
    (SELECT NULLIF(btrim(i.academic_year), '')
       FROM public.intakes i
      WHERE i.is_current = TRUE
      ORDER BY i.start_date DESC
      LIMIT 1),
    (SELECT NULLIF(btrim(i.academic_year), '')
       FROM public.students s
       JOIN public.intakes i ON i.id = s.intake_id
      WHERE s.program_id = p.id
      ORDER BY s.enrollment_date DESC
      LIMIT 1),
    to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY')
  ),
  'v1',
  TRUE,
  CURRENT_DATE
FROM public.programs p
WHERE NOT EXISTS (
  SELECT 1 FROM public.programme_curricula c WHERE c.program_id = p.id
);

INSERT INTO public.curriculum_units (curriculum_id, course_id, semester, is_active, sort_order)
SELECT
  c.id,
  co.id,
  1,
  TRUE,
  (row_number() OVER (PARTITION BY c.id ORDER BY co.code))::INTEGER
FROM public.programme_curricula c
JOIN public.courses co
  ON co.program_id = c.program_id
 AND co.is_active = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.curriculum_units cu
  WHERE cu.curriculum_id = c.id
    AND cu.course_id = co.id
);

UPDATE public.students s
SET curriculum_id = c.id
FROM public.programme_curricula c
WHERE s.curriculum_id IS NULL
  AND s.program_id = c.program_id
  AND c.is_active = TRUE
  AND c.id = (
    SELECT c2.id
    FROM public.programme_curricula c2
    WHERE c2.program_id = s.program_id
      AND c2.is_active = TRUE
    ORDER BY c2.effective_from DESC NULLS LAST,
             c2.academic_year DESC,
             c2.created_at DESC
    LIMIT 1
  );

UPDATE public.students s
SET academic_year = NULLIF(btrim(i.academic_year), '')
FROM public.intakes i
WHERE s.intake_id = i.id
  AND (s.academic_year IS NULL OR btrim(s.academic_year) = '')
  AND NULLIF(btrim(i.academic_year), '') IS NOT NULL;

UPDATE public.students
SET academic_year = to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY')
WHERE academic_year IS NULL OR btrim(academic_year) = '';

-- Keep the legacy students.intake_id column and the junction table in sync for
-- existing records. Historical rows are preserved.
INSERT INTO public.student_intakes (student_id, intake_id, is_primary, enrollment_date, status)
SELECT s.id, s.intake_id, TRUE, s.enrollment_date, s.status
FROM public.students s
WHERE s.intake_id IS NOT NULL
ON CONFLICT (student_id, intake_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Permissions helpers
-- ---------------------------------------------------------------------------

-- Existing helpers: is_admin() only covers 'admin' and is_staff_or_admin()
-- includes teachers. Programme enrollment is restricted to admin-level staff.
CREATE OR REPLACE FUNCTION public.can_manage_programme_enrollment()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('superadmin', 'admin', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students
    WHERE id = p_student_id
      AND profile_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. Admission number generation (configuration -> format -> number)
-- ---------------------------------------------------------------------------

-- 7a. Counter with an optional starting value for brand new programme/year
--     counters. Existing counters keep incrementing from their current value.
CREATE OR REPLACE FUNCTION public.next_admission_seq(
  p_prefix TEXT,
  p_year INTEGER,
  p_start INTEGER DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
  v_prefix TEXT;
  v_start INTEGER;
BEGIN
  v_prefix := upper(btrim(COALESCE(p_prefix, '')));
  IF v_prefix = '' THEN
    v_prefix := 'GEN';
  END IF;

  v_start := GREATEST(COALESCE(p_start, 1), 1);

  INSERT INTO public.admission_counters(prefix, year, last_value)
  VALUES (v_prefix, p_year, v_start)
  ON CONFLICT (prefix, year) DO UPDATE
    SET last_value = public.admission_counters.last_value + 1,
        updated_at = NOW()
  RETURNING last_value INTO v_next;

  RETURN v_next;
END;
$$;

ALTER FUNCTION public.next_admission_seq(TEXT, INTEGER, INTEGER) SET search_path = public;

-- 7b. Resolve the template for a programme.
CREATE OR REPLACE FUNCTION public.resolve_admission_number_format(p_program_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_format TEXT;
BEGIN
  IF p_program_id IS NULL THEN
    RAISE EXCEPTION 'A programme is required to resolve an admission number format.';
  END IF;

  SELECT NULLIF(btrim(admission_number_format), '')
    INTO v_format
  FROM public.programs
  WHERE id = p_program_id;

  IF v_format IS NULL THEN
    SELECT NULLIF(btrim(value), '')
      INTO v_format
    FROM public.system_settings
    WHERE key = 'admission_number_format';
  END IF;

  IF v_format IS NULL THEN
    RAISE EXCEPTION
      'No admission number format is configured for this programme. Set one on the programme or in Settings.';
  END IF;

  IF v_format !~* '\{SEQ(:[0-9]+)?\}|\{SEQ[0-9]+\}' THEN
    RAISE EXCEPTION
      'Admission number format "%" must include a sequence token such as {SEQ3}, {SEQ4} or {SEQ:5}.',
      v_format;
  END IF;

  RETURN v_format;
END;
$$;

-- 7c. Build one admission number from a template and resolved values.
CREATE OR REPLACE FUNCTION public.build_admission_number(
  p_format TEXT,
  p_code TEXT,
  p_year INTEGER,
  p_academic_year TEXT,
  p_intake TEXT,
  p_study_mode TEXT,
  p_campus TEXT,
  p_sequence INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result TEXT;
  v_seq INTEGER;
  i INTEGER;
  v_unknown TEXT;
BEGIN
  IF p_format IS NULL OR btrim(p_format) = '' THEN
    RAISE EXCEPTION 'No admission number format is configured.';
  END IF;

  IF p_format !~* '\{SEQ(:[0-9]+)?\}|\{SEQ[0-9]+\}' THEN
    RAISE EXCEPTION
      'Admission number format "%" must include a sequence token such as {SEQ3}, {SEQ4} or {SEQ:5}.',
      p_format;
  END IF;

  v_seq := GREATEST(COALESCE(p_sequence, 1), 1);
  v_result := p_format;

  -- Flexible {SEQ:n} token, padded to n digits.
  FOR i IN 1..10 LOOP
    v_result := regexp_replace(
      v_result,
      '\{SEQ:' || i || '\}',
      lpad(v_seq::TEXT, i, '0'),
      'gi'
    );
  END LOOP;

  IF v_result ILIKE '%{CODE}%' AND NULLIF(btrim(COALESCE(p_code, '')), '') IS NULL THEN
    RAISE EXCEPTION
      'The admission number format uses {CODE}, but this programme has no code or admission prefix.';
  END IF;
  IF v_result ILIKE '%{INTAKE}%' AND NULLIF(btrim(COALESCE(p_intake, '')), '') IS NULL THEN
    RAISE EXCEPTION
      'The admission number format uses {INTAKE}, but no intake was selected for this enrollment.';
  END IF;
  IF v_result ILIKE '%{MODE}%' AND NULLIF(btrim(COALESCE(p_study_mode, '')), '') IS NULL THEN
    RAISE EXCEPTION
      'The admission number format uses {MODE}, but no study mode was selected.';
  END IF;
  IF v_result ILIKE '%{CAMPUS}%' AND NULLIF(btrim(COALESCE(p_campus, '')), '') IS NULL THEN
    RAISE EXCEPTION
      'The admission number format uses {CAMPUS}, but this programme has no campus configured.';
  END IF;

  v_result := replace(v_result, '{CODE}', upper(btrim(COALESCE(p_code, ''))));
  v_result := replace(v_result, '{YYYY}', p_year::TEXT);
  v_result := replace(v_result, '{YY}', right(p_year::TEXT, 2));
  v_result := replace(v_result, '{AY}', COALESCE(p_academic_year, ''));
  v_result := replace(v_result, '{INTAKE}', COALESCE(p_intake, ''));
  v_result := replace(v_result, '{MODE}', COALESCE(p_study_mode, ''));
  v_result := replace(v_result, '{CAMPUS}', COALESCE(p_campus, ''));
  v_result := replace(v_result, '{SEQ4}', lpad(v_seq::TEXT, 4, '0'));
  v_result := replace(v_result, '{SEQ3}', lpad(v_seq::TEXT, 3, '0'));
  v_result := replace(v_result, '{SEQ}', v_seq::TEXT);

  v_unknown := substring(v_result FROM '\{[A-Za-z0-9:_-]+\}');
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION
      'Admission number format contains an unsupported token: %', v_unknown;
  END IF;

  RETURN btrim(v_result);
END;
$$;

-- 7d. Generate the next unique number for a programme, retrying on collisions
--     caused by legacy numbers that predate the counter table.
CREATE OR REPLACE FUNCTION public.generate_unique_admission_number(
  p_program_id UUID,
  p_intake_id UUID DEFAULT NULL,
  p_study_mode TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program public.programs%ROWTYPE;
  v_intake public.intakes%ROWTYPE;
  v_format TEXT;
  v_code TEXT;
  v_academic_year TEXT;
  v_intake_name TEXT;
  v_campus TEXT;
  v_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_start INTEGER;
  v_sequence INTEGER;
  v_candidate TEXT;
  v_attempt INTEGER := 0;
BEGIN
  IF p_program_id IS NULL THEN
    RAISE EXCEPTION 'A programme is required to generate an admission number.';
  END IF;

  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF v_program.id IS NULL THEN
    RAISE EXCEPTION 'The selected programme does not exist.';
  END IF;
  IF v_program.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Programme "%" is inactive; an admission number cannot be generated.', v_program.name;
  END IF;

  IF p_intake_id IS NOT NULL THEN
    SELECT * INTO v_intake FROM public.intakes WHERE id = p_intake_id;
    IF v_intake.id IS NULL THEN
      RAISE EXCEPTION 'The selected intake does not exist.';
    END IF;
  END IF;

  v_format := public.resolve_admission_number_format(p_program_id);
  v_code := COALESCE(
    NULLIF(upper(btrim(v_program.admission_prefix)), ''),
    NULLIF(upper(btrim(v_program.code)), '')
  );
  v_academic_year := COALESCE(
    NULLIF(btrim(v_intake.academic_year), ''),
    to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY')
  );
  v_intake_name := NULLIF(btrim(v_intake.name), '');
  v_campus := NULLIF(btrim(COALESCE(v_program.campus, '')), '');
  v_start := GREATEST(COALESCE(v_program.admission_sequence_start, 1), 1);

  LOOP
    v_attempt := v_attempt + 1;
    v_sequence := public.next_admission_seq(COALESCE(v_code, 'GEN'), v_year, v_start);
    v_candidate := public.build_admission_number(
      v_format, v_code, v_year, v_academic_year,
      v_intake_name, p_study_mode, v_campus, v_sequence
    );

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.students WHERE admission_number = v_candidate
    );

    IF v_attempt >= 500 THEN
      RAISE EXCEPTION
        'Unable to generate a unique admission number for programme "%" after % attempts. Check the programme admission format and sequence.',
        v_program.name, v_attempt;
    END IF;
  END LOOP;

  RETURN v_candidate;
END;
$$;

-- 7e. Preview the next number without consuming a sequence value.
CREATE OR REPLACE FUNCTION public.preview_unique_admission_number(
  p_program_id UUID,
  p_intake_id UUID DEFAULT NULL,
  p_study_mode TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_program public.programs%ROWTYPE;
  v_intake public.intakes%ROWTYPE;
  v_format TEXT;
  v_code TEXT;
  v_academic_year TEXT;
  v_intake_name TEXT;
  v_campus TEXT;
  v_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_start INTEGER;
  v_last INTEGER;
  v_sequence INTEGER;
  v_candidate TEXT;
  v_attempt INTEGER := 0;
BEGIN
  IF p_program_id IS NULL THEN
    RAISE EXCEPTION 'A programme is required to preview an admission number.';
  END IF;

  SELECT * INTO v_program FROM public.programs WHERE id = p_program_id;
  IF v_program.id IS NULL THEN
    RAISE EXCEPTION 'The selected programme does not exist.';
  END IF;
  IF v_program.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Programme "%" is inactive; an admission number cannot be generated.', v_program.name;
  END IF;

  IF p_intake_id IS NOT NULL THEN
    SELECT * INTO v_intake FROM public.intakes WHERE id = p_intake_id;
    IF v_intake.id IS NULL THEN
      RAISE EXCEPTION 'The selected intake does not exist.';
    END IF;
  END IF;

  v_format := public.resolve_admission_number_format(p_program_id);
  v_code := COALESCE(
    NULLIF(upper(btrim(v_program.admission_prefix)), ''),
    NULLIF(upper(btrim(v_program.code)), '')
  );
  v_academic_year := COALESCE(
    NULLIF(btrim(v_intake.academic_year), ''),
    to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY')
  );
  v_intake_name := NULLIF(btrim(v_intake.name), '');
  v_campus := NULLIF(btrim(COALESCE(v_program.campus, '')), '');
  v_start := GREATEST(COALESCE(v_program.admission_sequence_start, 1), 1);

  SELECT last_value INTO v_last
  FROM public.admission_counters
  WHERE prefix = COALESCE(v_code, 'GEN')
    AND year = v_year;

  IF v_last IS NULL THEN
    v_sequence := v_start;
  ELSE
    v_sequence := v_last + 1;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    v_candidate := public.build_admission_number(
      v_format, v_code, v_year, v_academic_year,
      v_intake_name, p_study_mode, v_campus, v_sequence
    );

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.students WHERE admission_number = v_candidate
    );

    v_sequence := v_sequence + 1;

    IF v_attempt >= 500 THEN
      RAISE EXCEPTION
        'Unable to preview a unique admission number for programme "%".',
        v_program.name;
    END IF;
  END LOOP;

  RETURN v_candidate;
END;
$$;

-- 7f. Resolve a curriculum for a programme, optionally validating an explicit
--     selection.
CREATE OR REPLACE FUNCTION public.resolve_active_curriculum_id(
  p_program_id UUID,
  p_curriculum_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_program UUID;
  v_active BOOLEAN;
BEGIN
  IF p_curriculum_id IS NOT NULL THEN
    SELECT id, program_id, is_active
      INTO v_id, v_program, v_active
    FROM public.programme_curricula
    WHERE id = p_curriculum_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'The selected curriculum does not exist.';
    END IF;
    IF v_program <> p_program_id THEN
      RAISE EXCEPTION 'The selected curriculum does not belong to the selected programme.';
    END IF;
    IF v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'The selected curriculum is inactive.';
    END IF;

    RETURN v_id;
  END IF;

  SELECT id INTO v_id
  FROM public.programme_curricula
  WHERE program_id = p_program_id
    AND is_active = TRUE
  ORDER BY effective_from DESC NULLS LAST,
           academic_year DESC,
           created_at DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RAISE EXCEPTION
      'No active curriculum is configured for this programme. Configure a curriculum and its units before changing students.';
  END IF;

  RETURN v_id;
END;
$$;

-- 7g. Keep admission number generation on the same code path for all inserts.
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.admission_number IS NULL OR btrim(NEW.admission_number) = '' THEN
    IF NEW.program_id IS NULL THEN
      RAISE EXCEPTION
        'Select a programme before an admission number can be generated.';
    END IF;

    NEW.admission_number := public.generate_unique_admission_number(
      NEW.program_id,
      NEW.intake_id,
      NEW.study_mode
    );
    NEW.student_number := NEW.admission_number;
  ELSE
    NEW.admission_number := btrim(NEW.admission_number);
  END IF;

  IF NEW.student_number IS NULL OR btrim(NEW.student_number) = '' THEN
    NEW.student_number := NEW.admission_number;
  END IF;

  IF NEW.id_card_issued_at IS NULL THEN
    NEW.id_card_issued_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.generate_admission_number() SET search_path = public;

-- Remove the old two-argument counter overload so `next_admission_seq(a, b)`
-- resolves to the new function and its configurable starting value. This is
-- done after the trigger has been replaced so no caller depends on the old
-- signature.
DROP FUNCTION IF EXISTS public.next_admission_seq(TEXT, INTEGER);

-- ---------------------------------------------------------------------------
-- 8. Student guards / curriculum pinning
-- ---------------------------------------------------------------------------

-- Programme and admission-number edits must go through the programme-change
-- RPC. The RPC sets a transaction-local flag before updating.
CREATE OR REPLACE FUNCTION public.guard_student_programme_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.program_id IS DISTINCT FROM OLD.program_id
     OR NEW.admission_number IS DISTINCT FROM OLD.admission_number THEN

    -- Allow the programme to be cleared when the old programme itself has been
    -- deleted (the programs FK uses ON DELETE SET NULL).
    IF NEW.program_id IS NULL
       AND OLD.program_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.programs WHERE id = OLD.program_id) THEN
      RETURN NEW;
    END IF;

    IF COALESCE(current_setting('app.programme_change', TRUE), '') <> 'on' THEN
      RAISE EXCEPTION
        'A student''s programme and admission number can only be changed through Programme Enrollment.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_student_programme_fields ON public.students;
CREATE TRIGGER guard_student_programme_fields
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_programme_fields();

-- Auto-pin the programme's active curriculum when a student is created, and
-- reject mismatched programme/curriculum combinations.
CREATE OR REPLACE FUNCTION public.sync_student_curriculum()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_curriculum_program UUID;
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.curriculum_id IS NULL
     AND NEW.program_id IS NOT NULL THEN
    SELECT id INTO NEW.curriculum_id
    FROM public.programme_curricula
    WHERE program_id = NEW.program_id
      AND is_active = TRUE
    ORDER BY effective_from DESC NULLS LAST,
             academic_year DESC,
             created_at DESC
    LIMIT 1;
  END IF;

  IF NEW.curriculum_id IS NOT NULL AND NEW.program_id IS NOT NULL THEN
    SELECT program_id INTO v_curriculum_program
    FROM public.programme_curricula
    WHERE id = NEW.curriculum_id;

    IF v_curriculum_program IS DISTINCT FROM NEW.program_id THEN
      RAISE EXCEPTION
        'The selected curriculum does not belong to the student''s programme.';
    END IF;
  END IF;

  IF NEW.academic_year IS NULL OR btrim(NEW.academic_year) = '' THEN
    IF NEW.intake_id IS NOT NULL THEN
      SELECT NULLIF(btrim(academic_year), '')
        INTO NEW.academic_year
      FROM public.intakes
      WHERE id = NEW.intake_id;
    END IF;

    IF NEW.academic_year IS NULL OR btrim(NEW.academic_year) = '' THEN
      NEW.academic_year :=
        to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_student_curriculum ON public.students;
CREATE TRIGGER sync_student_curriculum
  BEFORE INSERT OR UPDATE OF program_id, curriculum_id, intake_id
  ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_curriculum();

-- ---------------------------------------------------------------------------
-- 9. Preview RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.preview_student_programme_admission_number(
  p_student_id UUID,
  p_new_program_id UUID,
  p_new_intake_id UUID DEFAULT NULL,
  p_new_study_mode TEXT DEFAULT NULL,
  p_new_curriculum_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_program public.programs%ROWTYPE;
  v_intake public.intakes%ROWTYPE;
  v_new_intake_id UUID;
  v_new_study_mode TEXT;
  v_curriculum_id UUID;
  v_curriculum_name TEXT;
  v_curriculum_year TEXT;
  v_semesters JSONB;
  v_academic_year TEXT;
  v_admission_number TEXT;
BEGIN
  IF NOT public.can_manage_programme_enrollment() THEN
    RAISE EXCEPTION 'You are not authorised to change student programmes.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  SELECT * INTO v_program FROM public.programs WHERE id = p_new_program_id;
  IF v_program.id IS NULL THEN
    RAISE EXCEPTION 'The selected programme does not exist.';
  END IF;
  IF v_program.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Programme "%" is inactive and cannot be selected.', v_program.name;
  END IF;
  IF v_student.program_id IS NOT DISTINCT FROM p_new_program_id THEN
    RAISE EXCEPTION 'The student is already enrolled in this programme.';
  END IF;

  v_new_intake_id := COALESCE(p_new_intake_id, v_student.intake_id);
  IF v_new_intake_id IS NOT NULL THEN
    SELECT * INTO v_intake FROM public.intakes WHERE id = v_new_intake_id;
    IF v_intake.id IS NULL THEN
      RAISE EXCEPTION 'The selected intake does not exist.';
    END IF;
  END IF;

  v_new_study_mode := NULLIF(btrim(COALESCE(p_new_study_mode, '')), '');

  IF v_new_study_mode IS NULL
     AND COALESCE(array_length(v_program.study_modes, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Select a study mode for the new programme.';
  END IF;
  IF v_new_study_mode IS NOT NULL
     AND COALESCE(array_length(v_program.study_modes, 1), 0) > 0
     AND NOT (v_new_study_mode = ANY (v_program.study_modes)) THEN
    RAISE EXCEPTION
      'Study mode "%" is not offered by programme "%".',
      v_new_study_mode, v_program.name;
  END IF;

  v_curriculum_id := public.resolve_active_curriculum_id(p_new_program_id, p_new_curriculum_id);

  SELECT name, academic_year
    INTO v_curriculum_name, v_curriculum_year
  FROM public.programme_curricula
  WHERE id = v_curriculum_id;

  SELECT COALESCE(jsonb_agg(semester ORDER BY semester), '[]'::jsonb)
    INTO v_semesters
  FROM (
    SELECT DISTINCT semester
    FROM public.curriculum_units
    WHERE curriculum_id = v_curriculum_id
      AND is_active = TRUE
  ) s;

  IF v_semesters = '[]'::jsonb THEN
    RAISE EXCEPTION
      'Curriculum "%" has no active units. Configure its units before changing students.',
      v_curriculum_name;
  END IF;

  v_academic_year := COALESCE(
    NULLIF(btrim(v_intake.academic_year), ''),
    NULLIF(btrim(v_student.academic_year), ''),
    to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY')
  );

  v_admission_number := public.preview_unique_admission_number(
    p_new_program_id,
    v_new_intake_id,
    v_new_study_mode
  );

  RETURN jsonb_build_object(
    'student_id', v_student.id,
    'student_name', btrim(v_student.first_name || ' ' || v_student.last_name),
    'previous_admission_number', v_student.admission_number,
    'previous_program_id', v_student.program_id,
    'new_program_id', v_program.id,
    'new_program_code', v_program.code,
    'new_program_name', v_program.name,
    'new_admission_number', v_admission_number,
    'admission_format', public.resolve_admission_number_format(p_new_program_id),
    'intake_id', v_intake.id,
    'intake_name', v_intake.name,
    'study_mode', v_new_study_mode,
    'academic_year', v_academic_year,
    'curriculum_id', v_curriculum_id,
    'curriculum_name', v_curriculum_name,
    'curriculum_academic_year', v_curriculum_year,
    'available_semesters', v_semesters
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Atomic programme change RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.change_student_programme(
  p_student_id UUID,
  p_new_program_id UUID,
  p_new_intake_id UUID DEFAULT NULL,
  p_new_study_mode TEXT DEFAULT NULL,
  p_new_curriculum_id UUID DEFAULT NULL,
  p_new_semester SMALLINT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
  v_old_program public.programs%ROWTYPE;
  v_new_program public.programs%ROWTYPE;
  v_old_intake public.intakes%ROWTYPE;
  v_new_intake public.intakes%ROWTYPE;
  v_old_curriculum public.programme_curricula%ROWTYPE;
  v_new_curriculum public.programme_curricula%ROWTYPE;
  v_new_intake_id UUID;
  v_new_study_mode TEXT;
  v_new_academic_year TEXT;
  v_new_admission_number TEXT;
  v_actor_role TEXT;
  v_actor_type TEXT;
  v_actor_name TEXT;
  v_semester SMALLINT;
  v_has_units BOOLEAN;
  v_previous JSONB;
  v_after JSONB;
  v_history_id UUID;
  v_changed_at TIMESTAMPTZ := NOW();
BEGIN
  IF NOT public.can_manage_programme_enrollment() THEN
    RAISE EXCEPTION 'You are not authorised to change student programmes.'
      USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR length(btrim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Provide a reason for the programme change.';
  END IF;

  -- Lock the student for the duration of the transaction.
  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
  FOR UPDATE;

  IF v_student.id IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF p_new_program_id IS NULL THEN
    RAISE EXCEPTION 'Select the new programme.';
  END IF;

  SELECT * INTO v_new_program FROM public.programs WHERE id = p_new_program_id;
  IF v_new_program.id IS NULL THEN
    RAISE EXCEPTION 'The selected programme does not exist.';
  END IF;
  IF v_new_program.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Programme "%" is inactive and cannot be selected.', v_new_program.name;
  END IF;
  IF v_student.program_id IS NOT DISTINCT FROM p_new_program_id THEN
    RAISE EXCEPTION 'The student is already enrolled in this programme.';
  END IF;

  IF v_student.program_id IS NOT NULL THEN
    SELECT * INTO v_old_program FROM public.programs WHERE id = v_student.program_id;
  END IF;

  -- Intake: optional, defaults to the student's current intake.
  v_new_intake_id := COALESCE(p_new_intake_id, v_student.intake_id);
  IF v_new_intake_id IS NOT NULL THEN
    SELECT * INTO v_new_intake FROM public.intakes WHERE id = v_new_intake_id;
    IF v_new_intake.id IS NULL THEN
      RAISE EXCEPTION 'The selected intake does not exist.';
    END IF;
  END IF;

  IF v_student.intake_id IS NOT NULL THEN
    SELECT * INTO v_old_intake FROM public.intakes WHERE id = v_student.intake_id;
  END IF;

  -- Study mode: required when the programme declares any modes.
  v_new_study_mode := NULLIF(btrim(COALESCE(p_new_study_mode, '')), '');
  IF v_new_study_mode IS NULL
     AND COALESCE(array_length(v_new_program.study_modes, 1), 0) > 0 THEN
    RAISE EXCEPTION 'Select a study mode for the new programme.';
  END IF;
  IF v_new_study_mode IS NOT NULL
     AND COALESCE(array_length(v_new_program.study_modes, 1), 0) > 0
     AND NOT (v_new_study_mode = ANY (v_new_program.study_modes)) THEN
    RAISE EXCEPTION
      'Study mode "%" is not offered by programme "%".',
      v_new_study_mode, v_new_program.name;
  END IF;

  -- Curriculum and semester must exist and contain units.
  SELECT * INTO v_new_curriculum
  FROM public.programme_curricula
  WHERE id = public.resolve_active_curriculum_id(p_new_program_id, p_new_curriculum_id);

  IF v_new_curriculum.id IS NULL THEN
    RAISE EXCEPTION 'The selected curriculum could not be resolved.';
  END IF;

  IF p_new_semester IS NULL THEN
    RAISE EXCEPTION 'Select the semester the student should join in the new programme.';
  END IF;
  IF p_new_semester < 1 OR p_new_semester > 20 THEN
    RAISE EXCEPTION 'Semester must be between 1 and 20.';
  END IF;
  v_semester := p_new_semester;

  SELECT EXISTS (
    SELECT 1
    FROM public.curriculum_units
    WHERE curriculum_id = v_new_curriculum.id
      AND semester = v_semester
      AND is_active = TRUE
  ) INTO v_has_units;

  IF NOT v_has_units THEN
    RAISE EXCEPTION
      'Curriculum "%" has no active units in semester %. Configure the curriculum before changing students.',
      v_new_curriculum.name, v_semester;
  END IF;

  IF v_student.curriculum_id IS NOT NULL THEN
    SELECT * INTO v_old_curriculum
    FROM public.programme_curricula
    WHERE id = v_student.curriculum_id;
  END IF;

  v_new_academic_year := COALESCE(
    NULLIF(btrim(v_new_intake.academic_year), ''),
    NULLIF(btrim(v_student.academic_year), ''),
    to_char(NOW(), 'YYYY') || '/' || to_char(NOW() + INTERVAL '1 year', 'YYYY')
  );

  -- Generate the admission number only after every validation has passed.
  v_new_admission_number := public.generate_unique_admission_number(
    p_new_program_id,
    v_new_intake_id,
    v_new_study_mode
  );

  IF v_new_admission_number IS NULL OR btrim(v_new_admission_number) = '' THEN
    RAISE EXCEPTION 'The system could not generate an admission number for the new programme.';
  END IF;

  IF v_student.admission_number IS NOT NULL
     AND v_new_admission_number = v_student.admission_number THEN
    RAISE EXCEPTION 'The generated admission number is the same as the current one. Check the programme admission format.';
  END IF;

  -- Apply the change. The guard trigger allows programme/admission edits only
  -- while this transaction-local flag is set.
  PERFORM set_config('app.programme_change', 'on', TRUE);

  UPDATE public.students
  SET program_id = p_new_program_id,
      admission_number = v_new_admission_number,
      student_number = v_new_admission_number,
      intake_id = v_new_intake_id,
      curriculum_id = v_new_curriculum.id,
      current_semester = v_semester,
      study_mode = v_new_study_mode,
      academic_year = v_new_academic_year,
      updated_at = v_changed_at
  WHERE id = p_student_id;

  PERFORM set_config('app.programme_change', 'off', TRUE);

  -- Keep the intake junction table consistent without deleting history.
  IF v_new_intake_id IS NOT NULL THEN
    UPDATE public.student_intakes
    SET is_primary = FALSE
    WHERE student_id = p_student_id
      AND is_primary = TRUE
      AND intake_id <> v_new_intake_id;

    INSERT INTO public.student_intakes (student_id, intake_id, is_primary, enrollment_date, status)
    VALUES (p_student_id, v_new_intake_id, TRUE, v_student.enrollment_date, v_student.status)
    ON CONFLICT (student_id, intake_id) DO UPDATE
      SET is_primary = TRUE;
  END IF;

  SELECT role::TEXT, full_name
    INTO v_actor_role, v_actor_name
  FROM public.profiles
  WHERE id = auth.uid();

  v_actor_type := CASE
    WHEN v_actor_role IN ('superadmin', 'admin') THEN 'ADMIN'
    WHEN v_actor_role = 'staff' THEN 'STAFF'
    ELSE 'SYSTEM'
  END;

  v_previous := jsonb_build_object(
    'program_id', v_student.program_id,
    'program_code', v_old_program.code,
    'program_name', v_old_program.name,
    'admission_number', v_student.admission_number,
    'intake_id', v_student.intake_id,
    'intake_name', v_old_intake.name,
    'study_mode', v_student.study_mode,
    'curriculum_id', v_student.curriculum_id,
    'curriculum_name', v_old_curriculum.name,
    'semester', v_student.current_semester,
    'academic_year', v_student.academic_year
  );

  v_after := jsonb_build_object(
    'program_id', v_new_program.id,
    'program_code', v_new_program.code,
    'program_name', v_new_program.name,
    'admission_number', v_new_admission_number,
    'intake_id', v_new_intake_id,
    'intake_name', v_new_intake.name,
    'study_mode', v_new_study_mode,
    'curriculum_id', v_new_curriculum.id,
    'curriculum_name', v_new_curriculum.name,
    'semester', v_semester,
    'academic_year', v_new_academic_year
  );

  INSERT INTO public.programme_change_history (
    student_id,
    previous_program_id,
    new_program_id,
    previous_program_code,
    previous_program_name,
    new_program_code,
    new_program_name,
    previous_admission_number,
    new_admission_number,
    previous_intake_id,
    new_intake_id,
    previous_intake_name,
    new_intake_name,
    previous_study_mode,
    new_study_mode,
    previous_curriculum_id,
    new_curriculum_id,
    previous_curriculum_name,
    new_curriculum_name,
    previous_semester,
    new_semester,
    previous_academic_year,
    new_academic_year,
    reason,
    changed_by,
    changed_by_name,
    changed_at
  ) VALUES (
    p_student_id,
    v_student.program_id,
    v_new_program.id,
    v_old_program.code,
    v_old_program.name,
    v_new_program.code,
    v_new_program.name,
    v_student.admission_number,
    v_new_admission_number,
    v_student.intake_id,
    v_new_intake_id,
    v_old_intake.name,
    v_new_intake.name,
    v_student.study_mode,
    v_new_study_mode,
    v_student.curriculum_id,
    v_new_curriculum.id,
    v_old_curriculum.name,
    v_new_curriculum.name,
    v_student.current_semester,
    v_semester,
    v_student.academic_year,
    v_new_academic_year,
    btrim(p_reason),
    auth.uid(),
    v_actor_name,
    v_changed_at
  )
  RETURNING id INTO v_history_id;

  PERFORM public.log_audit(
    p_user_id => auth.uid(),
    p_user_role => v_actor_role,
    p_actor_type => v_actor_type,
    p_action => 'programme_change',
    p_module => 'students',
    p_entity_type => 'student',
    p_entity_id => p_student_id,
    p_entity_name => btrim(v_student.first_name || ' ' || v_student.last_name),
    p_previous_value => v_previous,
    p_new_value => v_after,
    p_details => btrim(p_reason),
    p_status => 'success'
  );

  RETURN jsonb_build_object(
    'history_id', v_history_id,
    'student_id', p_student_id,
    'student_name', btrim(v_student.first_name || ' ' || v_student.last_name),
    'changed_at', v_changed_at,
    'previous', v_previous,
    'new', v_after
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 11. Execution grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.preview_student_programme_admission_number(UUID, UUID, UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.change_student_programme(UUID, UUID, UUID, TEXT, UUID, SMALLINT, TEXT) FROM PUBLIC;

-- Internal helpers stay callable only from the SECURITY DEFINER workflows
-- above (and from the students insert trigger).
REVOKE ALL ON FUNCTION public.generate_unique_admission_number(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_unique_admission_number(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_active_curriculum_id(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_admission_number_format(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_admission_seq(TEXT, INTEGER, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.preview_student_programme_admission_number(UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_student_programme(UUID, UUID, UUID, TEXT, UUID, SMALLINT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. RLS for new tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.programme_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programme_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view curricula" ON public.programme_curricula;
CREATE POLICY "Authenticated users can view curricula"
  ON public.programme_curricula FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Managers can manage curricula" ON public.programme_curricula;
CREATE POLICY "Managers can manage curricula"
  ON public.programme_curricula FOR ALL TO authenticated
  USING (public.can_manage_programme_enrollment())
  WITH CHECK (public.can_manage_programme_enrollment());

DROP POLICY IF EXISTS "Authenticated users can view curriculum units" ON public.curriculum_units;
CREATE POLICY "Authenticated users can view curriculum units"
  ON public.curriculum_units FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Managers can manage curriculum units" ON public.curriculum_units;
CREATE POLICY "Managers can manage curriculum units"
  ON public.curriculum_units FOR ALL TO authenticated
  USING (public.can_manage_programme_enrollment())
  WITH CHECK (public.can_manage_programme_enrollment());

DROP POLICY IF EXISTS "Managers can view programme change history" ON public.programme_change_history;
CREATE POLICY "Managers can view programme change history"
  ON public.programme_change_history FOR SELECT TO authenticated
  USING (public.can_manage_programme_enrollment());

DROP POLICY IF EXISTS "Students can view own programme change history" ON public.programme_change_history;
CREATE POLICY "Students can view own programme change history"
  ON public.programme_change_history FOR SELECT TO authenticated
  USING (public.is_own_student(student_id));

-- History rows are written only by the SECURITY DEFINER RPC above, so no
-- INSERT/UPDATE/DELETE policies are granted.
