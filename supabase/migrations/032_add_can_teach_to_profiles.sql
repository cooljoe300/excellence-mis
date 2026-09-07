-- Add can_teach field to profiles table for lecturer management
-- This allows existing users to be marked as lecturers without creating duplicate accounts

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_teach BOOLEAN NOT NULL DEFAULT FALSE;

-- Add lecturer-specific fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS staff_number TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active';

-- Create index for faster lecturer queries
CREATE INDEX IF NOT EXISTS idx_profiles_can_teach ON public.profiles(can_teach) WHERE can_teach = TRUE;

-- Add comment
COMMENT ON COLUMN public.profiles.can_teach IS 'Whether this user can teach and appears in lecturer dropdowns';
COMMENT ON COLUMN public.profiles.staff_number IS 'Staff/Employee number for lecturer identification';
COMMENT ON COLUMN public.profiles.department IS 'Department the lecturer belongs to';
COMMENT ON COLUMN public.profiles.specialization IS 'Lecturer specialization or area of expertise';
COMMENT ON COLUMN public.profiles.employment_status IS 'Employment status: active, inactive, on_leave, etc';
