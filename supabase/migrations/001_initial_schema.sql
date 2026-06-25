-- Excellence Online College MIS - Initial Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom types
CREATE TYPE user_role AS ENUM ('admin', 'staff', 'teacher', 'student');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'suspended', 'withdrawn');
CREATE TYPE enrollment_status AS ENUM ('pending', 'active', 'completed', 'dropped');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'overdue', 'waived');

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Academic terms / semesters
CREATE TABLE academic_terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Programs (e.g. Diploma in IT, Certificate in Business)
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  duration_months INTEGER NOT NULL DEFAULT 12,
  tuition_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_number TEXT NOT NULL UNIQUE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Kenya',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status student_status NOT NULL DEFAULT 'active',
  lms_username TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enrollments (student enrolled in course for a term)
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'active',
  grade TEXT,
  score DECIMAL(5, 2),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(student_id, course_id, term_id)
);

-- Attendance records
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  notes TEXT,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(enrollment_id, date)
);

-- Fee payments
CREATE TABLE fee_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES academic_terms(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status payment_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  paid_date DATE,
  payment_method TEXT,
  reference_number TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER programs_updated_at BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER fee_payments_updated_at BEFORE UPDATE ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Generate student number
CREATE OR REPLACE FUNCTION generate_student_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_number IS NULL OR NEW.student_number = '' THEN
    NEW.student_number := 'EOC' || TO_CHAR(NOW(), 'YY') || LPAD(
      (SELECT COALESCE(MAX(CAST(SUBSTRING(student_number FROM 6) AS INTEGER)), 0) + 1
       FROM students WHERE student_number LIKE 'EOC' || TO_CHAR(NOW(), 'YY') || '%')::TEXT,
      4, '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_student_number BEFORE INSERT ON students
  FOR EACH ROW EXECUTE FUNCTION generate_student_number();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is admin or staff
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff', 'teacher')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Staff can view all profiles" ON profiles FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Academic terms policies
CREATE POLICY "Authenticated users can view terms" ON academic_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage terms" ON academic_terms FOR ALL USING (is_staff_or_admin());

-- Programs policies
CREATE POLICY "Authenticated users can view programs" ON programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage programs" ON programs FOR ALL USING (is_staff_or_admin());

-- Courses policies
CREATE POLICY "Authenticated users can view courses" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage courses" ON courses FOR ALL USING (is_staff_or_admin());

-- Students policies
CREATE POLICY "Staff can view all students" ON students FOR SELECT USING (is_staff_or_admin());
CREATE POLICY "Students can view own record" ON students FOR SELECT USING (
  profile_id = auth.uid()
);
CREATE POLICY "Staff can manage students" ON students FOR ALL USING (is_staff_or_admin());

-- Enrollments policies
CREATE POLICY "Staff can manage enrollments" ON enrollments FOR ALL USING (is_staff_or_admin());
CREATE POLICY "Students can view own enrollments" ON enrollments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE students.id = enrollments.student_id AND students.profile_id = auth.uid())
);

-- Attendance policies
CREATE POLICY "Staff can manage attendance" ON attendance FOR ALL USING (is_staff_or_admin());
CREATE POLICY "Students can view own attendance" ON attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.id = attendance.enrollment_id AND s.profile_id = auth.uid()
  )
);

-- Fee payments policies
CREATE POLICY "Staff can manage fees" ON fee_payments FOR ALL USING (is_staff_or_admin());
CREATE POLICY "Students can view own fees" ON fee_payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM students WHERE students.id = fee_payments.student_id AND students.profile_id = auth.uid())
);

-- Seed sample data (optional - for demo)
INSERT INTO academic_terms (name, code, start_date, end_date, is_current) VALUES
  ('January 2026 Intake', 'JAN2026', '2026-01-06', '2026-06-30', true),
  ('July 2026 Intake', 'JUL2026', '2026-07-01', '2026-12-15', false);

INSERT INTO programs (name, code, description, duration_months, tuition_fee) VALUES
  ('Diploma in Information Technology', 'DIT', 'Comprehensive IT program covering software development, networking, and database management.', 24, 85000.00),
  ('Certificate in Business Administration', 'CBA', 'Foundation in business management, accounting, and entrepreneurship.', 12, 45000.00),
  ('Diploma in Education', 'DOE', 'Teacher training program aligned with national education standards.', 24, 75000.00);

INSERT INTO courses (program_id, name, code, description, credits)
SELECT p.id, c.name, c.code, c.description, c.credits
FROM programs p
CROSS JOIN (VALUES
  ('Introduction to Programming', 'CS101', 'Fundamentals of programming with Python', 4),
  ('Database Systems', 'CS201', 'Relational databases and SQL', 3),
  ('Web Development', 'CS301', 'HTML, CSS, JavaScript and modern frameworks', 4),
  ('Business Communication', 'BA101', 'Professional writing and presentation skills', 3),
  ('Financial Accounting', 'BA201', 'Principles of accounting and bookkeeping', 4)
) AS c(name, code, description, credits)
WHERE p.code = 'DIT' AND c.code LIKE 'CS%'
UNION ALL
SELECT p.id, c.name, c.code, c.description, c.credits
FROM programs p
CROSS JOIN (VALUES
  ('Business Communication', 'BA101', 'Professional writing and presentation skills', 3),
  ('Financial Accounting', 'BA201', 'Principles of accounting and bookkeeping', 4),
  ('Marketing Fundamentals', 'BA301', 'Introduction to marketing strategies', 3)
) AS c(name, code, description, credits)
WHERE p.code = 'CBA';
