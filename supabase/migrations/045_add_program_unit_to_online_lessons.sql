-- Add program_id and unit information to online_lessons for better filtering
-- This allows us to track the programme and unit directly in the lesson record

-- Add program_id to link directly to programs table
ALTER TABLE online_lessons ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE SET NULL;

-- Add a computed column for unit name (redundant but useful for performance)
ALTER TABLE online_lessons ADD COLUMN IF NOT EXISTS unit_name TEXT;

-- Backfill program_id from course relationship for existing records
UPDATE online_lessons 
SET program_id = (SELECT program_id FROM courses WHERE courses.id = online_lessons.course_id)
WHERE program_id IS NULL;

-- Backfill unit_name from course for existing records
UPDATE online_lessons 
SET unit_name = (SELECT name FROM courses WHERE courses.id = online_lessons.course_id)
WHERE unit_name IS NULL;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_online_lessons_program_id ON online_lessons(program_id);
CREATE INDEX IF NOT EXISTS idx_online_lessons_class_type ON online_lessons(class_type);

-- Add comments
COMMENT ON COLUMN online_lessons.program_id IS 'Direct link to the program (redundant with course.program_id for performance)';
COMMENT ON COLUMN online_lessons.unit_name IS 'Cached unit name for display purposes (redundant with course.name for performance)';