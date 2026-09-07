-- Add academic_year field to intakes table for automatic timetable academic year population

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- Update existing intakes to have academic year based on start_date
UPDATE public.intakes
SET academic_year = EXTRACT(YEAR FROM start_date)::TEXT || '/' || (EXTRACT(YEAR FROM start_date) + 1)::TEXT
WHERE academic_year IS NULL;

-- Add comment
COMMENT ON COLUMN public.intakes.academic_year IS 'Academic year (e.g., 2026/2027) for this intake';
