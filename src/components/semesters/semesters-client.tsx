'use client';

import { useState } from 'react';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { SemesterFormModal } from '@/components/semesters/semester-form-modal';
import { deleteAcademicTerm } from '@/app/actions/academic-terms';
import type { AcademicTerm } from '@/lib/types';

export function SemestersClient({ terms }: { terms: AcademicTerm[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Semesters"
        description="Create and manage academic semesters used for enrolments and fee billing"
        action={<Button onClick={() => setShowForm(true)}>+ Add Semester</Button>}
      />

      {terms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No semesters yet. Add your first semester to enable unit registration.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Code</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Start</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">End</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Current</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {terms.map((term) => (
                <tr key={term.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs font-medium">{term.code}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{term.name}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(term.start_date)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(term.end_date)}</td>
                  <td className="px-6 py-4">
                    {term.is_current ? (
                      <Badge status="active">Current</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingTerm(term)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deletingId === term.id}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete semester "${term.name}"? This cannot be undone if students are enrolled.`
                            )
                          ) {
                            return;
                          }
                          setDeletingId(term.id);
                          const result = await deleteAcademicTerm(term.id);
                          if (result.error) {
                            window.alert(result.error);
                            setDeletingId(null);
                            return;
                          }
                          window.location.reload();
                        }}
                      >
                        {deletingId === term.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && <SemesterFormModal onClose={() => setShowForm(false)} />}
      {editingTerm && (
        <SemesterFormModal term={editingTerm} onClose={() => setEditingTerm(null)} />
      )}
    </div>
  );
}
