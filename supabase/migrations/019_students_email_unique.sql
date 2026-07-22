-- Prevent duplicate student records with the same email
-- This ensures admin-registered students cannot create duplicate self-registered records
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique
  ON public.students (email)
  WHERE email IS NOT NULL;
