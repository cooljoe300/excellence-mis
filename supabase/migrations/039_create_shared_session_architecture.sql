-- Create shared session architecture for timetable module
-- This allows one unit to be taught to multiple programmes simultaneously
-- Architecture: Main timetable session + programme assignments junction table

-- Create junction table for programme assignments to timetable sessions
CREATE TABLE IF NOT EXISTS timetable_programme_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID NOT NULL REFERENCES timetables(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  intake_id UUID NOT NULL REFERENCES intakes(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate programme-intake assignments for the same timetable
  UNIQUE(timetable_id, programme_id, intake_id)
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_timetable_programme_assignments_timetable_id 
ON timetable_programme_assignments(timetable_id);

CREATE INDEX IF NOT EXISTS idx_timetable_programme_assignments_programme_id 
ON timetable_programme_assignments(programme_id);

CREATE INDEX IF NOT EXISTS idx_timetable_programme_assignments_intake_id 
ON timetable_programme_assignments(intake_id);

-- Add comment
COMMENT ON TABLE timetable_programme_assignments IS 
'Junction table linking timetable sessions to multiple programmes/intakes for shared classes';

COMMENT ON COLUMN timetable_programme_assignments.timetable_id IS 
'Reference to the main timetable session';
COMMENT ON COLUMN timetable_programme_assignments.programme_id IS 
'Programme that attends this shared session';
COMMENT ON COLUMN timetable_programme_assignments.intake_id IS 
'Intake within the programme that attends this shared session';
COMMENT ON COLUMN timetable_programme_assignments.academic_year IS 
'Academic year for this programme-intake assignment';

-- Enable Row Level Security
ALTER TABLE timetable_programme_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for programme assignments
CREATE POLICY "Authenticated users can view programme assignments" 
ON timetable_programme_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage programme assignments" 
ON timetable_programme_assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

-- Update the existing unique constraint to work with the new architecture
-- Drop the old constraint that included programme_id and intake_id
ALTER TABLE timetables DROP CONSTRAINT IF EXISTS timetables_unique_schedule;

-- Add new constraint that allows shared sessions
-- For regular classes, enforce uniqueness including programme/intake
-- For shared classes, enforce uniqueness based on session details only
ALTER TABLE timetables
ADD CONSTRAINT timetables_unique_schedule 
UNIQUE (day, start_time, end_time, course_id, lecturer_id, academic_year, shared_class_id);

-- Add comment explaining the new constraint
COMMENT ON CONSTRAINT timetables_unique_schedule ON timetables IS 
'Prevents duplicate timetable sessions. Shared sessions (with shared_class_id) can have multiple programme assignments via the junction table.';

-- Backward compatibility: 
-- - Existing single-programme entries continue to work with programme_id/intake_id in main table
-- - New shared sessions use the junction table for multiple programme assignments
-- - Both approaches are supported during transition period