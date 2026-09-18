'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { PrintDocumentButton } from '@/components/documents/print-document-button';
import { ReportPrintDocument } from '@/components/reports/report-print-document';
import { ReportFilterPanel } from '@/components/reports/report-filter-panel';
import { ReportResultsTable } from '@/components/reports/report-results-table';
import { StudentReportQuickView } from '@/components/reports/student-report-quick-view';
import { downloadCsv, reportFilename } from '@/lib/reports/csv';
import {
  DEFAULT_REPORT_FILTERS,
  REPORT_CATEGORIES,
  REPORT_OPTIONS,
  buildReportTable,
  filterStudents,
  filterFees,
  filterEnrollments,
  type ReportFilters,
  type ReportKey,
} from '@/lib/reports/build-report-table';
import { getFeeBalance } from '@/lib/utils';
import type { ReportsBundle } from '@/app/actions/reports';
import {
  Banknote,
  BookOpen,
  ClipboardList,
  Download,
  FileText,
  RefreshCw,
  Users,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Student Reports': Users,
  'Academic Reports': BookOpen,
  'Finance Reports': Banknote,
  'Administrative Reports': ClipboardList,
};

function reportCount(key: ReportKey, data: ReportsBundle, filters: ReportFilters = DEFAULT_REPORT_FILTERS) {
  // Use filtered data for accurate counts
  const students = filterStudents(data.students, filters);
  const fees = filterFees(data.fees, filters);
  const enrollments = filterEnrollments(data.enrollments, filters);
  
  switch (key) {
    case 'student-register':
    case 'student-contact-list':
    case 'students-by-status':
    case 'students-by-program':
    case 'students-by-intake':
      return students.length;
    case 'active-students':
      return students.filter((s) => s.status === 'active').length;
    case 'inactive-students':
      return students.filter((s) => s.status === 'inactive').length;
    case 'graduated-students':
      return students.filter((s) => s.status === 'graduated').length;
    case 'withdrawn-students':
      return students.filter((s) => s.status === 'withdrawn').length;
    case 'enrollments':
    case 'unit-enrollments':
    case 'student-academic-records':
      return enrollments.length;
    case 'attendance':
      return data.attendance.length;
    case 'fee-ledger':
      // Count unique students with fee records
      return new Set(fees.map((f) => f.student_id)).size;
    case 'fee-summary':
      return fees.length;
    case 'outstanding-fees':
    case 'students-with-balances':
      // Count unique students with balances
      return new Set(fees.filter((fee) => getFeeBalance(fee) > 0).map((f) => f.student_id)).size;
    case 'zero-payment-students':
      // Count unique students with zero payments
      return new Set(fees.filter((f) => Number(f.amount_paid) === 0).map((f) => f.student_id)).size;
    case 'partially-paid-students':
      // Count unique students with partial payments
      return new Set(fees.filter((f) => Number(f.amount_paid) > 0 && getFeeBalance(f) > 0).map((f) => f.student_id)).size;
    case 'fully-paid-students':
      // Count unique students fully paid
      return new Set(fees.filter((fee) => getFeeBalance(fee) === 0).map((f) => f.student_id)).size;
    case 'programs':
      return data.programs.length;
    case 'courses':
      return data.courses.length;
    default:
      return students.length;
  }
}

function exportTableCsv(key: ReportKey, table: ReturnType<typeof buildReportTable>) {
  downloadCsv(reportFilename(key), [
    [`Excellence Online College — ${table.title}`],
    ['Generated', new Date().toISOString()],
    ...(table.appliedFilters?.length ? [['Filters', table.appliedFilters.join('; ')]] : []),
    [],
    table.headers,
    ...table.rows,
  ]);
}

export function ReportsClient({ data, initialReport, initialCategory }: { data: ReportsBundle; initialReport?: string; initialCategory?: string }) {
  const router = useRouter();
  const [reportKey, setReportKey] = useState<ReportKey>((initialReport as ReportKey) || 'student-register');
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Update report key when initialReport changes
  useEffect(() => {
    if (initialReport) {
      setReportKey(initialReport as ReportKey);
    }
  }, [initialReport]);

  const table = useMemo(() => buildReportTable(reportKey, data, filters), [reportKey, data, filters]);
  const viewingStudent = data.students.find((student) => student.id === viewingId) ?? null;

  // Get category for the current report
  const currentReport = REPORT_OPTIONS.find(opt => opt.key === reportKey);
  const currentCategory = currentReport?.category;

  useEffect(() => {
    document.body.classList.add('print-reports');
    if (table.landscape) document.body.classList.add('print-reports-landscape');
    else document.body.classList.remove('print-reports-landscape');
    return () => {
      document.body.classList.remove('print-reports', 'print-reports-landscape');
    };
  }, [table.landscape]);

  function goBackToCategory() {
    if (initialCategory) {
      router.push(`/dashboard/reports?category=${initialCategory}`);
    } else if (currentCategory) {
      const categorySlug = currentCategory.toLowerCase().replace(' ', '-');
      router.push(`/dashboard/reports?category=${categorySlug}`);
    } else {
      router.push('/dashboard/reports');
    }
  }

  function applyFilters() {
    setFilters(draftFilters);
  }

  function clearFilters() {
    setDraftFilters(DEFAULT_REPORT_FILTERS);
    setFilters(DEFAULT_REPORT_FILTERS);
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {initialCategory && (
            <Button type="button" variant="ghost" onClick={goBackToCategory}>
              ← Back to {currentCategory || 'Reports'}
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{table.title}</h2>
            <p className="text-sm text-slate-500">{table.summary}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => exportTableCsv(reportKey, table)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <PrintDocumentButton label="Print" documentTitle={table.title} />
          <Button type="button" variant="secondary" onClick={() => router.refresh()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div id="report-results" className="space-y-4">
        <ReportFilterPanel
          data={data}
          reportKey={reportKey}
          draft={draftFilters}
          onDraftChange={setDraftFilters}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        {table.stats && table.stats.length > 0 && (
          <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {table.stats.map((stat) => (
              <StatCard key={stat.label} title={stat.label} value={stat.value} icon={FileText} />
            ))}
          </div>
        )}

        <div className="no-print">
          <ReportResultsTable key={`${reportKey}-${table.rows.length}-${table.summary}`} table={table} onViewStudent={setViewingId} onClearFilters={clearFilters} />
        </div>

        <div className="report-print-container">
          <ReportPrintDocument table={table} />
        </div>
      </div>

      <StudentReportQuickView student={viewingStudent} onClose={() => setViewingId(null)} />
    </div>
  );
}
