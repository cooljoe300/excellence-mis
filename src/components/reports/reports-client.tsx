'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  Users,
} from 'lucide-react';

const CATEGORY_ICONS = {
  'Student Reports': Users,
  'Academic Reports': BookOpen,
  'Finance Reports': Banknote,
  'Administrative Reports': ClipboardList,
};

function reportCount(key: ReportKey, data: ReportsBundle) {
  switch (key) {
    case 'student-register':
    case 'student-contact-list':
    case 'students-by-status':
    case 'students-by-program':
    case 'students-by-intake':
      return data.students.length;
    case 'active-students':
      return data.students.filter((s) => s.status === 'active').length;
    case 'inactive-students':
      return data.students.filter((s) => s.status === 'inactive').length;
    case 'graduated-students':
      return data.students.filter((s) => s.status === 'graduated').length;
    case 'withdrawn-students':
      return data.students.filter((s) => s.status === 'withdrawn').length;
    case 'enrollments':
    case 'unit-enrollments':
    case 'student-academic-records':
      return data.enrollments.length;
    case 'attendance':
      return data.attendance.length;
    case 'fee-ledger':
    case 'fee-summary':
      return data.fees.length;
    case 'outstanding-fees':
    case 'students-with-balances':
      return data.fees.filter((fee) => getFeeBalance(fee) > 0).length;
    case 'fully-paid-students':
      return data.fees.filter((fee) => getFeeBalance(fee) === 0).length;
    case 'programs':
      return data.programs.length;
    case 'courses':
      return data.courses.length;
    default:
      return data.students.length;
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

export function ReportsClient({ data }: { data: ReportsBundle }) {
  const router = useRouter();
  const [reportKey, setReportKey] = useState<ReportKey>('student-register');
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  const table = useMemo(() => buildReportTable(reportKey, data, filters), [reportKey, data, filters]);
  const viewingStudent = data.students.find((student) => student.id === viewingId) ?? null;

  useEffect(() => {
    document.body.classList.add('print-reports');
    if (table.landscape) document.body.classList.add('print-reports-landscape');
    else document.body.classList.remove('print-reports-landscape');
    return () => {
      document.body.classList.remove('print-reports', 'print-reports-landscape');
    };
  }, [table.landscape]);

  const catalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return REPORT_CATEGORIES.map((category) => ({
      category,
      reports: REPORT_OPTIONS.filter((option) => {
        if (option.category !== category) return false;
        if (!query) return true;
        return `${option.label} ${option.description} ${option.category}`.toLowerCase().includes(query);
      }),
    })).filter((group) => group.reports.length > 0);
  }, [catalogQuery]);

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
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search reports..."
            value={catalogQuery}
            onChange={(event) => setCatalogQuery(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => document.getElementById('report-results')?.scrollIntoView({ behavior: 'smooth' })}>
            <FileText className="h-4 w-4" />
            Generate Report
          </Button>
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

      <div className="no-print space-y-8">
        {catalog.map((group) => {
          const Icon = CATEGORY_ICONS[group.category];
          return (
            <section key={group.category}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                <Icon className="h-4 w-4 text-primary" />
                {group.category}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.reports.map((report) => {
                  const selected = report.key === reportKey;
                  return (
                    <article
                      key={report.key}
                      className={`rounded-xl border bg-white p-4 shadow-sm transition ${
                        selected ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{report.label}</h3>
                          <p className="mt-1 text-sm text-slate-500">{report.description}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {reportCount(report.key, data)}
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setReportKey(report.key);
                            document.getElementById('report-results')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          View Report
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setReportKey(report.key);
                            exportTableCsv(report.key, buildReportTable(report.key, data, filters));
                          }}
                        >
                          Export
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
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

        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{table.title}</h2>
            <p className="text-sm text-slate-500">{table.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => exportTableCsv(reportKey, table)}>
              <Download className="h-4 w-4" />
              Excel / CSV
            </Button>
            <PrintDocumentButton label="Print / PDF" documentTitle={table.title} className="hidden sm:inline-flex" />
          </div>
        </div>

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
