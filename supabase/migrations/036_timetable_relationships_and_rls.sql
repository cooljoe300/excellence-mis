-- Preserve existing timetable rows. Add relationships, fix staff/superadmin RLS,
-- and allow authenticated users to read configured time slots.

CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Clear orphaned foreign keys so constraints can be added without dropping data
UPDATE public.timetables t
SET program_id = NULL
WHERE program_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.programs p WHERE p.id = t.program_id);

UPDATE public.timetables t
SET intake_id = NULL
WHERE intake_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.intakes i WHERE i.id = t.intake_id);

UPDATE public.timetables t
SET course_id = NULL
WHERE course_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = t.course_id);

UPDATE public.timetables t
SET lecturer_id = NULL
WHERE lecturer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.lecturer_id);

UPDATE public.timetables t
SET room_id = NULL
WHERE room_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = t.room_id);

UPDATE public.timetables t
SET created_by = NULL
WHERE created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.created_by);

UPDATE public.timetables t
SET updated_by = NULL
WHERE updated_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.updated_by);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetables_program_id_fkey'
  ) THEN
    ALTER TABLE public.timetables
      ADD CONSTRAINT timetables_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetables_intake_id_fkey'
  ) THEN
    ALTER TABLE public.timetables
      ADD CONSTRAINT timetables_intake_id_fkey
      FOREIGN KEY (intake_id) REFERENCES public.intakes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetables_course_id_fkey'
  ) THEN
    ALTER TABLE public.timetables
      ADD CONSTRAINT timetables_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetables_lecturer_id_fkey'
  ) THEN
    ALTER TABLE public.timetables
      ADD CONSTRAINT timetables_lecturer_id_fkey
      FOREIGN KEY (lecturer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'timetables_room_id_fkey'
  ) THEN
    ALTER TABLE public.timetables
      ADD CONSTRAINT timetables_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can view time slots" ON public.time_slots;
CREATE POLICY "Authenticated users can view time slots"
  ON public.time_slots
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can manage time slots" ON public.time_slots;
CREATE POLICY "Staff can manage time slots"
  ON public.time_slots
  FOR ALL
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

DROP POLICY IF EXISTS "Staff can manage timetables" ON public.timetables;
CREATE POLICY "Staff can manage timetables"
  ON public.timetables
  FOR ALL
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

DROP POLICY IF EXISTS "Authenticated users can view active timetables" ON public.timetables;
CREATE POLICY "Authenticated users can view active timetables"
  ON public.timetables
  FOR SELECT
  TO authenticated
  USING (status = 'active' OR is_staff_or_admin());
