'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PrintDocumentButton } from '@/components/documents/print-document-button';
import { ReportPrintDocument } from '@/components/reports/report-print-document';
import { downloadCsv, reportFilename } from '@/lib/reports/csv';
import {
  buildAttendanceCsv,
  buildCoursesCsv,
  buildEnrollmentsCsv,
  buildExecutiveSummaryCsv,
  buildFeeLedgerCsv,
  buildFeeSummaryCsv,
  buildProgramsCsv,
  buildStudentRegisterCsv,
  buildStudentsByProgramCsv,
  buildStudentsByStatusCsv,
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
} from '@/lib/reports/build-report-table';
import type { ReportsBundle } from '@/app/actions/reports';
import { Download } from 'lucide-react';

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
    case 'fee-summary':
      return buildFeeSummaryCsv(data.stats, feeSummary, data.generatedAt);
    case 'fee-ledger':
      return buildFeeLedgerCsv(fees, data.generatedAt);
    case 'programs':
      return buildProgramsCsv(filteredPrograms, data.generatedAt);
    case 'courses':
      return buildCoursesCsv(courses, data.generatedAt);
    case 'enrollments':
      return buildEnrollmentsCsv(enrollments, data.generatedAt);
    case 'attendance':
      return buildAttendanceCsv(attendance, data.generatedAt);
  }
}

const STUDENT_REPORTS: ReportKey[] = [
  'students-by-status',
  'students-by-program',
  'student-register',
];

const FEE_REPORTS: ReportKey[] = ['fee-summary', 'fee-ledger'];

export function ReportsClient({ data }: { data: ReportsBundle }) {
  const [reportKey, setReportKey] = useState<ReportKey>('student-register');
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);

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
    reportKey !== 'fee-summary';

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="no-print rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Select
              label="Report"
              value={reportKey}
              onChange={(e) => setReportKey(e.target.value as ReportKey)}
              options={REPORT_OPTIONS.map((r) => ({ value: r.key, label: r.label }))}
            />

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
