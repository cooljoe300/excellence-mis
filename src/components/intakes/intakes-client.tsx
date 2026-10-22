'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { IntakeFormModal } from '@/components/intakes/intake-form-modal';
import { deleteIntake } from '@/app/actions/intakes';
import type { Intake } from '@/lib/types';
import { Inbox } from 'lucide-react';

export function IntakesClient({ intakes }: { intakes: Intake[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingIntake, setEditingIntake] = useState<Intake | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Intake | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteIntake(deleteTarget.id);
    if (result.error) {
      toastError(result.error);
      setDeleting(false);
      return;
    }
    success(`Intake "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Intakes"
        description="Create and manage admission intakes (e.g. September 2025, January 2026)"
        action={<Button onClick={() => setShowForm(true)}>+ Add Intake</Button>}
      />

      {intakes.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No intakes yet"
          description="Add your first intake to assign students to admission cohorts."
          action={<Button onClick={() => setShowForm(true)}>+ Add Intake</Button>}
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">S/N</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {intakes.map((intake, index) => (
                <TableRow key={intake.id}>
                  <TableCell className="text-slate-600">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{intake.code}</TableCell>
                  <TableCell className="font-medium text-slate-900">{intake.name}</TableCell>
                  <TableCell className="text-muted">{formatDate(intake.start_date)}</TableCell>
                  <TableCell className="text-muted">{formatDate(intake.end_date)}</TableCell>
                  <TableCell>
                    {intake.is_current ? (
                      <Badge status="active">Current</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge status={intake.is_active ? 'active' : 'inactive'}>
                      {intake.is_active ? 'Open' : 'Closed'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingIntake(intake)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(intake)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}

      {showForm && <IntakeFormModal onClose={() => setShowForm(false)} />}
      {editingIntake && (
        <IntakeFormModal intake={editingIntake} onClose={() => setEditingIntake(null)} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete intake"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? Students linked to this intake will be unassigned.`}
        confirmLabel="Delete intake"
        loading={deleting}
      />
    </div>
  );
}
