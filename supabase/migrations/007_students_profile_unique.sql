-- One student record per auth account (speeds up insert — no pre-check query needed)
CREATE UNIQUE INDEX IF NOT EXISTS students_profile_id_unique
  ON public.students (profile_id)
  WHERE profile_id IS NOT NULL;
