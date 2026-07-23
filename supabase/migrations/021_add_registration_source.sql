-- Add registration_source field to students table (without default first)
ALTER TABLE students ADD COLUMN registration_source TEXT;

-- Create enum for registration source
CREATE TYPE registration_source_type AS ENUM ('staff_registered', 'self_registered');

-- Update the column to use the enum
ALTER TABLE students ALTER COLUMN registration_source TYPE registration_source_type USING registration_source::registration_source_type;

-- Set default value after type conversion
ALTER TABLE students ALTER COLUMN registration_source SET DEFAULT 'staff_registered';

-- Update existing records to have a default value
UPDATE students SET registration_source = 'staff_registered' WHERE registration_source IS NULL;

-- Add comment
COMMENT ON COLUMN students.registration_source IS 'Indicates how the student was registered: staff_registered (by admin/staff) or self_registered (via student portal)';
