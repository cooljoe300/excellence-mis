'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteStudent } from '@/app/actions/students';

export function DeleteStudentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteStudent(id);
    if (result.error) {
      toastError(result.error);
      setLoading(false);
      return;
    }
    success(`Student "${name}" deleted`);
    router.push('/dashboard/students');
    router.refresh();
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)} disabled={loading}>
        {loading ? 'Deleting...' : 'Delete'}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title="Delete student"
        description={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
        confirmLabel="Delete student"
        loading={loading}
      />
    </>
  );
}
