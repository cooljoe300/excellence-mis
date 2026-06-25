'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { createProgram, updateProgram } from '@/app/actions/programs';
import type { Program } from '@/lib/types';

export function ProgramFormModal({ onClose, program }: { onClose: () => void; program?: Program }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    if (!program) {
      formData.set('is_active', 'true');
    }

    const result = program
      ? await updateProgram(program.id, formData)
      : await createProgram(formData);

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
          {program ? 'Edit Program' : 'Add Program'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            name="name"
            label="Program name"
            defaultValue={program?.name}
            required
          />
          <Input
            name="code"
            label="Code"
            placeholder="DIT"
            defaultValue={program?.code}
            required
          />
          <Textarea
            name="description"
            label="Description"
            rows={3}
            defaultValue={program?.description ?? ''}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="duration_months"
              label="Duration (months)"
              type="number"
              defaultValue={program?.duration_months?.toString() ?? '12'}
              required
            />
            <Input
              name="tuition_fee"
              label="Tuition fee (KES)"
              type="number"
              step="0.01"
              defaultValue={program?.tuition_fee?.toString() ?? '0'}
              required
            />
          </div>
          {program && (
            <Select
              name="is_active"
              label="Status"
              defaultValue={program.is_active ? 'true' : 'false'}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : program ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
