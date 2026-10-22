'use client';

import { EmptyState } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReportTable } from '@/lib/reports/build-report-table';
import { digitsForTel, whatsappHref } from '@/lib/reports/student-fields';
import { ArrowUpDown, Eye, Mail, MessageCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 25;

function isPhoneHeader(header: string) {
  return header.toLowerCase() === 'phone';
}

function isEmailHeader(header: string) {
  return header.toLowerCase() === 'email';
}

function isStatusHeader(header: string) {
  return header.toLowerCase() === 'status';
}

export function ReportResultsTable({
  table,
  onViewStudent,
  onClearFilters,
}: {
  table: ReportTable;
  onViewStudent?: (studentId: string) => void;
  onClearFilters: () => void;
}) {
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const indexed = table.rows.map((row, index) => ({ 
      row, 
      index,
      studentId: table.rowStudentIds?.[index] ?? null 
    }));
    if (sortIndex === null) return indexed;
    return [...indexed].sort((a, b) => {
      const left = a.row[sortIndex] ?? '';
      const right = b.row[sortIndex] ?? '';
      const cmp = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortDir, sortIndex, table.rows, table.rowStudentIds]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const hasStudentActions = Boolean(table.rowStudentIds?.some(Boolean) && onViewStudent);

  function toggleSort(index: number) {
    if (sortIndex === index) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortIndex(index);
      setSortDir('asc');
    }
    setPage(0);
  }

  if (table.rows.length === 0) {
    return (
      <EmptyState
        title="No records found"
        description="Try changing your filters or search criteria."
        action={
          <Button type="button" variant="secondary" onClick={onClearFilters}>
            Clear Filters
          </Button>
        }
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 w-12">S/N</th>
              {table.headers.map((header, index) => (
                <th key={`${header}-${index}`} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(index)}>
                    {header}
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </button>
                </th>
              ))}
              {hasStudentActions && (
                <th className="no-print px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ row, index: sortedIndex, studentId }) => {
              const serialNumber = currentPage * PAGE_SIZE + sortedIndex + 1;
              return (
                <tr key={`${sortedIndex}-${studentId || ''}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{serialNumber}</td>
                  {row.map((cell, cellIndex) => {
                    const header = table.headers[cellIndex] ?? '';
                    return (
                      <td key={cellIndex} className="whitespace-nowrap px-3 py-2.5 text-slate-800">
                        {isStatusHeader(header) ? (
                          <Badge status={cell}>{cell}</Badge>
                        ) : isPhoneHeader(header) && cell !== 'N/A' ? (
                          <span className="inline-flex items-center gap-1.5">
                            <a className="text-primary hover:underline" href={`tel:${digitsForTel(cell)}`}>
                              {cell}
                            </a>
                            <a className="no-print text-slate-400 hover:text-emerald-600" href={whatsappHref(cell)} target="_blank" rel="noreferrer" title="WhatsApp">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </span>
                        ) : isEmailHeader(header) && cell !== 'N/A' ? (
                          <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`mailto:${cell}`}>
                            <Mail className="h-3.5 w-3.5" />
                            {cell}
                          </a>
                        ) : (
                          cell
                        )}
                      </td>
                    );
                  })}
                  {hasStudentActions && (
                    <td className="no-print px-3 py-2.5">
                      {studentId ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => onViewStudent?.(studentId)}>
                          <Eye className="h-4 w-4" />
                          View Student
                        </Button>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="no-print flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
        <p>
          Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length}
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" disabled={currentPage === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
