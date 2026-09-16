'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Download, Search, Filter, X } from 'lucide-react';
import type { DeregisteredUnit } from '@/app/actions/deregistered-units';

interface DeregisteredUnitsClientProps {
  deregisteredUnits: DeregisteredUnit[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  pageData: {
    programs: any[];
    intakes: any[];
    terms: any[];
    courses: any[];
  };
  filters: {
    search?: string;
    programId?: string;
    intakeId?: string;
    termId?: string;
    courseId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function DeregisteredUnitsClient({
  deregisteredUnits,
  totalCount,
  currentPage,
  totalPages,
  limit,
  pageData,
  filters,
}: DeregisteredUnitsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1'); // Reset to first page when filtering
    router.push(`/dashboard/deregistered-units?${params.toString()}`);
  }

  function clearFilters() {
    router.push('/dashboard/deregistered-units');
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/dashboard/deregistered-units?${params.toString()}`);
  }

  function exportData() {
    // Create CSV content
    const headers = [
      'Student Number',
      'Student Name',
      'Program',
      'Intake',
      'Course Code',
      'Course Name',
      'Term',
      'Enrolled Date',
      'Deregistered Date',
      'Deregistered By',
      'Reason',
      'Status',
    ];

    const rows = deregisteredUnits.map((unit) => [
      unit.student_number,
      unit.student_name,
      unit.program_name,
      unit.intake_name,
      unit.course_code,
      unit.course_name,
      unit.term_name,
      formatDate(unit.enrolled_at),
      formatDate(unit.deregistered_at),
      unit.deregistered_by_name || 'System',
      unit.deregistration_reason || 'N/A',
      unit.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deregistered-units-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Deregistered Units"
        description={`Total records: ${totalCount}`}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button onClick={exportData} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {showFilters && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Filters</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
              <Input
                placeholder="Student name, number, or email"
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Program</label>
              <Select
                value={filters.programId || ''}
                onChange={(e) => updateFilter('programId', e.target.value)}
                options={[
                  { value: '', label: 'All Programs' },
                  ...pageData.programs.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Intake</label>
              <Select
                value={filters.intakeId || ''}
                onChange={(e) => updateFilter('intakeId', e.target.value)}
                options={[
                  { value: '', label: 'All Intakes' },
                  ...pageData.intakes.map((i) => ({
                    value: i.id,
                    label: i.name,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Term</label>
              <Select
                value={filters.termId || ''}
                onChange={(e) => updateFilter('termId', e.target.value)}
                options={[
                  { value: '', label: 'All Terms' },
                  ...pageData.terms.map((t) => ({
                    value: t.id,
                    label: t.name,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Course</label>
              <Select
                value={filters.courseId || ''}
                onChange={(e) => updateFilter('courseId', e.target.value)}
                options={[
                  { value: '', label: 'All Courses' },
                  ...pageData.courses.map((c) => ({
                    value: c.id,
                    label: `${c.code} - ${c.name}`,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date From</label>
              <Input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date To</label>
              <Input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {deregisteredUnits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No deregistered units found.
        </div>
      ) : (
        <>
          <DataTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Student</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Program</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Intake</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Unit</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Term</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Enrolled</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Deregistered</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">By</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Reason</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deregisteredUnits.map((unit) => (
                  <tr key={unit.enrollment_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{unit.student_name}</div>
                      <div className="text-xs text-slate-500">{unit.student_number}</div>
                      <div className="text-xs text-slate-400">{unit.student_email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{unit.program_name}</div>
                      <div className="text-xs text-slate-400">{unit.program_code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{unit.intake_name}</div>
                      <div className="text-xs text-slate-400">{unit.intake_code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-medium">{unit.course_code}</div>
                      <div className="text-xs text-slate-500">{unit.course_name}</div>
                      {unit.instructor_name && (
                        <div className="text-xs text-slate-400">Instructor: {unit.instructor_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{unit.term_name}</div>
                      <div className="text-xs text-slate-400">{unit.term_code}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(unit.enrolled_at)}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(unit.deregistered_at)}</td>
                    <td className="px-6 py-4 text-slate-600">{unit.deregistered_by_name || 'System'}</td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {unit.deregistration_reason || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={unit.status === 'deregistered' ? 'danger' : 'default'}>
                        {unit.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} records
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}