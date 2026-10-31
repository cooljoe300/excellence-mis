import type { ReportsBundle } from '@/app/actions/reports';
import { formatCurrency, getAdmissionNumber } from '@/lib/utils';
import {
  classifyStudentFees,
  invoiceBalance,
  invoiceBilled,
  invoiceCredit,
  invoicePaid,
  studentFeeStatusLabel,
  summarizeFeeTotals,
  summarizeFeesByStudent,
  type StudentFeeSummary,
} from '@/lib/fee-money';
import type { Attendance, Course, Enrollment, FeePayment, Program, Student } from '@/lib/types';
import {
  STUDENT_LIST_HEADERS,
  admissionNo,
  displayValue,
  intakeName,
  programName,
  studentDisplayName,
  studentEmail,
  studentListRow,
  studentPhone,
} from '@/lib/reports/student-fields';

export type ReportKey =
  | 'executive-summary'
  | 'students-by-status'
  | 'students-by-program'
  | 'students-by-intake'
  | 'student-register'
  | 'active-students'
  | 'inactive-students'
  | 'new-admissions'
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
  | 'students-with-balances'
  | 'fee-collection-by-date'
  | 'fee-collection-by-program'
  | 'fee-collection-by-method'
  | 'programs'
  | 'courses'
  | 'enrollments'
  | 'unit-enrollments'
  | 'student-academic-records'
  | 'attendance'
  | 'intake-summary'
  | 'program-enrollment-summary'
  | 'admission-statistics'
  | 'data-quality-students-without-programs'
  | 'data-quality-students-without-intake'
  | 'data-quality-students-without-phone'
  | 'data-quality-students-without-email';

export interface ReportFilters {
  search: string;
  programId: string;
  intakeId: string;
  status: string;
  gender: string;
  paymentStatus: string;
  studentName: string;
  admissionNumber: string;
  termName: string;
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  search: '',
  programId: '',
  intakeId: '',
  status: '',
  gender: '',
  paymentStatus: '',
  studentName: '',
  admissionNumber: '',
  termName: '',
  dateFrom: '',
  dateTo: '',
};

export interface ReportStat {
  label: string;
  value: string;
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
  summary?: string;
  stats?: ReportStat[];
  rowStudentIds?: Array<string | null>;
  appliedFilters?: string[];
  landscape?: boolean;
}

function matchesSearch(values: string[], search: string) {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  return values.some((v) => v.toLowerCase().includes(q));
}

function inDateRange(date: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;
  if (!date) return false;
  const day = date.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function studentSearchHaystack(student: Student) {
  return [
    student.first_name,
    student.last_name,
    student.email,
    student.phone ?? '',
    getAdmissionNumber(student),
    student.student_number,
    student.program?.name ?? '',
    student.intake?.name ?? '',
  ];
}

export function describeFilters(filters: ReportFilters, data: ReportsBundle) {
  const labels: string[] = [];
  if (filters.programId) {
    labels.push(`Programme: ${data.programs.find((p) => p.id === filters.programId)?.name ?? filters.programId}`);
  }
  if (filters.intakeId) {
    labels.push(`Intake: ${data.intakes.find((i) => i.id === filters.intakeId)?.name ?? filters.intakeId}`);
  }
  if (filters.status) labels.push(`Status: ${filters.status}`);
  if (filters.gender) labels.push(`Gender: ${filters.gender}`);
  if (filters.paymentStatus) labels.push(`Payment: ${filters.paymentStatus}`);
  if (filters.studentName) labels.push(`Name: ${filters.studentName}`);
  if (filters.admissionNumber) labels.push(`Admission: ${filters.admissionNumber}`);
  if (filters.termName) labels.push(`Semester: ${filters.termName}`);
  if (filters.dateFrom) labels.push(`From: ${filters.dateFrom}`);
  if (filters.dateTo) labels.push(`To: ${filters.dateTo}`);
  if (filters.search) labels.push(`Search: ${filters.search}`);
  return labels;
}

export function filterStudents(students: Student[], filters: ReportFilters) {
  return students.filter((student) => {
    if (filters.programId && student.program_id !== filters.programId) return false;
    if (filters.intakeId && student.intake_id !== filters.intakeId) return false;
    if (filters.status && student.status !== filters.status) return false;
    if (filters.gender && (student.gender || '').toLowerCase() !== filters.gender.toLowerCase()) return false;
    if (filters.studentName) {
      const name = `${student.first_name} ${student.last_name}`.toLowerCase();
      if (!name.includes(filters.studentName.trim().toLowerCase())) return false;
    }
    if (filters.admissionNumber) {
      const admission = getAdmissionNumber(student).toLowerCase();
      if (!admission.includes(filters.admissionNumber.trim().toLowerCase())) return false;
    }
    if (!inDateRange(student.enrollment_date, filters.dateFrom, filters.dateTo) && (filters.dateFrom || filters.dateTo)) {
      if (!inDateRange(student.created_at, filters.dateFrom, filters.dateTo)) return false;
    }
    if (!matchesSearch(studentSearchHaystack(student), filters.search)) return false;
    return true;
  });
}

export function filterFees(fees: FeePayment[], filters: ReportFilters) {
  return fees.filter((fee) => {
    const student = fee.student;
    if (filters.programId && student?.program_id !== filters.programId) return false;
    if (filters.intakeId && student?.intake_id !== filters.intakeId) return false;
    // Student status filters the student record; payment status filters the invoice.
    if (filters.status && student?.status !== filters.status) return false;
    if (filters.paymentStatus && fee.status !== filters.paymentStatus) return false;
    const termName = fee.term?.name ?? '';
    if (filters.termName && termName !== filters.termName) return false;
    if (!inDateRange(fee.created_at?.slice(0, 10), filters.dateFrom, filters.dateTo)) return false;
    if (student) {
      if (filters.studentName) {
        const name = `${student.first_name} ${student.last_name}`.toLowerCase();
        if (!name.includes(filters.studentName.trim().toLowerCase())) return false;
      }
      if (filters.admissionNumber) {
        const admission = getAdmissionNumber(student).toLowerCase();
        if (!admission.includes(filters.admissionNumber.trim().toLowerCase())) return false;
      }
      if (filters.gender && (student.gender || '').toLowerCase() !== filters.gender.toLowerCase()) return false;
      if (!matchesSearch([...studentSearchHaystack(student), fee.description ?? ''], filters.search)) return false;
    } else if (filters.search || filters.studentName || filters.admissionNumber) {
      return false;
    }
    return true;
  });
}

export function filterCourses(courses: Course[], filters: ReportFilters) {
  return courses.filter((course) => {
    if (filters.programId && course.program_id !== filters.programId) return false;
    if (!matchesSearch([course.code, course.name, course.program?.name ?? ''], filters.search)) return false;
    return true;
  });
}

export function filterEnrollments(enrollments: Enrollment[], filters: ReportFilters) {
  return enrollments.filter((enrollment) => {
    const student = enrollment.student;
    const course = enrollment.course;
    if (filters.programId && student?.program_id !== filters.programId && course?.program_id !== filters.programId) {
      return false;
    }
    if (filters.intakeId && student?.intake_id !== filters.intakeId) return false;
    if (filters.status && enrollment.status !== filters.status) return false;
    const termName = enrollment.term?.name ?? '';
    if (filters.termName && termName !== filters.termName) return false;
    if (!inDateRange(enrollment.enrolled_at, filters.dateFrom, filters.dateTo)) return false;
    if (student) {
      if (filters.studentName) {
        const name = `${student.first_name} ${student.last_name}`.toLowerCase();
        if (!name.includes(filters.studentName.trim().toLowerCase())) return false;
      }
      if (filters.admissionNumber) {
        const admission = getAdmissionNumber(student).toLowerCase();
        if (!admission.includes(filters.admissionNumber.trim().toLowerCase())) return false;
      }
      if (!matchesSearch([...studentSearchHaystack(student), course?.code ?? '', course?.name ?? ''], filters.search)) {
        return false;
      }
    }
    return true;
  });
}

export function filterAttendance(attendance: Attendance[], filters: ReportFilters) {
  return attendance.filter((record) => {
    if (filters.status && record.status !== filters.status) return false;
    if (!inDateRange(record.date, filters.dateFrom, filters.dateTo)) return false;
    const student = record.enrollment?.student;
    const course = record.enrollment?.course;
    if (filters.programId && student?.program_id !== filters.programId) return false;
    if (filters.intakeId && student?.intake_id !== filters.intakeId) return false;
    if (student) {
      if (filters.studentName) {
        const name = `${student.first_name} ${student.last_name}`.toLowerCase();
        if (!name.includes(filters.studentName.trim().toLowerCase())) return false;
      }
      if (filters.admissionNumber) {
        const admission = getAdmissionNumber(student).toLowerCase();
        if (!admission.includes(filters.admissionNumber.trim().toLowerCase())) return false;
      }
      if (!matchesSearch([...studentSearchHaystack(student), course?.code ?? ''], filters.search)) return false;
    }
    return true;
  });
}

export function getTermOptions(data: ReportsBundle) {
  const terms = new Set<string>();
  for (const fee of data.fees) {
    if (fee.term?.name) terms.add(fee.term.name);
  }
  for (const enrollment of data.enrollments) {
    if (enrollment.term?.name) terms.add(enrollment.term.name);
  }
  return [...terms].sort();
}

function studentListing(
  title: string,
  students: Student[],
  generated: string,
  filters: string[],
  extraStats?: ReportStat[]
): ReportTable {
  return {
    title,
    headers: STUDENT_LIST_HEADERS,
    rows: students.map((student, index) => studentListRow(student, index)),
    rowStudentIds: students.map((student) => student.id),
    summary: `${students.length} records · Generated ${generated}`,
    appliedFilters: filters,
    landscape: true,
    stats: [
      { label: 'Total Students', value: String(students.length) },
      { label: 'Active', value: String(students.filter((s) => s.status === 'active').length) },
      { label: 'Inactive', value: String(students.filter((s) => s.status === 'inactive').length) },
      ...(extraStats ?? []),
    ],
  };
}

function feeStudentHeaders() {
  return [
    'Student',
    'Admission No.',
    'Programme',
    'Intake',
    'Phone',
    'Email',
    'Term',
    'Billed',
    'Paid',
    'Balance',
    'Credit',
    'Status',
  ];
}

function feeStudentRow(fee: FeePayment): string[] {
  const student = fee.student;
  return [
    studentDisplayName(student),
    admissionNo(student),
    programName(student),
    intakeName(student),
    studentPhone(student),
    studentEmail(student),
    displayValue(fee.term?.name),
    formatCurrency(invoiceBilled(fee)),
    formatCurrency(invoicePaid(fee)),
    formatCurrency(invoiceBalance(fee)),
    formatCurrency(invoiceCredit(fee)),
    displayValue(fee.status),
  ];
}

function aggregatedStudentFeeRow(item: StudentFeeSummary): string[] {
  const student = item.student;
  return [
    studentDisplayName(student),
    admissionNo(student),
    programName(student),
    intakeName(student),
    studentPhone(student),
    studentEmail(student),
    'All Terms',
    formatCurrency(item.billed),
    formatCurrency(item.paid),
    formatCurrency(item.balance),
    formatCurrency(item.credit),
    studentFeeStatusLabel(item),
  ];
}

function feeStats(fees: FeePayment[]): ReportStat[] {
  const totals = summarizeFeeTotals(fees);
  return [
    { label: 'Total Billed', value: formatCurrency(totals.billed) },
    { label: 'Total Paid', value: formatCurrency(totals.paid) },
    { label: 'Outstanding Balance', value: formatCurrency(totals.outstanding) },
    { label: 'Credit Balance', value: formatCurrency(totals.credit) },
    { label: 'Students with Balances', value: String(totals.studentsWithBalance) },
  ];
}

function selectedStudentFeeStats(fees: FeePayment[], summaries: StudentFeeSummary[]): ReportStat[] {
  const ids = new Set(summaries.map((summary) => summary.studentId));
  return feeStats(fees.filter((fee) => ids.has(fee.student_id)));
}

function studentFeeReport(
  title: string,
  description: string,
  fees: FeePayment[],
  summaries: StudentFeeSummary[],
  generated: string,
  applied: string[]
): ReportTable {
  return {
    title,
    headers: feeStudentHeaders(),
    rows: summaries.map(aggregatedStudentFeeRow),
    rowStudentIds: summaries.map((summary) => summary.studentId),
    summary: `${description} · ${summaries.length} students · Generated ${generated}`,
    appliedFilters: applied,
    landscape: true,
    stats: selectedStudentFeeStats(fees, summaries),
  };
}

export function buildReportTable(
  key: ReportKey,
  data: ReportsBundle,
  filters: ReportFilters
): ReportTable {
  const generated = new Date(data.generatedAt).toLocaleString();
  const applied = describeFilters(filters, data);
  const students = filterStudents(data.students, filters);
  const fees = filterFees(data.fees, filters);
  const enrollments = filterEnrollments(data.enrollments, filters);

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
        appliedFilters: applied,
        stats: [
          { label: 'Total Students', value: String(data.stats.totalStudents) },
          { label: 'Active Students', value: String(data.stats.activeStudents) },
          { label: 'Programmes', value: String(data.stats.totalPrograms) },
          { label: 'Intakes', value: String(data.intakes.length) },
        ],
      };

    case 'students-by-status':
    case 'student-register':
    case 'student-contact-list':
      return studentListing(
        key === 'students-by-status' ? 'Students by Status' : key === 'student-contact-list' ? 'Student Contact List' : 'All Students',
        students,
        generated,
        applied,
        [
          { label: 'Programmes', value: String(new Set(students.map((s) => s.program_id).filter(Boolean)).size) },
          { label: 'Intakes', value: String(new Set(students.map((s) => s.intake_id).filter(Boolean)).size) },
        ]
      );

    case 'students-by-program': {
      const byProgram = students.reduce(
        (acc, student) => {
          const name = student.program?.name ?? 'Unassigned';
          if (!acc[name]) acc[name] = { count: 0, active: 0 };
          acc[name].count += 1;
          if (student.status === 'active') acc[name].active += 1;
          return acc;
        },
        {} as Record<string, { count: number; active: number }>
      );
      return {
        title: 'Students by Programme',
        headers: ['Programme', 'Total Students', 'Active Students'],
        rows: Object.entries(byProgram)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([program, item]) => [program, String(item.count), String(item.active)]),
        summary: `${Object.keys(byProgram).length} programmes · ${students.length} total students · Generated ${generated}`,
        appliedFilters: applied,
        stats: [
          { label: 'Total Programmes', value: String(Object.keys(byProgram).length) },
          { label: 'Total Students', value: String(students.length) },
          { label: 'Active Students', value: String(students.filter((s) => s.status === 'active').length) },
        ],
      };
    }

    case 'students-by-intake': {
      const byIntake = students.reduce(
        (acc, student) => {
          const name = student.intake?.name ?? 'Unassigned';
          if (!acc[name]) acc[name] = { count: 0, active: 0 };
          acc[name].count += 1;
          if (student.status === 'active') acc[name].active += 1;
          return acc;
        },
        {} as Record<string, { count: number; active: number }>
      );
      return {
        title: 'Students by Intake',
        headers: ['Intake', 'Total Students', 'Active Students'],
        rows: Object.entries(byIntake)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([intake, item]) => [intake, String(item.count), String(item.active)]),
        summary: `${Object.keys(byIntake).length} intakes · ${students.length} total students · Generated ${generated}`,
        appliedFilters: applied,
        stats: [
          { label: 'Total Intakes', value: String(Object.keys(byIntake).length) },
          { label: 'Total Students', value: String(students.length) },
          { label: 'Active Students', value: String(students.filter((s) => s.status === 'active').length) },
        ],
      };
    }

    case 'active-students':
      return studentListing(
        'Active Students',
        students.filter((s) => s.status === 'active'),
        generated,
        applied
      );

    case 'inactive-students':
      return studentListing(
        'Inactive Students',
        students.filter((s) => s.status === 'inactive'),
        generated,
        applied
      );

    case 'new-admissions': {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffDay = cutoff.toISOString().slice(0, 10);
      const admissions = students.filter((s) => {
        if (filters.dateFrom || filters.dateTo) return true;
        const enrolled = s.enrollment_date?.slice(0, 10) || s.created_at?.slice(0, 10);
        return Boolean(enrolled && enrolled >= cutoffDay);
      });
      return studentListing('New Admissions', admissions, generated, applied);
    }

    case 'graduated-students':
      return studentListing(
        'Graduated Students',
        students.filter((s) => s.status === 'graduated'),
        generated,
        applied
      );

    case 'withdrawn-students':
      return studentListing(
        'Withdrawn Students',
        students.filter((s) => s.status === 'withdrawn'),
        generated,
        applied
      );

    case 'incomplete-profiles': {
      const incomplete = students.filter((s) => !s.phone || !s.email || !s.program_id || !s.intake_id);
      return {
        title: 'Incomplete Student Profiles',
        headers: [...STUDENT_LIST_HEADERS, 'Missing'],
        rows: incomplete.map((s, i) => {
          const missing: string[] = [];
          if (!s.phone) missing.push('Phone');
          if (!s.email) missing.push('Email');
          if (!s.program_id) missing.push('Programme');
          if (!s.intake_id) missing.push('Intake');
          return [...studentListRow(s, i), missing.join(', ') || 'N/A'];
        }),
        rowStudentIds: incomplete.map((s) => s.id),
        summary: `${incomplete.length} students with incomplete profiles · Generated ${generated}`,
        appliedFilters: applied,
        landscape: true,
        stats: [{ label: 'Incomplete Profiles', value: String(incomplete.length) }],
      };
    }

    case 'fee-summary': {
      const totals = summarizeFeeTotals(fees);
      const feeSummary = fees.reduce(
        (acc, fee) => {
          acc[fee.status] = (acc[fee.status] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      return {
        title: 'Fee Collection Summary',
        headers: ['Item', 'Value'],
        rows: [
          ['Total billed', formatCurrency(totals.billed)],
          ['Revenue collected', formatCurrency(totals.paid)],
          ['Outstanding balance', formatCurrency(totals.outstanding)],
          ['Credit balance', formatCurrency(totals.credit)],
          ['Students with balances', String(totals.studentsWithBalance)],
          ...Object.entries(feeSummary).map(([status, count]) => [`Invoices (${status})`, String(count)]),
        ],
        summary: `${fees.length} invoices · ${summarizeFeesByStudent(fees).length} students · Generated ${generated}`,
        appliedFilters: applied,
        stats: feeStats(fees),
      };
    }

    case 'fee-ledger': {
      // One row per invoice — the ledger must match the invoice pages exactly.
      const students = new Set(fees.map((fee) => fee.student_id)).size;
      return {
        title: 'Fee Payments Ledger',
        headers: feeStudentHeaders(),
        rows: fees.map(feeStudentRow),
        rowStudentIds: fees.map((fee) => fee.student_id),
        summary: `${fees.length} invoices for ${students} students · Generated ${generated}`,
        appliedFilters: applied,
        landscape: true,
        stats: feeStats(fees),
      };
    }

    case 'outstanding-fees': {
      const outstanding = summarizeFeesByStudent(fees)
        .filter((summary) => summary.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      return studentFeeReport(
        'Outstanding Fees',
        'Outstanding balances',
        fees,
        outstanding,
        generated,
        applied
      );
    }

    case 'zero-payment-students': {
      const zero = summarizeFeesByStudent(fees)
        .filter((summary) => summary.billed > 0 && summary.paid === 0)
        .sort((a, b) => b.balance - a.balance);
      return studentFeeReport(
        'Students With Zero Payment',
        'Students with no payments received',
        fees,
        zero,
        generated,
        applied
      );
    }

    case 'partially-paid-students': {
      const partial = summarizeFeesByStudent(fees)
        .filter((summary) => summary.paid > 0 && summary.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      return studentFeeReport(
        'Partially Paid Students',
        'Students with partial payments',
        fees,
        partial,
        generated,
        applied
      );
    }

    case 'fully-paid-students': {
      const settled = summarizeFeesByStudent(fees)
        .filter((summary) => classifyStudentFees(summary) === 'settled')
        .sort((a, b) => b.paid - a.paid);
      return studentFeeReport(
        'Fully Paid Students',
        'Students with no remaining balance',
        fees,
        settled,
        generated,
        applied
      );
    }

    case 'students-with-balances': {
      const rows = summarizeFeesByStudent(fees)
        .filter((summary) => summary.balance > 0)
        .sort((a, b) => b.balance - a.balance);
      return {
        title: 'Students with Balances',
        headers: feeStudentHeaders(),
        rows: rows.map(aggregatedStudentFeeRow),
        rowStudentIds: rows.map((summary) => summary.studentId),
        summary: `${rows.length} students with balances · Generated ${generated}`,
        appliedFilters: applied,
        landscape: true,
        stats: [
          { label: 'Students with Balances', value: String(rows.length) },
          { label: 'Outstanding Balance', value: formatCurrency(rows.reduce((sum, item) => sum + item.balance, 0)) },
          { label: 'Credit Balance', value: formatCurrency(rows.reduce((sum, item) => sum + item.credit, 0)) },
        ],
      };
    }

    case 'fee-collection-by-date': {
      // Collections are grouped by the date the money was received.
      const byDate = new Map<string, { count: number; total: number }>();
      for (const fee of fees) {
        const paid = invoicePaid(fee);
        if (paid <= 0) continue;
        const date = fee.paid_date?.slice(0, 10) || fee.created_at?.slice(0, 10) || 'Unknown';
        const current = byDate.get(date) ?? { count: 0, total: 0 };
        current.count += 1;
        current.total += paid;
        byDate.set(date, current);
      }
      const collected = [...byDate.values()].reduce((sum, item) => sum + item.total, 0);
      return {
        title: 'Fee Collection by Date',
        headers: ['Date', 'Invoices', 'Total Collected'],
        rows: [...byDate.entries()]
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, item]) => [date, String(item.count), formatCurrency(item.total)]),
        summary: `${collected ? formatCurrency(collected) : formatCurrency(0)} collected across ${byDate.size} dates · Generated ${generated}`,
        appliedFilters: applied,
        stats: [
          { label: 'Total Collected', value: formatCurrency(collected) },
          { label: 'Payment Dates', value: String(byDate.size) },
          { label: 'Invoices Paid', value: String([...byDate.values()].reduce((sum, item) => sum + item.count, 0)) },
        ],
      };
    }

    case 'fee-collection-by-program': {
      const byProgram = new Map<string, { billed: number; paid: number; invoices: number }>();
      for (const fee of fees) {
        if (!fee.student) continue;
        const billed = invoiceBilled(fee);
        if (billed <= 0) continue;
        const name = fee.student.program?.name ?? 'Unassigned';
        const current = byProgram.get(name) ?? { billed: 0, paid: 0, invoices: 0 };
        current.billed += billed;
        current.paid += invoicePaid(fee);
        current.invoices += 1;
        byProgram.set(name, current);
      }
      const entries = [...byProgram.entries()].sort(([, a], [, b]) => b.paid - a.paid);
      return {
        title: 'Fee Collection by Programme',
        headers: ['Programme', 'Billed', 'Collected', 'Outstanding', 'Collection %', 'Invoices'],
        rows: entries.map(([program, item]) => {
          const outstanding = Math.max(0, item.billed - item.paid);
          const rate = item.billed > 0 ? `${((item.paid / item.billed) * 100).toFixed(1)}%` : 'N/A';
          return [
            program,
            formatCurrency(item.billed),
            formatCurrency(item.paid),
            formatCurrency(outstanding),
            rate,
            String(item.invoices),
          ];
        }),
        summary: `${entries.length} programmes · Generated ${generated}`,
        appliedFilters: applied,
        stats: [
          { label: 'Total Billed', value: formatCurrency(entries.reduce((sum, [, item]) => sum + item.billed, 0)) },
          { label: 'Total Collected', value: formatCurrency(entries.reduce((sum, [, item]) => sum + item.paid, 0)) },
          { label: 'Outstanding', value: formatCurrency(entries.reduce((sum, [, item]) => sum + Math.max(0, item.billed - item.paid), 0)) },
        ],
      };
    }

    case 'fee-collection-by-method': {
      // Each invoice keeps its own payment method; do not attribute a
      // student's whole balance to the method of their latest invoice.
      const byMethod = new Map<string, { count: number; total: number }>();
      for (const fee of fees) {
        const paid = invoicePaid(fee);
        if (paid <= 0) continue;
        const method = fee.payment_method?.trim() || 'Unspecified';
        const current = byMethod.get(method) ?? { count: 0, total: 0 };
        current.count += 1;
        current.total += paid;
        byMethod.set(method, current);
      }
      const entries = [...byMethod.entries()].sort(([, a], [, b]) => b.total - a.total);
      return {
        title: 'Fee Collection by Payment Method',
        headers: ['Payment Method', 'Invoices', 'Total Collected'],
        rows: entries.map(([method, item]) => [method, String(item.count), formatCurrency(item.total)]),
        summary: `${formatCurrency(entries.reduce((sum, [, item]) => sum + item.total, 0))} across ${entries.length} methods · Generated ${generated}`,
        appliedFilters: applied,
        stats: entries.map(([method, item]) => ({ label: method, value: formatCurrency(item.total) })).slice(0, 4),
      };
    }

    case 'programs': {
      const programs = data.programs.filter((p) => {
        if (filters.programId && p.id !== filters.programId) return false;
        return matchesSearch([p.code, p.name], filters.search);
      });
      return {
        title: 'Programme Register',
        headers: ['Code', 'Prefix', 'Name', 'Duration', 'Tuition', 'Active'],
        rows: programs.map((p: Program) => [
          p.code,
          (p.admission_prefix || p.code).toUpperCase(),
          p.name,
          `${p.duration_months} mo`,
          formatCurrency(p.tuition_fee),
          p.is_active ? 'Yes' : 'No',
        ]),
        summary: `${programs.length} programmes · Generated ${generated}`,
        appliedFilters: applied,
      };
    }

    case 'courses': {
      const courses = filterCourses(data.courses, filters);
      return {
        title: 'Unit Register',
        headers: ['Code', 'Name', 'Programme', 'Credits', 'Unit fee', 'Active'],
        rows: courses.map((c) => [
          c.code,
          c.name,
          c.program?.name ?? 'N/A',
          String(c.credits),
          formatCurrency(c.unit_fee),
          c.is_active ? 'Yes' : 'No',
        ]),
        summary: `${courses.length} units · Generated ${generated}`,
        appliedFilters: applied,
      };
    }

    case 'enrollments':
    case 'unit-enrollments':
    case 'student-academic-records': {
      return {
        title: key === 'student-academic-records' ? 'Student Academic Records' : 'Unit Enrollment',
        headers: [
          'Student',
          'Admission No.',
          'Programme',
          'Intake',
          'Phone',
          'Email',
          'Unit',
          'Term',
          'Grade',
          'Status',
        ],
        rows: enrollments.map((e) => {
          const student = e.student;
          const course = e.course;
          return [
            studentDisplayName(student),
            admissionNo(student),
            programName(student),
            intakeName(student),
            studentPhone(student),
            studentEmail(student),
            course ? `${course.code} — ${course.name}` : 'N/A',
            displayValue(e.term?.name),
            displayValue(e.grade),
            displayValue(e.status),
          ];
        }),
        rowStudentIds: enrollments.map((e) => e.student_id ?? null),
        summary: `${enrollments.length} records · Generated ${generated}`,
        appliedFilters: applied,
        landscape: true,
        stats: [{ label: 'Enrollments', value: String(enrollments.length) }],
      };
    }

    case 'attendance': {
      const records = filterAttendance(data.attendance, filters);
      return {
        title: 'Attendance Register',
        headers: ['Date', 'Student', 'Admission No.', 'Programme', 'Phone', 'Email', 'Unit', 'Status'],
        rows: records.map((r) => {
          const student = r.enrollment?.student;
          const course = r.enrollment?.course;
          return [
            r.date,
            studentDisplayName(student),
            admissionNo(student),
            programName(student),
            studentPhone(student),
            studentEmail(student),
            course ? `${course.code ?? ''} — ${course.name ?? ''}` : 'N/A',
            displayValue(r.status),
          ];
        }),
        rowStudentIds: records.map((r) => r.enrollment?.student_id ?? r.enrollment?.student?.id ?? null),
        summary: `${records.length} records · Generated ${generated}`,
        appliedFilters: applied,
        landscape: true,
      };
    }

    case 'intake-summary': {
      const byIntake = students.reduce(
        (acc, student) => {
          const name = student.intake?.name ?? 'Unassigned';
          acc[name] = (acc[name] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      return {
        title: 'Intake Statistics',
        headers: ['Intake', 'Students'],
        rows: Object.entries(byIntake).map(([intake, count]) => [intake, String(count)]),
        summary: `${students.length} students across ${Object.keys(byIntake).length} intakes · Generated ${generated}`,
        appliedFilters: applied,
        stats: [
          { label: 'Total Students', value: String(students.length) },
          { label: 'Intakes', value: String(Object.keys(byIntake).length) },
        ],
      };
    }

    case 'program-enrollment-summary':
    case 'admission-statistics': {
      const byProgram = students.reduce(
        (acc, student) => {
          const name = student.program?.name ?? 'Unassigned';
          if (!acc[name]) acc[name] = { active: 0, total: 0 };
          acc[name].total += 1;
          if (student.status === 'active') acc[name].active += 1;
          return acc;
        },
        {} as Record<string, { active: number; total: number }>
      );
      return {
        title: key === 'admission-statistics' ? 'Admission Statistics' : 'Programme Statistics',
        headers: ['Programme', 'Active Students', 'Total Students'],
        rows: Object.entries(byProgram).map(([program, item]) => [program, String(item.active), String(item.total)]),
        summary: `${students.length} students across ${Object.keys(byProgram).length} programmes · Generated ${generated}`,
        appliedFilters: applied,
        stats: [
          { label: 'Total Students', value: String(students.length) },
          { label: 'Active Students', value: String(students.filter((s) => s.status === 'active').length) },
          { label: 'Programmes', value: String(Object.keys(byProgram).length) },
          { label: 'Intakes', value: String(new Set(students.map((s) => s.intake_id).filter(Boolean)).size) },
        ],
      };
    }

    case 'data-quality-students-without-programs':
      return studentListing(
        'Students Without Programmes',
        students.filter((s) => !s.program_id),
        generated,
        applied
      );

    case 'data-quality-students-without-intake':
      return studentListing(
        'Students Without Intake',
        students.filter((s) => !s.intake_id),
        generated,
        applied
      );

    case 'data-quality-students-without-phone':
      return studentListing(
        'Students Without Phone Numbers',
        students.filter((s) => !s.phone),
        generated,
        applied
      );

    case 'data-quality-students-without-email':
      return studentListing(
        'Students Without Email Addresses',
        students.filter((s) => !s.email),
        generated,
        applied
      );
  }
}

export interface ReportOption {
  key: ReportKey;
  label: string;
  category: string;
  description: string;
}

export const REPORT_OPTIONS: ReportOption[] = [
  { key: 'executive-summary', label: 'Executive Summary', category: 'Administrative Reports', description: 'College-wide snapshot of students, programmes and finance.' },
  { key: 'student-register', label: 'All Students', category: 'Student Reports', description: 'Complete student register with contact details.' },
  { key: 'active-students', label: 'Active Students', category: 'Student Reports', description: 'Currently active students and their contact information.' },
  { key: 'inactive-students', label: 'Inactive Students', category: 'Student Reports', description: 'Inactive student records with phone and email.' },
  { key: 'new-admissions', label: 'New Admissions', category: 'Student Reports', description: 'Recently admitted students (last 90 days unless dates are set).' },
  { key: 'students-by-program', label: 'Students by Programme', category: 'Student Reports', description: 'Student listing filtered by programme.' },
  { key: 'students-by-intake', label: 'Students by Intake', category: 'Student Reports', description: 'Student listing filtered by intake.' },
  { key: 'students-by-status', label: 'Student Status', category: 'Student Reports', description: 'Students grouped through the status filter, with contacts.' },
  { key: 'student-contact-list', label: 'Student Contact List', category: 'Student Reports', description: 'Phone and email directory from student profiles.' },
  { key: 'incomplete-profiles', label: 'Incomplete Profiles', category: 'Student Reports', description: 'Students missing programme, intake, phone or email.' },
  { key: 'enrollments', label: 'Enrollments', category: 'Academic Reports', description: 'Student unit enrollments with contact details.' },
  { key: 'program-enrollment-summary', label: 'Programme Enrollment', category: 'Academic Reports', description: 'Active and total students by programme.' },
  { key: 'unit-enrollments', label: 'Unit / Subject Enrollment', category: 'Academic Reports', description: 'Every unit enrollment with student contacts.' },
  { key: 'student-academic-records', label: 'Student Academic Records', category: 'Academic Reports', description: 'Enrollment and grade records with student contacts.' },
  { key: 'attendance', label: 'Attendance', category: 'Academic Reports', description: 'Attendance register with student phone and email.' },
  { key: 'fee-summary', label: 'Fee Payments', category: 'Finance Reports', description: 'Billed, collected, outstanding and credit totals.' },
  { key: 'fee-ledger', label: 'Payment History', category: 'Finance Reports', description: 'Every invoice with billed, paid, balance and status.' },
  { key: 'outstanding-fees', label: 'Outstanding Fees', category: 'Finance Reports', description: 'Students whose combined invoices still have a balance.' },
  { key: 'fully-paid-students', label: 'Fully Paid Students', category: 'Finance Reports', description: 'Students who have settled all billed invoices.' },
  { key: 'students-with-balances', label: 'Students with Balances', category: 'Finance Reports', description: 'Students whose combined invoices still have a balance.' },
  { key: 'zero-payment-students', label: 'Zero Payment', category: 'Finance Reports', description: 'Students with billed fees and no payment received.' },
  { key: 'partially-paid-students', label: 'Partially Paid', category: 'Finance Reports', description: 'Students who have paid part of their balance.' },
  { key: 'fee-collection-by-date', label: 'Collection by Date', category: 'Finance Reports', description: 'Money received grouped by payment date.' },
  { key: 'fee-collection-by-program', label: 'Collection by Programme', category: 'Finance Reports', description: 'Collection performance by programme.' },
  { key: 'fee-collection-by-method', label: 'Collection by Method', category: 'Finance Reports', description: 'Money received grouped by payment method.' },
  { key: 'admission-statistics', label: 'Admission Statistics', category: 'Administrative Reports', description: 'Admission counts by programme and status.' },
  { key: 'intake-summary', label: 'Intake Statistics', category: 'Administrative Reports', description: 'Student counts by intake.' },
  { key: 'programs', label: 'Programme Statistics', category: 'Administrative Reports', description: 'Programme register and tuition.' },
  { key: 'courses', label: 'Unit Register', category: 'Administrative Reports', description: 'Units and fees by programme.' },
  { key: 'graduated-students', label: 'Graduated Students', category: 'Administrative Reports', description: 'Graduated students with contact details.' },
  { key: 'withdrawn-students', label: 'Withdrawn Students', category: 'Administrative Reports', description: 'Withdrawn students with contact details.' },
  { key: 'data-quality-students-without-programs', label: 'Students Without Programmes', category: 'Administrative Reports', description: 'Data quality: missing programme assignment.' },
  { key: 'data-quality-students-without-intake', label: 'Students Without Intake', category: 'Administrative Reports', description: 'Data quality: missing intake assignment.' },
  { key: 'data-quality-students-without-phone', label: 'Students Without Phone', category: 'Administrative Reports', description: 'Data quality: missing phone on the student profile.' },
  { key: 'data-quality-students-without-email', label: 'Students Without Email', category: 'Administrative Reports', description: 'Data quality: missing email on the student profile.' },
];

export const REPORT_CATEGORIES = [
  'Student Reports',
  'Academic Reports',
  'Finance Reports',
  'Administrative Reports',
] as const;
