'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {term ? 'Edit Semester' : 'Add Semester'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="start_date"
              label="Start date"
              type="date"
              defaultValue={term?.start_date}
              required
            />
            <Input
              name="end_date"
              label="End date"
              type="date"
              defaultValue={term?.end_date}
              required
            />
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : term ? 'Save changes' : 'Create semester'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
