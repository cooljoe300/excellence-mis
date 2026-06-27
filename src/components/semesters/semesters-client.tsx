'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { SemesterFormModal } from '@/components/semesters/semester-form-modal';
import { deleteAcademicTerm, setCurrentAcademicTerm } from '@/app/actions/academic-terms';
import type { AcademicTerm } from '@/lib/types';
import { CalendarDays } from 'lucide-react';

export function SemestersClient({ terms }: { terms: AcademicTerm[] }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AcademicTerm | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null);
  const hasCurrentTerm = terms.some((term) => term.is_current);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteAcademicTerm(deleteTarget.id);
    if (result.error) {
      toastError(result.error);
      setDeleting(false);
      return;
    }
    success(`Semester "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Semesters"
        description="Create and manage academic semesters used for enrolments and fee billing"
        action={<Button onClick={() => setShowForm(true)}>+ Add Semester</Button>}
      />

      {terms.length > 0 && !hasCurrentTerm && (
        <Alert variant="warning" className="mb-4">
          No semester is marked as current. Students cannot register units until you set one as
          current — use the <strong>Set current</strong> button below.
        </Alert>
      )}

      {terms.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No semesters yet"
          description="Add your first semester to enable unit registration and fee billing."
          action={<Button onClick={() => setShowForm(true)}>+ Add Semester</Button>}
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Current</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-mono text-xs font-medium">{term.code}</TableCell>
                  <TableCell className="font-medium text-slate-900">{term.name}</TableCell>
                  <TableCell className="text-muted">{formatDate(term.start_date)}</TableCell>
                  <TableCell className="text-muted">{formatDate(term.end_date)}</TableCell>
                  <TableCell>
                    {term.is_current ? (
                      <Badge status="active">Current</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {!term.is_current && (
                        <Button
                          size="sm"
                          disabled={settingCurrentId === term.id}
                          onClick={async () => {
                            setSettingCurrentId(term.id);
                            const result = await setCurrentAcademicTerm(term.id);
                            if (result.error) {
                              toastError(result.error);
                              setSettingCurrentId(null);
                              return;
                            }
                            success(`"${term.name}" set as current semester`);
                            setSettingCurrentId(null);
                            router.refresh();
                          }}
                        >
                          {settingCurrentId === term.id ? 'Setting...' : 'Set current'}
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setEditingTerm(term)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(term)}>
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

      {showForm && <SemesterFormModal onClose={() => setShowForm(false)} />}
      {editingTerm && (
        <SemesterFormModal term={editingTerm} onClose={() => setEditingTerm(null)} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete semester"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone if students are enrolled.`}
        confirmLabel="Delete semester"
        loading={deleting}
      />
    </div>
  );
}
