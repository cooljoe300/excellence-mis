'use client';

import { useState } from 'react';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { IntakeFormModal } from '@/components/intakes/intake-form-modal';
import { deleteIntake } from '@/app/actions/intakes';
import type { Intake } from '@/lib/types';

export function IntakesClient({ intakes }: { intakes: Intake[] }) {
  const [showForm, setShowForm] = useState(false);
  const [editingIntake, setEditingIntake] = useState<Intake | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Intakes"
        description="Create and manage admission intakes (e.g. September 2025, January 2026)"
        action={<Button onClick={() => setShowForm(true)}>+ Add Intake</Button>}
      />

      {intakes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No intakes yet. Add your first intake to assign students to admission cohorts.
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
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {intakes.map((intake) => (
                <tr key={intake.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs font-medium">{intake.code}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{intake.name}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(intake.start_date)}</td>
                  <td className="px-6 py-4 text-slate-600">{formatDate(intake.end_date)}</td>
                  <td className="px-6 py-4">
                    {intake.is_current ? (
                      <Badge status="active">Current</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={intake.is_active ? 'active' : 'inactive'}>
                      {intake.is_active ? 'Open' : 'Closed'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingIntake(intake)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deletingId === intake.id}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete intake "${intake.name}"? Students linked to this intake will be unassigned.`
                            )
                          ) {
                            return;
                          }
                          setDeletingId(intake.id);
                          const result = await deleteIntake(intake.id);
                          if (result.error) {
                            window.alert(result.error);
                            setDeletingId(null);
                            return;
                          }
                          window.location.reload();
                        }}
                      >
                        {deletingId === intake.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && <IntakeFormModal onClose={() => setShowForm(false)} />}
      {editingIntake && (
        <IntakeFormModal intake={editingIntake} onClose={() => setEditingIntake(null)} />
      )}
    </div>
  );
}
