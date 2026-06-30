import type { ReportsBundle } from '@/app/actions/reports';
import { formatCurrency, getAdmissionNumber, getFeeBalance } from '@/lib/utils';
import type { Attendance, Course, Enrollment, FeePayment, Program, Student } from '@/lib/types';

export type ReportKey =
  | 'executive-summary'
  | 'students-by-status'
  | 'students-by-program'
  | 'student-register'
  | 'fee-summary'
  | 'fee-ledger'
  | 'programs'
  | 'courses'
  | 'enrollments'
  | 'attendance';

export interface ReportFilters {
  search: string;
  programId: string;
  status: string;
  termName: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  search: '',
  programId: '',
  status: '',
  termName: '',
  dateFrom: '',
  dateTo: '',
};

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
  summary?: string;
}

function matchesSearch(values: string[], search: string) {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  return values.some((v) => v.toLowerCase().includes(q));
}

function inDateRange(date: string | null | undefined, from: string, to: string) {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function filterStudents(students: Student[], filters: ReportFilters) {
  return students.filter((student) => {
    if (filters.programId && student.program_id !== filters.programId) return false;
    if (filters.status && student.status !== filters.status) return false;
    if (
      !matchesSearch(
        [
          student.first_name,
          student.last_name,
          student.email,
          getAdmissionNumber(student),
          (student.program as { name?: string } | null)?.name ?? '',
        ],
        filters.search
      )
    ) {
      return false;
    }
    return true;
  });
}

export function filterFees(fees: FeePayment[], filters: ReportFilters) {
  return fees.filter((fee) => {
    const student = fee.student as Student | undefined;
    if (filters.programId && student?.program_id !== filters.programId) return false;
    if (filters.status && fee.status !== filters.status) return false;
    const termName = (fee.term as { name?: string } | null)?.name ?? '';
    if (filters.termName && termName !== filters.termName) return false;
    if (!inDateRange(fee.created_at?.slice(0, 10), filters.dateFrom, filters.dateTo)) return false;
    if (
      student &&
      !matchesSearch(
        [
          student.first_name,
          student.last_name,
          getAdmissionNumber(student),
          fee.description ?? '',
        ],
        filters.search
      )
    ) {
      return false;
    }
    return true;
  });
}

export function filterCourses(courses: Course[], filters: ReportFilters) {
  return courses.filter((course) => {
    if (filters.programId && course.program_id !== filters.programId) return false;
    if (
      !matchesSearch(
        [course.code, course.name, (course.program as { name?: string } | null)?.name ?? ''],
        filters.search
      )
    ) {
      return false;
    }
    return true;
  });
}

export function filterEnrollments(enrollments: Enrollment[], filters: ReportFilters) {
  return enrollments.filter((enrollment) => {
    const student = enrollment.student as Student | undefined;
    const course = enrollment.course as { program_id?: string | null } | undefined;
    if (filters.programId && student?.program_id !== filters.programId && course?.program_id !== filters.programId) {
      return false;
    }
    if (filters.status && enrollment.status !== filters.status) return false;
    const termName = (enrollment.term as { name?: string } | null)?.name ?? '';
    if (filters.termName && termName !== filters.termName) return false;
    if (
      student &&
      !matchesSearch(
        [
          student.first_name,
          student.last_name,
          getAdmissionNumber(student),
          (enrollment.course as { code?: string; name?: string } | undefined)?.code ?? '',
        ],
        filters.search
      )
    ) {
      return false;
    }
    return true;
  });
}

export function filterAttendance(attendance: Attendance[], filters: ReportFilters) {
  return attendance.filter((record) => {
    if (filters.status && record.status !== filters.status) return false;
    if (!inDateRange(record.date, filters.dateFrom, filters.dateTo)) return false;
    const enrollment = record.enrollment as
      | { student?: Student; course?: { code?: string; name?: string } }
      | undefined;
    const student = enrollment?.student;
    if (
      student &&
      !matchesSearch(
        [
          student.first_name,
          student.last_name,
          getAdmissionNumber(student),
          enrollment?.course?.code ?? '',
        ],
        filters.search
      )
    ) {
      return false;
    }
    return true;
  });
}

export function getTermOptions(data: ReportsBundle) {
  const terms = new Set<string>();
  for (const fee of data.fees) {
    const name = (fee.term as { name?: string } | null)?.name;
    if (name) terms.add(name);
  }
  for (const enrollment of data.enrollments) {
    const name = (enrollment.term as { name?: string } | null)?.name;
    if (name) terms.add(name);
  }
  return [...terms].sort();
}

export function buildReportTable(
  key: ReportKey,
  data: ReportsBundle,
  filters: ReportFilters
): ReportTable {
  const generated = new Date(data.generatedAt).toLocaleString();

  switch (key) {
    case 'executive-summary':
      return {
        title: 'Executive Summary',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total students', String(data.stats.totalStudents)],
          ['Active students', String(data.stats.activeStudents)],
          ['Programs', String(data.stats.totalPrograms)],
          ['Courses', String(data.stats.totalCourses)],
          ['Active enrollments', String(data.stats.activeEnrollments)],
          ['Pending fee invoices', String(data.stats.pendingFees)],
          ['Overdue fee invoices', String(data.stats.overdueFees)],
          ['Revenue collected', formatCurrency(data.stats.totalRevenue)],
        ],
        summary: `Generated ${generated}`,
      };

    case 'students-by-status': {
      const students = filterStudents(data.students, filters);
      const byStatus = students.reduce(
        (acc, s) => {
          acc[s.status] = (acc[s.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      return {
        title: 'Students by Status',
        headers: ['Status', 'Count'],
        rows: Object.entries(byStatus).map(([status, count]) => [status, String(count)]),
        summary: `${students.length} students · Generated ${generated}`,
      };
    }

    case 'students-by-program': {
      const students = filterStudents(data.students, filters);
      const byProgram = students.reduce(
        (acc, s) => {
          const name = (s.program as { name?: string } | null)?.name ?? 'Unassigned';
          acc[name] = (acc[name] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      return {
        title: 'Students by Program',
        headers: ['Program', 'Students'],
        rows: Object.entries(byProgram).map(([program, count]) => [program, String(count)]),
        summary: `${students.length} students · Generated ${generated}`,
      };
    }

    case 'student-register': {
      const students = filterStudents(data.students, filters);
      return {
        title: 'Student Register',
        headers: [
          'Admission No.',
          'Name',
          'Email',
          'Phone',
          'Program',
          'Status',
          'Enrolled',
        ],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.phone ?? '—',
          (s.program as { name?: string } | null)?.name ?? '—',
          s.status,
          s.enrollment_date,
        ]),
        summary: `${students.length} records · Generated ${generated}`,
      };
    }

    case 'fee-summary': {
      const fees = filterFees(data.fees, filters);
      const feeSummary = fees.reduce(
        (acc, fee) => {
          acc[fee.status] = (acc[fee.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      const revenue = fees.reduce((sum, f) => sum + Number(f.amount_paid), 0);
      return {
        title: 'Fee Collection Summary',
        headers: ['Item', 'Value'],
        rows: [
          ['Revenue collected', formatCurrency(revenue)],
          ...Object.entries(feeSummary).map(([status, count]) => [
            `Invoices (${status})`,
            String(count),
          ]),
        ],
        summary: `${fees.length} invoices · Generated ${generated}`,
      };
    }

    case 'fee-ledger': {
      const fees = filterFees(data.fees, filters);
      return {
        title: 'Fee Payments Ledger',
        headers: ['Student', 'Admission', 'Term', 'Amount', 'Paid', 'Balance', 'Status'],
        rows: fees.map((fee) => {
          const student = fee.student as Student | undefined;
          return [
            student ? `${student.first_name} ${student.last_name}` : '—',
            student ? getAdmissionNumber(student) : '—',
            (fee.term as { name?: string } | null)?.name ?? '—',
            formatCurrency(fee.amount),
            formatCurrency(fee.amount_paid),
            formatCurrency(getFeeBalance(fee)),
            fee.status,
          ];
        }),
        summary: `${fees.length} records · Generated ${generated}`,
      };
    }

    case 'programs': {
      const programs = data.programs.filter((p) => {
        if (filters.programId && p.id !== filters.programId) return false;
        return matchesSearch([p.code, p.name], filters.search);
      });
      return {
        title: 'Programs',
        headers: ['Code', 'Prefix', 'Name', 'Duration', 'Tuition', 'Active'],
        rows: programs.map((p: Program) => [
          p.code,
          (p.admission_prefix || p.code).toUpperCase(),
          p.name,
          `${p.duration_months} mo`,
          formatCurrency(p.tuition_fee),
          p.is_active ? 'Yes' : 'No',
        ]),
        summary: `${programs.length} programs · Generated ${generated}`,
      };
    }

    case 'courses': {
      const courses = filterCourses(data.courses, filters);
      return {
        title: 'Courses',
        headers: ['Code', 'Name', 'Program', 'Credits', 'Unit fee', 'Active'],
        rows: courses.map((c) => [
          c.code,
          c.name,
          (c.program as { name?: string } | null)?.name ?? '—',
          String(c.credits),
          formatCurrency(c.unit_fee),
          c.is_active ? 'Yes' : 'No',
        ]),
        summary: `${courses.length} courses · Generated ${generated}`,
      };
    }

    case 'enrollments': {
      const enrollments = filterEnrollments(data.enrollments, filters);
      return {
        title: 'Enrollments',
        headers: ['Student', 'Admission', 'Course', 'Term', 'Status'],
        rows: enrollments.map((e) => {
          const student = e.student as Student | undefined;
          const course = e.course as { code?: string; name?: string } | undefined;
          return [
            student ? `${student.first_name} ${student.last_name}` : '—',
            student ? getAdmissionNumber(student) : '—',
            course ? `${course.code} — ${course.name}` : '—',
            (e.term as { name?: string } | null)?.name ?? '—',
            e.status,
          ];
        }),
        summary: `${enrollments.length} records · Generated ${generated}`,
      };
    }

    case 'attendance': {
      const records = filterAttendance(data.attendance, filters);
      return {
        title: 'Attendance',
        headers: ['Date', 'Student', 'Admission', 'Course', 'Status'],
        rows: records.map((r) => {
          const enrollment = r.enrollment as
            | { student?: Student; course?: { code?: string; name?: string } }
            | undefined;
          const student = enrollment?.student;
          const course = enrollment?.course;
          return [
            r.date,
            student ? `${student.first_name} ${student.last_name}` : '—',
            student ? getAdmissionNumber(student) : '—',
            course ? `${course.code ?? ''} — ${course.name ?? ''}` : '—',
            r.status,
          ];
        }),
        summary: `${records.length} records · Generated ${generated}`,
      };
    }
  }
}

export const REPORT_OPTIONS: { key: ReportKey; label: string }[] = [
  { key: 'executive-summary', label: 'Executive summary' },
  { key: 'students-by-status', label: 'Students by status' },
  { key: 'students-by-program', label: 'Students by program' },
  { key: 'student-register', label: 'Student register' },
  { key: 'fee-summary', label: 'Fee summary' },
  { key: 'fee-ledger', label: 'Fee ledger' },
  { key: 'programs', label: 'Programs' },
  { key: 'courses', label: 'Courses' },
  { key: 'enrollments', label: 'Enrollments' },
  { key: 'attendance', label: 'Attendance' },
];
