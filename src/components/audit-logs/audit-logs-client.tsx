'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Download, Search, Filter, X, FileText, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import type { AuditLog } from '@/app/actions/audit-logs';

interface AuditLogsClientProps {
  auditLogs: AuditLog[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  limit: number;
  pageData: {
    modules: string[];
    actions: string[];
    entityTypes: string[];
  };
  filters: {
    search?: string;
    userId?: string;
    action?: string;
    module?: string;
    entityType?: string;
    actorType?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export function AuditLogsClient({
  auditLogs,
  totalCount,
  currentPage,
  totalPages,
  limit,
  pageData,
  filters,
}: AuditLogsClientProps) {
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
    router.push(`/dashboard/audit-logs?${params.toString()}`);
  }

  function clearFilters() {
    router.push('/dashboard/audit-logs');
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/dashboard/audit-logs?${params.toString()}`);
  }

  function exportData() {
    // Create CSV content
    const headers = [
      'Date',
      'User',
      'User Role',
      'Action',
      'Module',
      'Entity Type',
      'Entity Name',
      'Details',
      'IP Address',
      'Status',
    ];

    const rows = auditLogs.map((log) => [
      formatDate(log.created_at),
      log.user_name || 'System',
      log.user_role || 'N/A',
      log.action,
      log.module,
      log.entity_type || 'N/A',
      log.entity_name || 'N/A',
      log.details || 'N/A',
      log.ip_address || 'N/A',
      log.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
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
                placeholder="User, action, module, or entity"
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Module</label>
              <Select
                value={filters.module || ''}
                onChange={(value) => updateFilter('module', value)}
                options={[
                  { value: '', label: 'All Modules' },
                  ...pageData.modules.map((m) => ({
                    value: m,
                    label: m,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Action</label>
              <Select
                value={filters.action || ''}
                onChange={(value) => updateFilter('action', value)}
                options={[
                  { value: '', label: 'All Actions' },
                  ...pageData.actions.map((a) => ({
                    value: a,
                    label: a,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Entity Type</label>
              <Select
                value={filters.entityType || ''}
                onChange={(value) => updateFilter('entityType', value)}
                options={[
                  { value: '', label: 'All Entity Types' },
                  ...pageData.entityTypes.map((e) => ({
                    value: e,
                    label: e,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Actor Type</label>
              <Select
                value={filters.actorType || ''}
                onChange={(value) => updateFilter('actorType', value)}
                options={[
                  { value: '', label: 'All Actors' },
                  { value: 'ADMIN', label: 'Admin' },
                  { value: 'STAFF', label: 'Staff' },
                  { value: 'STUDENT', label: 'Student' },
                  { value: 'SYSTEM', label: 'System' },
                ]}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <Select
                value={filters.status || ''}
                onChange={(value) => updateFilter('status', value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'success', label: 'Success' },
                  { value: 'failure', label: 'Failure' },
                  { value: 'pending', label: 'Pending' },
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

      {auditLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No audit logs found.
        </div>
      ) : (
        <>
          <DataTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500 w-12">S/N</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Actor</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">User</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Action</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Module</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Entity</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Details</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-600">{(currentPage - 1) * limit + index + 1}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{formatDate(log.created_at)}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="text-xs">
                        {log.actor_type || 'SYSTEM'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{log.user_name || 'System'}</div>
                      <div className="text-xs text-slate-500">{log.user_email || 'N/A'}</div>
                      <div className="text-xs text-slate-400">{log.user_role || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <Badge className="bg-slate-100 text-slate-700">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{log.module}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="font-medium">{log.entity_type || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{log.entity_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate">
                      {log.details || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {log.status === 'success' ? (
                        <Badge variant="default" className="flex items-center gap-1 bg-emerald-100 text-emerald-800">
                          <CheckCircle className="h-3 w-3" />
                          Success
                        </Badge>
                      ) : log.status === 'failure' ? (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Failure
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
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
