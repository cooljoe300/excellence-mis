-- Create online lessons table for scheduled live classes and recorded lessons
CREATE TABLE IF NOT EXISTS online_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  description TEXT,
  lecturer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lecturer_name TEXT,
  
  -- Zoom meeting details
  zoom_join_url TEXT NOT NULL,
  zoom_meeting_id TEXT,
  zoom_passcode TEXT,
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER,
  
  -- Recording support
  recording_url TEXT,
  thumbnail_url TEXT,
  
  -- Class type: live_class or recorded_class
  class_type TEXT NOT NULL DEFAULT 'live_class' CHECK (class_type IN ('live_class', 'recorded_class')),
  
  -- Status management
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  
  -- Audit
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_online_lessons_course_id ON online_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_online_lessons_scheduled_date ON online_lessons(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_online_lessons_status ON online_lessons(status);
CREATE INDEX IF NOT EXISTS idx_online_lessons_is_published ON online_lessons(is_published);
CREATE INDEX IF NOT EXISTS idx_online_lessons_lecturer_id ON online_lessons(lecturer_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_online_lessons_updated_at
  BEFORE UPDATE ON online_lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE online_lessons ENABLE ROW LEVEL SECURITY;

-- Admin/staff/teacher can manage all lessons
CREATE POLICY "Admins can view all online lessons"
  ON online_lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Admins can create online lessons"
  ON online_lessons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Admins can update online lessons"
  ON online_lessons FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'staff', 'teacher')
    )
  );

CREATE POLICY "Admins can delete online lessons"
  ON online_lessons FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'staff', 'teacher')
    )
  );

-- Students can only view published lessons for their enrolled courses
CREATE POLICY "Students can view published lessons for enrolled courses"
  ON online_lessons FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
    AND EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.student_id = auth.uid()
      AND enrollments.course_id = online_lessons.course_id
      AND enrollments.status = 'active'
    )
  );

-- Teachers can view lessons for courses they teach
CREATE POLICY "Teachers can view lessons for their courses"
  ON online_lessons FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
    AND EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = online_lessons.course_id
      AND courses.instructor_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE online_lessons IS 'Online lessons and live classes for student learning';
COMMENT ON COLUMN online_lessons.class_type IS 'Type of class: live_class for scheduled Zoom meetings, recorded_class for pre-recorded content';
COMMENT ON COLUMN online_lessons.status IS 'Lesson status: scheduled, live, completed, cancelled';
COMMENT ON COLUMN online_lessons.is_published IS 'Whether the lesson is visible to students';
COMMENT ON COLUMN online_lessons.zoom_join_url IS 'Full Zoom meeting join URL';
COMMENT ON COLUMN online_lessons.recording_url IS 'Optional URL for class recording when available';
