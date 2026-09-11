-- Add zoom_meeting_id field to online_lessons table
-- This allows students to see and copy the Zoom meeting ID separately from the URL

ALTER TABLE online_lessons ADD COLUMN IF NOT EXISTS zoom_meeting_id TEXT;

-- Add comment
COMMENT ON COLUMN online_lessons.zoom_meeting_id IS 'Zoom meeting ID for easy reference and copying (e.g., 123 456 7890)';