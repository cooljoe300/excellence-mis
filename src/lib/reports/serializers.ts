import type {
  Attendance,
  Course,
  Enrollment,
  FeePayment,
  Program,
  Student,
} from '@/lib/types';
import type { DashboardStats } from '@/lib/types';
import { formatCurrency, getAdmissionNumber, getFeeBalance } from '@/lib/utils';

function programName(student: Student) {
  return (student.program as { name?: string } | null)?.name ?? '';
}

function intakeName(student: Student) {
  return (student.intake as { name?: string } | null)?.name ?? '';
}

export function buildExecutiveSummaryCsv(stats: DashboardStats, generatedAt: string) {
  return [
    ['Excellence Online College — Executive Summary'],
    ['Generated', generatedAt],
    [],
    ['Metric', 'Value'],
    ['Total students', String(stats.totalStudents)],
    ['Active students', String(stats.activeStudents)],
    ['Programs', String(stats.totalPrograms)],
    ['Courses', String(stats.totalCourses)],
    ['Active enrollments', String(stats.activeEnrollments)],
    ['Pending fee invoices', String(stats.pendingFees)],
    ['Overdue fee invoices', String(stats.overdueFees)],
    ['Total revenue collected (KES)', String(stats.totalRevenue)],
  ];
}

export function buildStudentsByStatusCsv(byStatus: Record<string, number>, generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Students by Status'],
    ['Generated', generatedAt],
    [],
    ['Status', 'Count'],
  ];
  for (const [status, count] of Object.entries(byStatus)) {
    rows.push([status, String(count)]);
  }
  return rows;
}

export function buildStudentsByProgramCsv(byProgram: Record<string, number>, generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Students by Program'],
    ['Generated', generatedAt],
    [],
    ['Program', 'Student count'],
  ];
  for (const [program, count] of Object.entries(byProgram)) {
    rows.push([program, String(count)]);
  }
  return rows;
}

export function buildStudentRegisterCsv(students: Student[], generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Student Register'],
    ['Generated', generatedAt],
    [],
    [
      'Admission number',
      'First name',
      'Last name',
      'Email',
      'Phone',
      'Program',
      'Intake',
      'Status',
      'Enrollment date',
      'LMS username',
      'LMS sync',
      'ID card issued',
    ],
  ];

  for (const student of students) {
    rows.push([
      getAdmissionNumber(student),
      student.first_name,
      student.last_name,
      student.email,
      student.phone ?? '',
      programName(student),
      intakeName(student),
      student.status,
      student.enrollment_date,
      student.lms_username ?? '',
      student.lms_sync_status,
      student.id_card_issued_at ?? '',
    ]);
  }

  return rows;
}

export function buildFeeSummaryCsv(
  stats: DashboardStats,
  feeSummary: Record<string, number>,
  generatedAt: string
) {
  const rows: string[][] = [
    ['Excellence Online College — Fee Collection Summary'],
    ['Generated', generatedAt],
    [],
    ['Total revenue collected (KES)', String(stats.totalRevenue)],
    ['Pending invoices', String(stats.pendingFees)],
    ['Overdue invoices', String(stats.overdueFees)],
    [],
    ['Invoice status', 'Record count'],
  ];
  for (const [status, count] of Object.entries(feeSummary)) {
    rows.push([status, String(count)]);
  }
  return rows;
}

export function buildFeeLedgerCsv(fees: FeePayment[], generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Fee Payments Ledger'],
    ['Generated', generatedAt],
    [],
    [
      'Student',
      'Admission number',
      'Term',
      'Description',
      'Amount (KES)',
      'Paid (KES)',
      'Balance (KES)',
      'Status',
      'Due date',
      'Paid date',
      'Payment method',
      'Reference',
      'Created',
    ],
  ];

  for (const fee of fees) {
    const student = fee.student as Student | undefined;
    const balance = getFeeBalance(fee);
    rows.push([
      student ? `${student.first_name} ${student.last_name}` : '',
      student ? getAdmissionNumber(student) : '',
      (fee.term as { name?: string } | null)?.name ?? '',
      fee.description ?? '',
      String(fee.amount),
      String(fee.amount_paid),
      String(balance),
      fee.status,
      fee.due_date ?? '',
      fee.paid_date ?? '',
      fee.payment_method ?? '',
      fee.reference_number ?? '',
      fee.created_at,
    ]);
  }

  return rows;
}

export function buildProgramsCsv(programs: Program[], generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Programs'],
    ['Generated', generatedAt],
    [],
    ['Code', 'Name', 'Duration (months)', 'Tuition fee (KES)', 'Active', 'Description'],
  ];

  for (const program of programs) {
    rows.push([
      program.code,
      program.name,
      String(program.duration_months),
      String(program.tuition_fee),
      program.is_active ? 'yes' : 'no',
      program.description ?? '',
    ]);
  }

  return rows;
}

export function buildCoursesCsv(courses: Course[], generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Courses'],
    ['Generated', generatedAt],
    [],
    ['Code', 'Name', 'Program', 'Credits', 'Unit fee (KES)', 'Active', 'Instructor'],
  ];

  for (const course of courses) {
    rows.push([
      course.code,
      course.name,
      (course.program as { name?: string } | null)?.name ?? '',
      String(course.credits),
      String(course.unit_fee),
      course.is_active ? 'yes' : 'no',
      (course.instructor as { full_name?: string } | null)?.full_name ?? '',
    ]);
  }

  return rows;
}

export function buildEnrollmentsCsv(enrollments: Enrollment[], generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Enrollments'],
    ['Generated', generatedAt],
    [],
    [
      'Student',
      'Admission number',
      'Course code',
      'Course name',
      'Term',
      'Status',
      'Grade',
      'Score',
      'Enrolled at',
      'Completed at',
    ],
  ];

  for (const enrollment of enrollments) {
    const student = enrollment.student as Student | undefined;
    const course = enrollment.course as { code?: string; name?: string } | undefined;
    rows.push([
      student ? `${student.first_name} ${student.last_name}` : '',
      student ? getAdmissionNumber(student) : '',
      course?.code ?? '',
      course?.name ?? '',
      (enrollment.term as { name?: string } | null)?.name ?? '',
      enrollment.status,
      enrollment.grade ?? '',
      enrollment.score != null ? String(enrollment.score) : '',
      enrollment.enrolled_at,
      enrollment.completed_at ?? '',
    ]);
  }

  return rows;
}

export function buildAttendanceCsv(attendance: Attendance[], generatedAt: string) {
  const rows: string[][] = [
    ['Excellence Online College — Attendance'],
    ['Generated', generatedAt],
    [],
    ['Date', 'Student', 'Admission number', 'Course', 'Status', 'Notes'],
  ];

  for (const record of attendance) {
    const enrollment = record.enrollment as
      | {
          student?: Student;
          course?: { code?: string; name?: string };
        }
      | undefined;
    const student = enrollment?.student;
    const course = enrollment?.course;
    rows.push([
      record.date,
      student ? `${student.first_name} ${student.last_name}` : '',
      student ? getAdmissionNumber(student) : '',
      course ? `${course.code ?? ''} — ${course.name ?? ''}` : '',
      record.status,
      record.notes ?? '',
    ]);
  }

  return rows;
}
