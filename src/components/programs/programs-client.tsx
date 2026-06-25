'use client';

import { useState } from 'react';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ProgramFormModal } from '@/components/programs/program-form-modal';
import type { Program } from '@/lib/types';
import { deleteProgram } from '@/app/actions/programs';

export function ProgramsClient({ programs }: { programs: Program[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Programs"
        description="Academic programs offered at Excellence Online College"
        action={
          <Button onClick={() => setShowForm(true)}>
            + Add Program
          </Button>
        }
      />

      {programs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No programs yet. Add your first program.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Code</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Duration</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Tuition</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((program) => (
                <tr key={program.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs font-medium">{program.code}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{program.name}</td>
                  <td className="px-6 py-4 text-slate-600">{program.duration_months} months</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(program.tuition_fee)}</td>
                  <td className="px-6 py-4">
                    <Badge status={program.is_active ? 'active' : 'inactive'}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingProgram(program)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deletingId === program.id}
                        onClick={async () => {
                          if (!window.confirm(`Delete program "${program.name}"? This cannot be undone.`)) {
                            return;
                          }
                          try {
                            setDeletingId(program.id);
                            await deleteProgram(program.id);
                            window.location.reload();
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                      >
                        {deletingId === program.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && (
        <ProgramFormModal
          onClose={() => setShowForm(false)}
        />
      )}
      {editingProgram && (
        <ProgramFormModal
          program={editingProgram}
          onClose={() => setEditingProgram(null)}
        />
      )}
    </div>
  );
}
