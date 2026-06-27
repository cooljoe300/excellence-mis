'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { createAcademicTerm, updateAcademicTerm } from '@/app/actions/academic-terms';
import type { AcademicTerm } from '@/lib/types';

export function SemesterFormModal({
  onClose,
  term,
}: {
  onClose: () => void;
  term?: AcademicTerm;
}) {
  const router = useRouter();
  const { success } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;

    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      setLoading(false);
      return;
    }

    const result = term
      ? await updateAcademicTerm(term.id, formData)
      : await createAcademicTerm(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    success(term ? 'Semester updated successfully' : 'Semester created successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={term ? 'Edit Semester' : 'Add Semester'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          label="Semester name"
          placeholder="2025/2026 Semester 1"
          defaultValue={term?.name}
          required
        />
        <Input
          name="code"
          label="Code"
          placeholder="2025-S1"
          defaultValue={term?.code}
          required
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input name="start_date" label="Start date" type="date" defaultValue={term?.start_date} required />
          <Input name="end_date" label="End date" type="date" defaultValue={term?.end_date} required />
        </div>
        <Select
          name="is_current"
          label="Current semester"
          defaultValue={term?.is_current ? 'true' : 'false'}
          options={[
            { value: 'false', label: 'No' },
            { value: 'true', label: 'Yes — use for registrations & fees' },
          ]}
        />
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : term ? 'Save changes' : 'Create semester'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
