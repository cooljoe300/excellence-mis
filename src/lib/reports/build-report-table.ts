import type { ReportsBundle } from '@/app/actions/reports';
import { formatCurrency, getAdmissionNumber, getFeeBalance } from '@/lib/utils';
import type { Attendance, Course, Enrollment, FeePayment, Program, Student } from '@/lib/types';

export type ReportKey =
  | 'executive-summary'
  | 'students-by-status'
  | 'students-by-program'
  | 'student-register'
  | 'active-students'
  | 'inactive-students'
  | 'graduated-students'
  | 'withdrawn-students'
  | 'student-contact-list'
  | 'incomplete-profiles'
  | 'fee-summary'
  | 'fee-ledger'
  | 'outstanding-fees'
  | 'zero-payment-students'
  | 'partially-paid-students'
  | 'fully-paid-students'
  | 'fee-collection-by-date'
  | 'fee-collection-by-program'
  | 'fee-collection-by-method'
  | 'programs'
  | 'courses'
  | 'enrollments'
  | 'attendance'
  | 'intake-summary'
  | 'program-enrollment-summary'
  | 'data-quality-students-without-programs'
  | 'data-quality-students-without-intake'
  | 'data-quality-students-without-phone'
  | 'data-quality-students-without-email';

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

    case 'active-students': {
      const students = filterStudents(data.students, filters).filter((s) => s.status === 'active');
      return {
        title: 'Active Students',
        headers: ['Admission No.', 'Name', 'Email', 'Phone', 'Program', 'Enrolled'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.phone ?? '—',
          (s.program as { name?: string } | null)?.name ?? '—',
          s.enrollment_date,
        ]),
        summary: `${students.length} active students · Generated ${generated}`,
      };
    }

    case 'inactive-students': {
      const students = filterStudents(data.students, filters).filter((s) => s.status === 'inactive');
      return {
        title: 'Inactive Students',
        headers: ['Admission No.', 'Name', 'Email', 'Phone', 'Program', 'Enrolled'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.phone ?? '—',
          (s.program as { name?: string } | null)?.name ?? '—',
          s.enrollment_date,
        ]),
        summary: `${students.length} inactive students · Generated ${generated}`,
      };
    }

    case 'graduated-students': {
      const students = filterStudents(data.students, filters).filter((s) => s.status === 'graduated');
      return {
        title: 'Graduated Students',
        headers: ['Admission No.', 'Name', 'Email', 'Phone', 'Program', 'Enrolled'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.phone ?? '—',
          (s.program as { name?: string } | null)?.name ?? '—',
          s.enrollment_date,
        ]),
        summary: `${students.length} graduated students · Generated ${generated}`,
      };
    }

    case 'withdrawn-students': {
      const students = filterStudents(data.students, filters).filter((s) => s.status === 'withdrawn');
      return {
        title: 'Withdrawn Students',
        headers: ['Admission No.', 'Name', 'Email', 'Phone', 'Program', 'Enrolled'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.phone ?? '—',
          (s.program as { name?: string } | null)?.name ?? '—',
          s.enrollment_date,
        ]),
        summary: `${students.length} withdrawn students · Generated ${generated}`,
      };
    }

    case 'student-contact-list': {
      const students = filterStudents(data.students, filters);
      return {
        title: 'Student Contact List',
        headers: ['Admission No.', 'Name', 'Phone', 'Email', 'Program'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.phone ?? '—',
          s.email,
          (s.program as { name?: string } | null)?.name ?? '—',
        ]),
        summary: `${students.length} students · Generated ${generated}`,
      };
    }

    case 'incomplete-profiles': {
      const students = filterStudents(data.students, filters).filter((s) => {
        return !s.phone || !s.email || !s.program_id || !s.intake_id;
      });
      const issues = students.map((s) => {
        const missing: string[] = [];
        if (!s.phone) missing.push('Phone');
        if (!s.email) missing.push('Email');
        if (!s.program_id) missing.push('Program');
        if (!s.intake_id) missing.push('Intake');
        return missing.join(', ');
      });
      return {
        title: 'Incomplete Student Profiles',
        headers: ['Admission No.', 'Name', 'Missing Information', 'Email', 'Phone'],
        rows: students.map((s, i) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          issues[i],
          s.email ?? '—',
          s.phone ?? '—',
        ]),
        summary: `${students.length} students with incomplete profiles · Generated ${generated}`,
      };
    }

    case 'outstanding-fees': {
      const fees = filterFees(data.fees, filters).filter((f) => getFeeBalance(f) > 0);
      const sortedFees = [...fees].sort((a, b) => getFeeBalance(b) - getFeeBalance(a));
      return {
        title: 'Outstanding Fees Report',
        headers: ['Student', 'Admission', 'Term', 'Total Required', 'Paid', 'Balance', 'Status'],
        rows: sortedFees.map((fee) => {
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
        summary: `${sortedFees.length} students with outstanding fees · Generated ${generated}`,
      };
    }

    case 'zero-payment-students': {
      const fees = filterFees(data.fees, filters).filter((f) => f.amount_paid === 0);
      return {
        title: 'Students With Zero Payment',
        headers: ['Student', 'Admission', 'Term', 'Total Required', 'Paid', 'Balance', 'Status'],
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
        summary: `${fees.length} students with zero payment · Generated ${generated}`,
      };
    }

    case 'partially-paid-students': {
      const fees = filterFees(data.fees, filters).filter((f) => f.amount_paid > 0 && getFeeBalance(f) > 0);
      return {
        title: 'Partially Paid Students',
        headers: ['Student', 'Admission', 'Term', 'Total Required', 'Paid', 'Balance', 'Status'],
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
        summary: `${fees.length} partially paid students · Generated ${generated}`,
      };
    }

    case 'fully-paid-students': {
      const fees = filterFees(data.fees, filters).filter((f) => getFeeBalance(f) === 0);
      return {
        title: 'Fully Paid Students',
        headers: ['Student', 'Admission', 'Term', 'Total Required', 'Paid', 'Balance', 'Status'],
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
        summary: `${fees.length} fully paid students · Generated ${generated}`,
      };
    }

    case 'fee-collection-by-date': {
      const fees = filterFees(data.fees, filters).filter((f) => f.status === 'paid' || f.status === 'partial');
      const byDate = fees.reduce((acc, fee) => {
        const date = fee.created_at?.slice(0, 10) || 'Unknown';
        if (!acc[date]) acc[date] = { count: 0, total: 0 };
        acc[date].count += 1;
        acc[date].total += Number(fee.amount_paid);
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
      return {
        title: 'Fee Collection by Date',
        headers: ['Date', 'Transactions', 'Total Collected'],
        rows: Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, data]) => [date, String(data.count), formatCurrency(data.total)]),
        summary: `${fees.length} transactions · Generated ${generated}`,
      };
    }

    case 'fee-collection-by-program': {
      const fees = filterFees(data.fees, filters).filter((f) => f.status === 'paid' || f.status === 'partial');
      const byProgram = fees.reduce((acc, fee) => {
        const student = fee.student as Student | undefined;
        const programName = (student?.program as { name?: string } | null)?.name ?? 'Unassigned';
        if (!acc[programName]) acc[programName] = { expected: 0, paid: 0, count: 0 };
        acc[programName].expected += Number(fee.amount);
        acc[programName].paid += Number(fee.amount_paid);
        acc[programName].count += 1;
        return acc;
      }, {} as Record<string, { expected: number; paid: number; count: number }>);
      return {
        title: 'Fee Collection by Program',
        headers: ['Program', 'Expected', 'Collected', 'Outstanding', 'Collection %', 'Students'],
        rows: Object.entries(byProgram).map(([program, data]) => {
          const outstanding = data.expected - data.paid;
          const collectionRate = data.expected > 0 ? ((data.paid / data.expected) * 100).toFixed(1) : 'N/A';
          return [
            program,
            formatCurrency(data.expected),
            formatCurrency(data.paid),
            formatCurrency(outstanding),
            `${collectionRate}%`,
            String(data.count),
          ];
        }),
        summary: `${Object.keys(byProgram).length} programs · Generated ${generated}`,
      };
    }

    case 'fee-collection-by-method': {
      const fees = filterFees(data.fees, filters).filter((f) => f.status === 'paid' || f.status === 'partial');
      const byMethod = fees.reduce((acc, fee) => {
        const method = fee.payment_method || 'Unknown';
        if (!acc[method]) acc[method] = { count: 0, total: 0 };
        acc[method].count += 1;
        acc[method].total += Number(fee.amount_paid);
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
      return {
        title: 'Fee Collection by Payment Method',
        headers: ['Payment Method', 'Transactions', 'Total Collected'],
        rows: Object.entries(byMethod)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([method, data]) => [method, String(data.count), formatCurrency(data.total)]),
        summary: `${fees.length} transactions · Generated ${generated}`,
      };
    }

    case 'intake-summary': {
      const students = filterStudents(data.students, filters);
      const byIntake = students.reduce((acc, student) => {
        const intake = (student.intake as { name?: string } | null)?.name ?? 'Unassigned';
        if (!acc[intake]) acc[intake] = { count: 0 };
        acc[intake].count += 1;
        return acc;
      }, {} as Record<string, { count: number }>);
      return {
        title: 'Intake Summary',
        headers: ['Intake', 'Students'],
        rows: Object.entries(byIntake).map(([intake, data]) => [intake, String(data.count)]),
        summary: `${students.length} students across ${Object.keys(byIntake).length} intakes · Generated ${generated}`,
      };
    }

    case 'program-enrollment-summary': {
      const students = filterStudents(data.students, filters);
      const byProgram = students.reduce((acc, student) => {
        const programName = (student.program as { name?: string } | null)?.name ?? 'Unassigned';
        if (!acc[programName]) acc[programName] = { active: 0, total: 0 };
        acc[programName].total += 1;
        if (student.status === 'active') acc[programName].active += 1;
        return acc;
      }, {} as Record<string, { active: number; total: number }>);
      return {
        title: 'Program Enrollment Summary',
        headers: ['Program', 'Active Students', 'Total Enrollments'],
        rows: Object.entries(byProgram).map(([program, data]) => [program, String(data.active), String(data.total)]),
        summary: `${students.length} students across ${Object.keys(byProgram).length} programs · Generated ${generated}`,
      };
    }

    case 'data-quality-students-without-programs': {
      const students = filterStudents(data.students, filters).filter((s) => !s.program_id);
      return {
        title: 'Students Without Programs',
        headers: ['Admission No.', 'Name', 'Email', 'Enrolled'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.enrollment_date,
        ]),
        summary: `${students.length} students without programs · Generated ${generated}`,
      };
    }

    case 'data-quality-students-without-intake': {
      const students = filterStudents(data.students, filters).filter((s) => !s.intake_id);
      return {
        title: 'Students Without Intake',
        headers: ['Admission No.', 'Name', 'Email', 'Enrolled'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          s.enrollment_date,
        ]),
        summary: `${students.length} students without intake · Generated ${generated}`,
      };
    }

    case 'data-quality-students-without-phone': {
      const students = filterStudents(data.students, filters).filter((s) => !s.phone);
      return {
        title: 'Students Without Phone Numbers',
        headers: ['Admission No.', 'Name', 'Email', 'Program'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.email,
          (s.program as { name?: string } | null)?.name ?? '—',
        ]),
        summary: `${students.length} students without phone numbers · Generated ${generated}`,
      };
    }

    case 'data-quality-students-without-email': {
      const students = filterStudents(data.students, filters).filter((s) => !s.email);
      return {
        title: 'Students Without Email Addresses',
        headers: ['Admission No.', 'Name', 'Phone', 'Program'],
        rows: students.map((s) => [
          getAdmissionNumber(s),
          `${s.first_name} ${s.last_name}`,
          s.phone ?? '—',
          (s.program as { name?: string } | null)?.name ?? '—',
        ]),
        summary: `${students.length} students without email addresses · Generated ${generated}`,
      };
    }
  }
}

export interface ReportOption {
  key: ReportKey;
  label: string;
  category: string;
}

export const REPORT_OPTIONS: ReportOption[] = [
  // Management Reports
  { key: 'executive-summary', label: 'Executive Summary', category: 'Management' },
  
  // Student Reports
  { key: 'student-register', label: 'Student Master Register', category: 'Students' },
  { key: 'students-by-status', label: 'Students by Status', category: 'Students' },
  { key: 'students-by-program', label: 'Students by Program', category: 'Students' },
  { key: 'active-students', label: 'Active Students', category: 'Students' },
  { key: 'inactive-students', label: 'Inactive Students', category: 'Students' },
  { key: 'graduated-students', label: 'Graduated Students', category: 'Students' },
  { key: 'withdrawn-students', label: 'Withdrawn Students', category: 'Students' },
  { key: 'student-contact-list', label: 'Student Contact List', category: 'Students' },
  { key: 'incomplete-profiles', label: 'Incomplete Student Profiles', category: 'Students' },
  
  // Finance Reports
  { key: 'fee-summary', label: 'Fees Summary', category: 'Finance' },
  { key: 'fee-ledger', label: 'Fee Payments Ledger', category: 'Finance' },
  { key: 'outstanding-fees', label: 'Outstanding Fees Report', category: 'Finance' },
  { key: 'zero-payment-students', label: 'Students With Zero Payment', category: 'Finance' },
  { key: 'partially-paid-students', label: 'Partially Paid Students', category: 'Finance' },
  { key: 'fully-paid-students', label: 'Fully Paid Students', category: 'Finance' },
  { key: 'fee-collection-by-date', label: 'Fee Collection by Date', category: 'Finance' },
  { key: 'fee-collection-by-program', label: 'Fee Collection by Program', category: 'Finance' },
  { key: 'fee-collection-by-method', label: 'Fee Collection by Payment Method', category: 'Finance' },
  
  // Academic Reports
  { key: 'programs', label: 'Program Register', category: 'Academic' },
  { key: 'courses', label: 'Course Register', category: 'Academic' },
  { key: 'enrollments', label: 'Enrollment Register', category: 'Academic' },
  { key: 'intake-summary', label: 'Intake Summary', category: 'Academic' },
  { key: 'program-enrollment-summary', label: 'Program Enrollment Summary', category: 'Academic' },
  { key: 'attendance', label: 'Attendance Register', category: 'Academic' },
  
  // Data Quality Reports
  { key: 'data-quality-students-without-programs', label: 'Students Without Programs', category: 'Data Quality' },
  { key: 'data-quality-students-without-intake', label: 'Students Without Intake', category: 'Data Quality' },
  { key: 'data-quality-students-without-phone', label: 'Students Without Phone Numbers', category: 'Data Quality' },
  { key: 'data-quality-students-without-email', label: 'Students Without Email Addresses', category: 'Data Quality' },
];
