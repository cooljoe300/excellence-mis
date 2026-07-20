-- Excellence Online College MIS - Timetable Module
-- Migration for complete timetable management system

-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and types if they exist (for clean migration)
DROP TABLE IF EXISTS timetable_audit_logs CASCADE;
DROP TABLE IF EXISTS timetables CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TYPE IF EXISTS timetable_status CASCADE;
DROP TYPE IF EXISTS teaching_mode CASCADE;
DROP TYPE IF EXISTS room_type CASCADE;

-- Custom types for timetable module
CREATE TYPE timetable_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE teaching_mode AS ENUM ('physical', 'online', 'hybrid');
CREATE TYPE room_type AS ENUM ('lecture_hall', 'computer_lab', 'laboratory', 'seminar_room', 'boardroom');

-- Time slots (reusable teaching periods)
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  building TEXT,
  capacity INTEGER,
  type room_type NOT NULL DEFAULT 'lecture_hall',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Timetable entries
CREATE TABLE timetables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  program_id UUID,
  department TEXT,
  campus TEXT DEFAULT 'Main Campus',
  intake_id UUID,
  class_section TEXT,
  course_id UUID,
  lecturer_id UUID,
  room_id UUID,
  day TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER,
  max_students INTEGER,
  teaching_mode teaching_mode NOT NULL DEFAULT 'physical',
  meeting_link TEXT,
  status timetable_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID,
  updated_by UUID,
  published_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs for timetable changes
CREATE TABLE timetable_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timetable_id UUID,
  action TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  performed_by UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger for rooms
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Updated_at trigger for timetables
CREATE TRIGGER timetables_updated_at BEFORE UPDATE ON timetables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function for staff/admin check (if not exists)
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Time slots policies
CREATE POLICY "Staff can manage time slots" ON time_slots FOR ALL USING (is_staff_or_admin());

-- Rooms policies
CREATE POLICY "Authenticated users can view rooms" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage rooms" ON rooms FOR ALL USING (is_staff_or_admin());

-- Timetables policies
CREATE POLICY "Authenticated users can view active timetables" ON timetables FOR SELECT TO authenticated 
  USING (status = 'active');
CREATE POLICY "Staff can manage timetables" ON timetables FOR ALL USING (is_staff_or_admin());

-- Audit logs policies
CREATE POLICY "Staff can view audit logs" ON timetable_audit_logs FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "System can create audit logs" ON timetable_audit_logs FOR INSERT 
  WITH CHECK (true);

-- Seed default time slots
INSERT INTO time_slots (name, start_time, end_time) VALUES
  ('07:00 - 09:00', '07:00:00', '09:00:00'),
  ('09:00 - 11:00', '09:00:00', '11:00:00'),
  ('11:00 - 13:00', '11:00:00', '13:00:00'),
  ('14:00 - 16:00', '14:00:00', '16:00:00'),
  ('16:00 - 18:00', '16:00:00', '18:00:00'),
  ('18:00 - 20:00', '18:00:00', '20:00:00');

-- Seed sample rooms
INSERT INTO rooms (name, building, capacity, type) VALUES
  ('LH-1', 'Admin Block', 100, 'lecture_hall'),
  ('LH-2', 'Admin Block', 80, 'lecture_hall'),
  ('LH-3', 'Academic Block', 120, 'lecture_hall'),
  ('CL-1', 'Computer Block', 40, 'computer_lab'),
  ('CL-2', 'Computer Block', 40, 'computer_lab'),
  ('LAB-1', 'Science Block', 30, 'laboratory'),
  ('SR-1', 'Admin Block', 20, 'seminar_room'),
  ('BR-1', 'Admin Block', 15, 'boardroom');
