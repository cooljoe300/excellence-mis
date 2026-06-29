'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
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
import type { ReportsBundle } from '@/app/actions/reports';
import { Download, FileSpreadsheet } from 'lucide-react';

type ReportKey =
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

const REPORTS: {
  key: ReportKey;
  title: string;
  description: string;
  build: (data: ReportsBundle) => string[][];
}[] = [
  {
    key: 'executive-summary',
    title: 'Executive Summary',
    description: 'Key institutional metrics and fee collection totals.',
    build: (data) => buildExecutiveSummaryCsv(data.stats, data.generatedAt),
  },
  {
    key: 'students-by-status',
    title: 'Students by Status',
    description: 'Count of students grouped by active, graduated, suspended, and other statuses.',
    build: (data) => buildStudentsByStatusCsv(data.byStatus, data.generatedAt),
  },
  {
    key: 'students-by-program',
    title: 'Students by Program',
    description: 'Enrollment distribution across academic programs.',
    build: (data) => buildStudentsByProgramCsv(data.byProgram, data.generatedAt),
  },
  {
    key: 'student-register',
    title: 'Full Student Register',
    description: 'Complete student list with admission numbers, contact details, and LMS status.',
    build: (data) => buildStudentRegisterCsv(data.students, data.generatedAt),
  },
  {
    key: 'fee-summary',
    title: 'Fee Collection Summary',
    description: 'Revenue collected and invoice counts by payment status.',
    build: (data) => buildFeeSummaryCsv(data.stats, data.feeSummary, data.generatedAt),
  },
  {
    key: 'fee-ledger',
    title: 'Fee Payments Ledger',
    description: 'Detailed fee invoices with amounts paid, balances, and references.',
    build: (data) => buildFeeLedgerCsv(data.fees, data.generatedAt),
  },
  {
    key: 'programs',
    title: 'Programs Overview',
    description: 'All programs with tuition fees and duration.',
    build: (data) => buildProgramsCsv(data.programs, data.generatedAt),
  },
  {
    key: 'courses',
    title: 'Courses Catalog',
    description: 'All courses with unit fees, programs, and instructors.',
    build: (data) => buildCoursesCsv(data.courses, data.generatedAt),
  },
  {
    key: 'enrollments',
    title: 'Enrollments Report',
    description: 'Student unit registrations by term and course.',
    build: (data) => buildEnrollmentsCsv(data.enrollments, data.generatedAt),
  },
  {
    key: 'attendance',
    title: 'Attendance Report',
    description: 'Attendance records by student, course, and date.',
    build: (data) => buildAttendanceCsv(data.attendance, data.generatedAt),
  },
];

function downloadReport(key: ReportKey, data: ReportsBundle) {
  const report = REPORTS.find((item) => item.key === key);
  if (!report) return;
  downloadCsv(reportFilename(report.key), report.build(data));
}

export function ReportsClient({ data }: { data: ReportsBundle }) {
  const [downloadingAll, setDownloadingAll] = useState(false);

  async function handleDownloadAll() {
    setDownloadingAll(true);
    for (const report of REPORTS) {
      downloadReport(report.key, data);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    setDownloadingAll(false);
  }

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50/40">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-blue-900">Download reports</p>
            <p className="mt-1 text-sm text-blue-800">
              Export any report as CSV for Excel or Google Sheets. Generated{' '}
              {new Date(data.generatedAt).toLocaleString()}.
            </p>
          </div>
          <Button onClick={handleDownloadAll} disabled={downloadingAll}>
            <FileSpreadsheet className="h-4 w-4" />
            {downloadingAll ? 'Preparing downloads...' : 'Download all reports'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total students</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.stats.totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Active enrollments</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{data.stats.activeEnrollments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Revenue collected</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">
              {formatCurrency(data.stats.totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Pending / overdue fees</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">
              {data.stats.pendingFees} / {data.stats.overdueFees}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {REPORTS.map((report) => (
          <Card key={report.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{report.description}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadReport(report.key, data)}
              >
                <Download className="h-4 w-4" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ReportPreview reportKey={report.key} data={data} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportPreview({ reportKey, data }: { reportKey: ReportKey; data: ReportsBundle }) {
  switch (reportKey) {
    case 'executive-summary':
      return (
        <div className="space-y-2 text-sm">
          <PreviewRow label="Students" value={String(data.stats.totalStudents)} />
          <PreviewRow label="Programs" value={String(data.stats.totalPrograms)} />
          <PreviewRow label="Revenue" value={formatCurrency(data.stats.totalRevenue)} />
        </div>
      );
    case 'students-by-status':
      return <KeyValuePreview entries={data.byStatus} emptyLabel="No student data" badge />;
    case 'students-by-program':
      return <KeyValuePreview entries={data.byProgram} emptyLabel="No program data" />;
    case 'student-register':
      return (
        <p className="text-sm text-slate-600">
          {data.students.length} student{data.students.length === 1 ? '' : 's'} in full register export.
        </p>
      );
    case 'fee-summary':
      return (
        <div className="space-y-2 text-sm">
          <PreviewRow label="Revenue collected" value={formatCurrency(data.stats.totalRevenue)} />
          <KeyValuePreview entries={data.feeSummary} emptyLabel="No fee data" badge />
        </div>
      );
    case 'fee-ledger':
      return (
        <p className="text-sm text-slate-600">
          {data.fees.length} fee invoice{data.fees.length === 1 ? '' : 's'} with balances and references.
        </p>
      );
    case 'programs':
      return (
        <div className="space-y-2">
          {data.programs.slice(0, 4).map((program) => (
            <PreviewRow
              key={program.id}
              label={program.name}
              value={formatCurrency(program.tuition_fee)}
            />
          ))}
          {data.programs.length > 4 && (
            <p className="text-xs text-slate-500">+ {data.programs.length - 4} more in CSV</p>
          )}
        </div>
      );
    case 'courses':
      return (
        <p className="text-sm text-slate-600">
          {data.courses.length} course{data.courses.length === 1 ? '' : 's'} with fees and instructors.
        </p>
      );
    case 'enrollments':
      return (
        <p className="text-sm text-slate-600">
          {data.enrollments.length} enrollment record{data.enrollments.length === 1 ? '' : 's'}.
        </p>
      );
    case 'attendance':
      return (
        <p className="text-sm text-slate-600">
          {data.attendance.length} attendance record{data.attendance.length === 1 ? '' : 's'}.
        </p>
      );
    default:
      return null;
  }
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function KeyValuePreview({
  entries,
  emptyLabel,
  badge = false,
}: {
  entries: Record<string, number>;
  emptyLabel: string;
  badge?: boolean;
}) {
  const items = Object.entries(entries);
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {items.map(([key, count]) => (
        <div key={key} className="flex items-center justify-between text-sm">
          {badge ? <Badge status={key}>{key}</Badge> : <span className="text-slate-600">{key}</span>}
          <span className="font-semibold text-slate-900">{count}</span>
        </div>
      ))}
    </div>
  );
}
