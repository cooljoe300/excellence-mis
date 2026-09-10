-- LMS Learning Activities Module
-- This migration adds learning activities for existing courses (units)

-- Create enum for activity status
CREATE TYPE lms_activity_status AS ENUM ('active', 'inactive');

-- Create enum for activity provider
CREATE TYPE lms_activity_provider AS ENUM ('zoom', 'microsoft_teams', 'google_meet', 'moodle', 'external_link');

-- Create enum for launch mode
CREATE TYPE lms_launch_mode AS ENUM ('iframe', 'zoom_sdk', 'same_tab');

-- Create lms_learning_activities table
CREATE TABLE lms_learning_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  external_url TEXT NOT NULL,
  description TEXT,
  display_description BOOLEAN DEFAULT true,
  provider lms_activity_provider DEFAULT 'external_link',
  launch_mode lms_launch_mode DEFAULT 'iframe',
  status lms_activity_status DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Add updated_at trigger
CREATE TRIGGER lms_learning_activities_updated_at BEFORE UPDATE ON lms_learning_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE lms_learning_activities ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin or staff
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('superadmin', 'admin', 'staff', 'teacher')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- RLS Policies for lms_learning_activities

-- Admins and staff can manage all learning activities
CREATE POLICY "Staff can manage learning activities" ON lms_learning_activities
  FOR ALL USING (is_staff_or_admin());

-- Students can only view active learning activities for courses they are enrolled in
CREATE POLICY "Students can view enrolled learning activities" ON lms_learning_activities
  FOR SELECT USING (
    status = 'active' AND EXISTS (
      SELECT 1 FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE 
        e.course_id = lms_learning_activities.course_id 
        AND s.profile_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Add indexes for performance
CREATE INDEX idx_lms_learning_activities_course_id ON lms_learning_activities(course_id);
CREATE INDEX idx_lms_learning_activities_status ON lms_learning_activities(status);
CREATE INDEX idx_lms_learning_activities_provider ON lms_learning_activities(provider);
