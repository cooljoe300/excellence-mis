'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PrintDocumentButton } from '@/components/documents/print-document-button';
import { ReportPrintDocument } from '@/components/reports/report-print-document';
import { downloadCsv, reportFilename } from '@/lib/reports/csv';
import { getFeeBalance } from '@/lib/utils';
import {
  buildAttendanceCsv,
  buildActiveStudentsCsv,
  buildCoursesCsv,
  buildDataQualityStudentsWithoutEmailCsv,
  buildDataQualityStudentsWithoutIntakeCsv,
  buildDataQualityStudentsWithoutPhoneCsv,
  buildDataQualityStudentsWithoutProgramsCsv,
  buildEnrollmentsCsv,
  buildExecutiveSummaryCsv,
  buildFeeCollectionByDateCsv,
  buildFeeCollectionByMethodCsv,
  buildFeeCollectionByProgramCsv,
  buildFeeLedgerCsv,
  buildFeeSummaryCsv,
  buildFullyPaidStudentsCsv,
  buildGraduatedStudentsCsv,
  buildIncompleteProfilesCsv,
  buildInactiveStudentsCsv,
  buildIntakeSummaryCsv,
  buildOutstandingFeesCsv,
  buildPartiallyPaidStudentsCsv,
  buildProgramEnrollmentSummaryCsv,
  buildProgramsCsv,
  buildStudentContactListCsv,
  buildStudentRegisterCsv,
  buildStudentsByProgramCsv,
  buildStudentsByStatusCsv,
  buildWithdrawnStudentsCsv,
  buildZeroPaymentStudentsCsv,
} from '@/lib/reports/serializers';
import {
  DEFAULT_REPORT_FILTERS,
  REPORT_OPTIONS,
  buildReportTable,
  filterAttendance,
  filterCourses,
  filterEnrollments,
  filterFees,
  filterStudents,
  getTermOptions,
  type ReportFilters,
  type ReportKey,
  type ReportOption,
} from '@/lib/reports/build-report-table';
import type { ReportsBundle } from '@/app/actions/reports';
import type { Student } from '@/lib/types';
import { Download, Search, FileText, DollarSign, GraduationCap, AlertCircle, Users } from 'lucide-react';

function buildFilteredCsv(key: ReportKey, data: ReportsBundle, filters: ReportFilters) {
  const students = filterStudents(data.students, filters);
  const fees = filterFees(data.fees, filters);
  const courses = filterCourses(data.courses, filters);
  const enrollments = filterEnrollments(data.enrollments, filters);
  const attendance = filterAttendance(data.attendance, filters);

  const byStatus = students.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byProgram = students.reduce(
    (acc, s) => {
      const name = (s.program as { name?: string } | null)?.name ?? 'Unassigned';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const feeSummary = fees.reduce(
    (acc, fee) => {
      acc[fee.status] = (acc[fee.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredPrograms = data.programs.filter((p) => {
    if (filters.programId && p.id !== filters.programId) return false;
    return true;
  });

  switch (key) {
    case 'executive-summary':
      return buildExecutiveSummaryCsv(data.stats, data.generatedAt);
    case 'students-by-status':
      return buildStudentsByStatusCsv(byStatus, data.generatedAt);
    case 'students-by-program':
      return buildStudentsByProgramCsv(byProgram, data.generatedAt);
    case 'student-register':
      return buildStudentRegisterCsv(students, data.generatedAt);
    case 'active-students':
      return buildActiveStudentsCsv(students.filter((s) => s.status === 'active'), data.generatedAt);
    case 'inactive-students':
      return buildInactiveStudentsCsv(students.filter((s) => s.status === 'inactive'), data.generatedAt);
    case 'graduated-students':
      return buildGraduatedStudentsCsv(students.filter((s) => s.status === 'graduated'), data.generatedAt);
    case 'withdrawn-students':
      return buildWithdrawnStudentsCsv(students.filter((s) => s.status === 'withdrawn'), data.generatedAt);
    case 'student-contact-list':
      return buildStudentContactListCsv(students, data.generatedAt);
    case 'incomplete-profiles': {
      const incompleteStudents = students.filter((s) => !s.phone || !s.email || !s.program_id || !s.intake_id);
      const issues = incompleteStudents.map((s) => {
        const missing: string[] = [];
        if (!s.phone) missing.push('Phone');
        if (!s.email) missing.push('Email');
        if (!s.program_id) missing.push('Program');
        if (!s.intake_id) missing.push('Intake');
        return missing.join(', ');
      });
      return buildIncompleteProfilesCsv(incompleteStudents, issues, data.generatedAt);
    }
    case 'fee-summary':
      return buildFeeSummaryCsv(data.stats, feeSummary, data.generatedAt);
    case 'fee-ledger':
      return buildFeeLedgerCsv(fees, data.generatedAt);
    case 'outstanding-fees':
      return buildOutstandingFeesCsv(fees.filter((f) => getFeeBalance(f) > 0), data.generatedAt);
    case 'zero-payment-students':
      return buildZeroPaymentStudentsCsv(fees.filter((f) => f.amount_paid === 0), data.generatedAt);
    case 'partially-paid-students':
      return buildPartiallyPaidStudentsCsv(fees.filter((f) => f.amount_paid > 0 && getFeeBalance(f) > 0), data.generatedAt);
    case 'fully-paid-students':
      return buildFullyPaidStudentsCsv(fees.filter((f) => getFeeBalance(f) === 0), data.generatedAt);
    case 'fee-collection-by-date': {
      const paidFees = fees.filter((f) => f.status === 'paid' || f.status === 'partial');
      const byDate = paidFees.reduce((acc, fee) => {
        const date = fee.created_at?.slice(0, 10) || 'Unknown';
        if (!acc[date]) acc[date] = { count: 0, total: 0 };
        acc[date].count += 1;
        acc[date].total += Number(fee.amount_paid);
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
      return buildFeeCollectionByDateCsv(byDate, data.generatedAt);
    }
    case 'fee-collection-by-program': {
      const paidFees = fees.filter((f) => f.status === 'paid' || f.status === 'partial');
      const byProgram = paidFees.reduce((acc, fee) => {
        const student = fee.student as Student | undefined;
        const programName = (student?.program as { name?: string } | null)?.name ?? 'Unassigned';
        if (!acc[programName]) acc[programName] = { expected: 0, paid: 0, count: 0 };
        acc[programName].expected += Number(fee.amount);
        acc[programName].paid += Number(fee.amount_paid);
        acc[programName].count += 1;
        return acc;
      }, {} as Record<string, { expected: number; paid: number; count: number }>);
      return buildFeeCollectionByProgramCsv(byProgram, data.generatedAt);
    }
    case 'fee-collection-by-method': {
      const paidFees = fees.filter((f) => f.status === 'paid' || f.status === 'partial');
      const byMethod = paidFees.reduce((acc, fee) => {
        const method = fee.payment_method || 'Unknown';
        if (!acc[method]) acc[method] = { count: 0, total: 0 };
        acc[method].count += 1;
        acc[method].total += Number(fee.amount_paid);
        return acc;
      }, {} as Record<string, { count: number; total: number }>);
      return buildFeeCollectionByMethodCsv(byMethod, data.generatedAt);
    }
    case 'programs':
      return buildProgramsCsv(filteredPrograms, data.generatedAt);
    case 'courses':
      return buildCoursesCsv(courses, data.generatedAt);
    case 'enrollments':
      return buildEnrollmentsCsv(enrollments, data.generatedAt);
    case 'attendance':
      return buildAttendanceCsv(attendance, data.generatedAt);
    case 'intake-summary': {
      const byIntake = students.reduce((acc, student) => {
        const intake = (student.intake as { name?: string } | null)?.name ?? 'Unassigned';
        if (!acc[intake]) acc[intake] = { count: 0 };
        acc[intake].count += 1;
        return acc;
      }, {} as Record<string, { count: number }>);
      return buildIntakeSummaryCsv(byIntake, data.generatedAt);
    }
    case 'program-enrollment-summary': {
      const byProgram = students.reduce((acc, student) => {
        const programName = (student.program as { name?: string } | null)?.name ?? 'Unassigned';
        if (!acc[programName]) acc[programName] = { active: 0, total: 0 };
        acc[programName].total += 1;
        if (student.status === 'active') acc[programName].active += 1;
        return acc;
      }, {} as Record<string, { active: number; total: number }>);
      return buildProgramEnrollmentSummaryCsv(byProgram, data.generatedAt);
    }
    case 'data-quality-students-without-programs':
      return buildDataQualityStudentsWithoutProgramsCsv(students.filter((s) => !s.program_id), data.generatedAt);
    case 'data-quality-students-without-intake':
      return buildDataQualityStudentsWithoutIntakeCsv(students.filter((s) => !s.intake_id), data.generatedAt);
    case 'data-quality-students-without-phone':
      return buildDataQualityStudentsWithoutPhoneCsv(students.filter((s) => !s.phone), data.generatedAt);
    case 'data-quality-students-without-email':
      return buildDataQualityStudentsWithoutEmailCsv(students.filter((s) => !s.email), data.generatedAt);
  }
}

const STUDENT_REPORTS: ReportKey[] = [
  'students-by-status',
  'students-by-program',
  'student-register',
  'active-students',
  'inactive-students',
  'graduated-students',
  'withdrawn-students',
  'student-contact-list',
  'incomplete-profiles',
];

const FEE_REPORTS: ReportKey[] = [
  'fee-summary',
  'fee-ledger',
  'outstanding-fees',
  'zero-payment-students',
  'partially-paid-students',
  'fully-paid-students',
  'fee-collection-by-date',
  'fee-collection-by-program',
  'fee-collection-by-method',
];

const ACADEMIC_REPORTS: ReportKey[] = [
  'programs',
  'courses',
  'enrollments',
  'intake-summary',
  'program-enrollment-summary',
  'attendance',
];

const DATA_QUALITY_REPORTS: ReportKey[] = [
  'data-quality-students-without-programs',
  'data-quality-students-without-intake',
  'data-quality-students-without-phone',
  'data-quality-students-without-email',
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Management: <FileText className="h-5 w-5" />,
  Students: <Users className="h-5 w-5" />,
  Finance: <DollarSign className="h-5 w-5" />,
  Academic: <GraduationCap className="h-5 w-5" />,
  'Data Quality': <AlertCircle className="h-5 w-5" />,
};

export function ReportsClient({ data }: { data: ReportsBundle }) {
  const [reportKey, setReportKey] = useState<ReportKey>('student-register');
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');

  const termOptions = useMemo(() => getTermOptions(data), [data]);
  const table = useMemo(() => buildReportTable(reportKey, data, filters), [reportKey, data, filters]);

  const programOptions = [
    { value: '', label: 'All programs' },
    ...data.programs.map((p) => ({ value: p.id, label: p.name })),
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    ...['active', 'inactive', 'graduated', 'suspended', 'withdrawn', 'pending', 'paid', 'partial', 'overdue'].map(
      (s) => ({ value: s, label: s })
    ),
  ];

  const termSelectOptions = [
    { value: '', label: 'All semesters' },
    ...termOptions.map((t) => ({ value: t, label: t })),
  ];

  // Group reports by category
  const reportsByCategory = useMemo(() => {
    const grouped: Record<string, ReportOption[]> = {};
    REPORT_OPTIONS.forEach((report) => {
      if (!grouped[report.category]) {
        grouped[report.category] = [];
      }
      grouped[report.category].push(report);
    });
    return grouped;
  }, []);

  // Filter reports by search query
  const filteredReportsByCategory = useMemo(() => {
    if (!searchQuery.trim()) return reportsByCategory;
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, ReportOption[]> = {};
    Object.entries(reportsByCategory).forEach(([category, reports]) => {
      const matching = reports.filter((r) => 
        r.label.toLowerCase().includes(query) || 
        r.category.toLowerCase().includes(query)
      );
      if (matching.length > 0) {
        filtered[category] = matching;
      }
    });
    return filtered;
  }, [reportsByCategory, searchQuery]);

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleCsvDownload() {
    downloadCsv(reportFilename(reportKey), buildFilteredCsv(reportKey, data, filters));
  }

  const showProgramFilter = !['executive-summary', 'students-by-status'].includes(reportKey);
  const showStatusFilter = reportKey !== 'executive-summary' && reportKey !== 'programs';
  const showTermFilter = FEE_REPORTS.includes(reportKey) || reportKey === 'enrollments';
  const showDateFilter = FEE_REPORTS.includes(reportKey) || reportKey === 'attendance';
  const showSearch =
    reportKey !== 'executive-summary' &&
    reportKey !== 'students-by-status' &&
    reportKey !== 'students-by-program' &&
    reportKey !== 'fee-summary' &&
    !reportKey.startsWith('data-quality-');

  return (
    <div className="space-y-6">
      {/* Search and Categories */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Report Categories */}
        <div className="space-y-6">
          {Object.entries(filteredReportsByCategory).map(([category, reports]) => (
            <div key={category}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                {CATEGORY_ICONS[category]}
                {category}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {reports.map((report) => (
                  <button
                    key={report.key}
                    onClick={() => setReportKey(report.key)}
                    className={`rounded-lg border p-4 text-left transition-colors hover:bg-slate-50 ${
                      reportKey === report.key
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">{report.label}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {showProgramFilter && (
              <Select
                label="Program"
                value={filters.programId}
                onChange={(e) => updateFilter('programId', e.target.value)}
                options={programOptions}
              />
            )}

            {showStatusFilter && (
              <Select
                label="Status"
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                options={
                  STUDENT_REPORTS.includes(reportKey)
                    ? statusOptions.filter((o) =>
                        ['', 'active', 'inactive', 'graduated', 'suspended', 'withdrawn'].includes(o.value)
                      )
                    : FEE_REPORTS.includes(reportKey)
                      ? statusOptions.filter((o) =>
                          ['', 'pending', 'paid', 'partial', 'overdue', 'waived'].includes(o.value)
                        )
                      : reportKey === 'enrollments'
                        ? statusOptions.filter((o) =>
                            ['', 'pending', 'active', 'completed', 'dropped'].includes(o.value)
                          )
                        : reportKey === 'attendance'
                          ? statusOptions.filter((o) =>
                              ['', 'present', 'absent', 'late', 'excused'].includes(o.value)
                            )
                          : statusOptions
                }
              />
            )}

            {showTermFilter && (
              <Select
                label="Semester"
                value={filters.termName}
                onChange={(e) => updateFilter('termName', e.target.value)}
                options={termSelectOptions}
              />
            )}

            {showDateFilter && (
              <>
                <Input
                  label="From date"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter('dateFrom', e.target.value)}
                />
                <Input
                  label="To date"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilter('dateTo', e.target.value)}
                />
              </>
            )}

            {showSearch && (
              <Input
                label="Search"
                placeholder="Name, admission no., course..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="sm:col-span-2"
              />
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setFilters(DEFAULT_REPORT_FILTERS)}>
              Clear filters
            </Button>
            <Button type="button" variant="secondary" onClick={handleCsvDownload}>
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <PrintDocumentButton />
          </div>
        </div>
      </div>

      {/* Printable report */}
      <ReportPrintDocument table={table} />
    </div>
  );
}
