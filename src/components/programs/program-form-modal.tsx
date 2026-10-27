'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import Select from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { createProgram, updateProgram } from '@/app/actions/programs';
import type { Program } from '@/lib/types';

export function ProgramFormModal({ onClose, program }: { onClose: () => void; program?: Program }) {
  const router = useRouter();
  const { success } = useToast();
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
    success(program ? 'Program updated successfully' : 'Program created successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={program ? 'Edit Program' : 'Add Program'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="name" label="Program name" defaultValue={program?.name} required />
        <Input name="code" label="Program code" placeholder="CIFA" defaultValue={program?.code} required />
        <Input
          name="admission_prefix"
          label="Admission prefix"
          placeholder={program?.code ?? 'CIFA'}
          defaultValue={program?.admission_prefix ?? program?.code ?? ''}
          required
        />
        <p className="text-xs text-slate-500 -mt-2">
          Replaces {'{CODE}'} in the programme&apos;s admission number format.
        </p>
        <Input
          name="admission_number_format"
          label="Admission number format (optional)"
          placeholder="EOC/{CODE}/{SEQ3}/{YY}"
          defaultValue={program?.admission_number_format ?? ''}
        />
        <p className="text-xs text-slate-500 -mt-2">
          Leave blank to use the global format. Tokens: {'{CODE}'}, {'{YYYY}'}, {'{YY}'},{' '}
          {'{AY}'}, {'{INTAKE}'}, {'{MODE}'}, {'{CAMPUS}'}, {'{SEQ}'}, {'{SEQ3}'}, {'{SEQ4}'},{' '}
          {'{SEQ:n}'}. A sequence token is required.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            name="admission_sequence_start"
            label="Admission sequence start"
            type="number"
            min={1}
            defaultValue={program?.admission_sequence_start?.toString() ?? '1'}
          />
          <Input
            name="program_type"
            label="Programme type (optional)"
            placeholder="e.g. Certificate, Diploma, Professional"
            defaultValue={program?.program_type ?? ''}
          />
          <Input
            name="study_modes"
            label="Study modes (optional)"
            placeholder="e.g. Online, Blended, Evening"
            defaultValue={(program?.study_modes ?? []).join(', ')}
          />
          <Input
            name="campus"
            label="Campus (optional)"
            defaultValue={program?.campus ?? ''}
          />
        </div>
        <Textarea
          name="description"
          label="Description"
          rows={3}
          defaultValue={program?.description ?? ''}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div>
            <label htmlFor="is_active" className="block text-sm font-medium text-slate-700">Status</label>
            <Select
              name="is_active"
              id="is_active"
              defaultValue={program.is_active ? 'true' : 'false'}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          </div>
        )}
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : program ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
