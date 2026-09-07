export type UserRole = 'superadmin' | 'admin' | 'staff' | 'teacher' | 'student' | 'inactive';
export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'suspended' | 'withdrawn';
export type EnrollmentStatus = 'pending' | 'active' | 'completed' | 'dropped';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'waived';
export type PaymentSubmissionStatus = 'pending' | 'approved' | 'rejected';
export type DeregistrationRequestType = 'units' | 'full_withdrawal';
export type DeregistrationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type LmsSyncStatus = 'not_synced' | 'synced' | 'failed';
export type TimetableStatus = 'draft' | 'active' | 'archived';
export type TeachingMode = 'physical' | 'online' | 'hybrid';
export type RoomType = 'lecture_hall' | 'computer_lab' | 'laboratory' | 'seminar_room' | 'boardroom';
export type RegistrationSource = 'staff_registered' | 'self_registered';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  can_teach: boolean;
  staff_number: string | null;
  department: string | null;
  specialization: string | null;
  employment_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface AcademicTerm {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
}

export interface Intake {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_active: boolean;
  academic_year: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  name: string;
  code: string;
  admission_prefix: string | null;
  description: string | null;
  duration_months: number;
  tuition_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  program_id: string | null;
  name: string;
  code: string;
  description: string | null;
  credits: number;
  unit_fee: number;
  instructor_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  program?: Program;
  instructor?: Profile;
}

export interface Student {
  id: string;
  student_number: string;
  admission_number: string | null;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  program_id: string | null;
  intake_id: string | null;
  enrollment_date: string;
  status: StudentStatus;
  registration_source: RegistrationSource | null;
  lms_username: string | null;
  lms_user_id: string | null;
  lms_sync_status: LmsSyncStatus;
  lms_synced_at: string | null;
  lms_sync_error: string | null;
  id_card_issued_at: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  program?: Program;
  intake?: Intake;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  term_id: string;
  status: EnrollmentStatus;
  grade: string | null;
  score: number | null;
  enrolled_at: string;
  completed_at: string | null;
  student?: Student;
  course?: Course;
  term?: AcademicTerm;
  feesPaid?: number;
  feesBalance?: number;
  totalFees?: number;
}

export interface Attendance {
  id: string;
  enrollment_id: string;
  date: string;
  status: AttendanceStatus;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  enrollment?: Enrollment;
}

export interface FeePayment {
  id: string;
  student_id: string;
  term_id: string | null;
  amount: number;
  amount_paid: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  invoice_date: string | null;
  receipt_date: string | null;
  payment_method: string | null;
  reference_number: string | null;
  receipt_number: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  term?: AcademicTerm;
  items?: FeePaymentItem[];
  submissions?: FeePaymentSubmission[];
}

export interface FeePaymentItem {
  id: string;
  fee_payment_id: string;
  course_id: string;
  enrollment_id: string | null;
  amount: number;
  created_at: string;
  course?: Course;
}

export interface FeePaymentSubmission {
  id: string;
  fee_payment_id: string;
  student_id: string;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: PaymentSubmissionStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface StudentDeregistrationRequest {
  id: string;
  student_id: string;
  term_id: string | null;
  request_type: DeregistrationRequestType;
  course_ids: string[];
  reason: string;
  status: DeregistrationRequestStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  term?: AcademicTerm;
}

export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalPrograms: number;
  totalCourses: number;
  activeEnrollments: number;
  pendingFees: number;
  overdueFees: number;
  totalRevenue: number;
}

export interface TimeSlot {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_visible: boolean;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  building: string | null;
  capacity: number | null;
  type: RoomType;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Timetable {
  id: string;
  academic_year: string;
  semester: string;
  program_id: string | null;
  department: string | null;
  campus: string;
  intake_id: string | null;
  class_section: string | null;
  course_id: string | null;
  lecturer_id: string | null;
  room_id: string | null;
  day: string;
  start_time: string;
  end_time: string;
  duration: number | null;
  max_students: number | null;
  teaching_mode: TeachingMode;
  meeting_link: string | null;
  status: TimetableStatus;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  program?: Program;
  intake?: Intake;
  course?: Course;
  lecturer?: Profile;
  room?: Room;
}

export interface TimetableAuditLog {
  id: string;
  timetable_id: string;
  action: string;
  previous_value: any;
  new_value: any;
  performed_by: string | null;
  reason: string | null;
  created_at: string;
}
