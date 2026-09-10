'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { createIntake, updateIntake } from '@/app/actions/intakes';
import type { Intake } from '@/lib/types';

export function IntakeFormModal({ onClose, intake }: { onClose: () => void; intake?: Intake }) {
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

    const result = intake ? await updateIntake(intake.id, formData) : await createIntake(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    success(intake ? 'Intake updated successfully' : 'Intake created successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={intake ? 'Edit Intake' : 'Add Intake'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Intake name" placeholder="September 2025" defaultValue={intake?.name} required />
        <Input name="code" label="Code" placeholder="SEP-2025" defaultValue={intake?.code} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input name="start_date" label="Start date" type="date" defaultValue={intake?.start_date} required />
          <Input name="end_date" label="End date" type="date" defaultValue={intake?.end_date} required />
        </div>
        <div>
          <label htmlFor="is_current" className="block text-sm font-medium text-slate-700">Current intake</label>
          <Select
            name="is_current"
            id="is_current"
            defaultValue={intake?.is_current ? 'true' : 'false'}
            options={[
              { value: 'false', label: 'No' },
              { value: 'true', label: 'Yes — default for new admissions' },
            ]}
          />
        </div>
        <div>
          <label htmlFor="is_active" className="block text-sm font-medium text-slate-700">Status</label>
          <Select
            name="is_active"
            id="is_active"
            defaultValue={intake?.is_active === false ? 'false' : 'true'}
            options={[
              { value: 'true', label: 'Active — open for admissions' },
              { value: 'false', label: 'Closed' },
            ]}
          />
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : intake ? 'Save changes' : 'Create intake'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
