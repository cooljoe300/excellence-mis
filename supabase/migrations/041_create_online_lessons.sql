-- Simple online lessons table for scheduled Zoom classes
CREATE TABLE IF NOT EXISTS online_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  topic TEXT,
  description TEXT,
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  zoom_url TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_online_lessons_course_id ON online_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_online_lessons_scheduled_date ON online_lessons(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_online_lessons_is_published ON online_lessons(is_published);

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
      WHERE enrollments.student_id = (
        SELECT id FROM students WHERE students.profile_id = auth.uid()
      )
      AND enrollments.course_id = online_lessons.course_id
      AND enrollments.status = 'active'
    )
  );

-- Add helpful comments
COMMENT ON TABLE online_lessons IS 'Online classes for scheduled Zoom lessons';
COMMENT ON COLUMN online_lessons.zoom_url IS 'Zoom meeting join URL for the class';
COMMENT ON COLUMN online_lessons.is_published IS 'Whether the class is visible to students';
