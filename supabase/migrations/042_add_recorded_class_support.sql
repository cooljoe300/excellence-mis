-- Add support for recorded classes to online_lessons table
-- Add recording_url, passcode, and class_type fields

-- Add recording_url for Zoom recording links
ALTER TABLE online_lessons ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add passcode for recordings that require authentication
ALTER TABLE online_lessons ADD COLUMN IF NOT EXISTS passcode TEXT;

-- Add class_type to distinguish between live and recorded classes
ALTER TABLE online_lessons ADD COLUMN IF NOT EXISTS class_type TEXT NOT NULL DEFAULT 'live' CHECK (class_type IN ('live', 'recorded'));

-- Update existing records to have class_type if null
UPDATE online_lessons SET class_type = 'live' WHERE class_type IS NULL;

-- Make scheduled fields nullable for recorded classes
-- Step 1: Add default values to allow dropping NOT NULL constraint
ALTER TABLE online_lessons ALTER COLUMN scheduled_date SET DEFAULT NULL;
ALTER TABLE online_lessons ALTER COLUMN start_time SET DEFAULT NULL;
ALTER TABLE online_lessons ALTER COLUMN end_time SET DEFAULT NULL;
ALTER TABLE online_lessons ALTER COLUMN zoom_url SET DEFAULT NULL;

-- Step 2: Drop NOT NULL constraints
ALTER TABLE online_lessons ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE online_lessons ALTER COLUMN start_time DROP NOT NULL;
ALTER TABLE online_lessons ALTER COLUMN end_time DROP NOT NULL;
ALTER TABLE online_lessons ALTER COLUMN zoom_url DROP NOT NULL;

-- Step 3: Remove defaults
ALTER TABLE online_lessons ALTER COLUMN scheduled_date DROP DEFAULT;
ALTER TABLE online_lessons ALTER COLUMN start_time DROP DEFAULT;
ALTER TABLE online_lessons ALTER COLUMN end_time DROP DEFAULT;
ALTER TABLE online_lessons ALTER COLUMN zoom_url DROP DEFAULT;

-- Add comments
COMMENT ON COLUMN online_lessons.recording_url IS 'Zoom recording URL for recorded classes';
COMMENT ON COLUMN online_lessons.passcode IS 'Optional passcode for recordings that require authentication';
COMMENT ON COLUMN online_lessons.class_type IS 'Type of class: live for scheduled Zoom meetings, recorded for pre-recorded content';
COMMENT ON COLUMN online_lessons.scheduled_date IS 'Required for live classes, optional for recorded classes';
COMMENT ON COLUMN online_lessons.start_time IS 'Required for live classes, optional for recorded classes';
COMMENT ON COLUMN online_lessons.end_time IS 'Required for live classes, optional for recorded classes';
COMMENT ON COLUMN online_lessons.zoom_url IS 'Zoom meeting URL for live classes';

-- Update table comment
COMMENT ON TABLE online_lessons IS 'Online classes for live Zoom meetings and recorded lessons';
