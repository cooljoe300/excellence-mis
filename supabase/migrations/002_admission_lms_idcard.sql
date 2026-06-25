-- Admission numbers, LMS sync tracking, and ID card fields

CREATE TYPE lms_sync_status AS ENUM ('not_synced', 'synced', 'failed');

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS admission_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS lms_user_id TEXT,
  ADD COLUMN IF NOT EXISTS lms_sync_status lms_sync_status NOT NULL DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS lms_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lms_sync_error TEXT,
  ADD COLUMN IF NOT EXISTS id_card_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Backfill admission_number from student_number for existing rows
UPDATE students
SET admission_number = student_number
WHERE admission_number IS NULL AND student_number IS NOT NULL AND student_number <> '';

-- Replace student number trigger with admission number generator
DROP TRIGGER IF EXISTS set_student_number ON students;
DROP FUNCTION IF EXISTS generate_student_number();

CREATE OR REPLACE FUNCTION generate_admission_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  next_seq INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    SELECT COALESCE(MAX(CAST(SPLIT_PART(admission_number, '-', 3) AS INTEGER)), 0) + 1
    INTO next_seq
    FROM students
    WHERE admission_number LIKE 'ADM-' || year_part || '-%';

    new_number := 'ADM-' || year_part || '-' || LPAD(next_seq::TEXT, 4, '0');
    NEW.admission_number := new_number;
    NEW.student_number := new_number;
  END IF;

  IF NEW.student_number IS NULL OR NEW.student_number = '' THEN
    NEW.student_number := NEW.admission_number;
  END IF;

  -- Auto-issue ID card on registration
  IF NEW.id_card_issued_at IS NULL THEN
    NEW.id_card_issued_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_admission_number BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION generate_admission_number();
