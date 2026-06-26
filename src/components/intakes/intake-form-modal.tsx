'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createIntake, updateIntake } from '@/app/actions/intakes';
import type { Intake } from '@/lib/types';

export function IntakeFormModal({ onClose, intake }: { onClose: () => void; intake?: Intake }) {
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

    const result = intake ? await updateIntake(intake.id, formData) : await createIntake(formData);

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
          {intake ? 'Edit Intake' : 'Add Intake'}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            name="name"
            label="Intake name"
            placeholder="September 2025"
            defaultValue={intake?.name}
            required
          />
          <Input
            name="code"
            label="Code"
            placeholder="SEP-2025"
            defaultValue={intake?.code}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="start_date"
              label="Start date"
              type="date"
              defaultValue={intake?.start_date}
              required
            />
            <Input
              name="end_date"
              label="End date"
              type="date"
              defaultValue={intake?.end_date}
              required
            />
          </div>
          <Select
            name="is_current"
            label="Current intake"
            defaultValue={intake?.is_current ? 'true' : 'false'}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes — default for new admissions' },
            ]}
          />
          <Select
            name="is_active"
            label="Status"
            defaultValue={intake?.is_active === false ? 'false' : 'true'}
            options={[
              { value: 'true', label: 'Active — open for admissions' },
              { value: 'false', label: 'Closed' },
            ]}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : intake ? 'Save changes' : 'Create intake'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
