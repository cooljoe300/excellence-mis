-- Create view tracking table for recorded classes
CREATE TABLE IF NOT EXISTS recorded_class_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  online_lesson_id UUID NOT NULL REFERENCES online_lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(online_lesson_id, student_id, viewed_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_recorded_class_views_lesson_id ON recorded_class_views(online_lesson_id);
CREATE INDEX IF NOT EXISTS idx_recorded_class_views_student_id ON recorded_class_views(student_id);
CREATE INDEX IF NOT EXISTS idx_recorded_class_views_viewed_at ON recorded_class_views(viewed_at);

-- Row Level Security
ALTER TABLE recorded_class_views ENABLE ROW LEVEL SECURITY;

-- Students can only create view records for themselves
CREATE POLICY "Students can create their own view records"
  ON recorded_class_views FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = recorded_class_views.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Students can only view their own view records
CREATE POLICY "Students can view their own view records"
  ON recorded_class_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = recorded_class_views.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Admins/staff can view all view records
CREATE POLICY "Admins can view all view records"
  ON recorded_class_views FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin', 'staff', 'teacher')
    )
  );

-- No update or delete policies - records are immutable

-- Add comments
COMMENT ON TABLE recorded_class_views IS 'Tracks when students view recorded classes';
COMMENT ON COLUMN recorded_class_views.online_lesson_id IS 'Reference to the recorded online lesson';
COMMENT ON COLUMN recorded_class_views.student_id IS 'Reference to the student who viewed the lesson';
COMMENT ON COLUMN recorded_class_views.viewed_at IS 'Timestamp when the student viewed the lesson';