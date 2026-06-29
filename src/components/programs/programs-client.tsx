'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import { ProgramFormModal } from '@/components/programs/program-form-modal';
import { deleteProgram } from '@/app/actions/programs';
import type { Program } from '@/lib/types';
import { GraduationCap } from 'lucide-react';

export function ProgramsClient({ programs }: { programs: Program[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Program | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteProgram(deleteTarget.id);
    if (result.error) {
      toastError(result.error);
      setDeleting(false);
      return;
    }
    success(`Program "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Programs"
        description="Academic programs offered at Excellence Online College"
        action={<Button onClick={() => setShowForm(true)}>+ Add Program</Button>}
      />

      {programs.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No programs yet"
          description="Add your first academic program to start enrolling students."
          action={<Button onClick={() => setShowForm(true)}>+ Add Program</Button>}
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Admission prefix</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Tuition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program) => (
                <TableRow key={program.id}>
                  <TableCell className="font-mono text-xs font-medium">{program.code}</TableCell>
                  <TableCell className="font-mono text-xs text-blue-700">
                    {(program.admission_prefix || program.code).toUpperCase()}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{program.name}</TableCell>
                  <TableCell className="text-muted">{program.duration_months} months</TableCell>
                  <TableCell className="text-muted">{formatCurrency(program.tuition_fee)}</TableCell>
                  <TableCell>
                    <Badge status={program.is_active ? 'active' : 'inactive'}>
                      {program.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingProgram(program)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(program)}>
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

      {showForm && <ProgramFormModal onClose={() => setShowForm(false)} />}
      {editingProgram && (
        <ProgramFormModal program={editingProgram} onClose={() => setEditingProgram(null)} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete program"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete program"
        loading={deleting}
      />
    </div>
  );
}
