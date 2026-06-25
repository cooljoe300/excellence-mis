'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteStudent } from '@/app/actions/students';
import { useState } from 'react';

export function DeleteStudentButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteStudent(id);
    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }
    router.push('/dashboard/students');
    router.refresh();
  }

  return (
    <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
      {loading ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
