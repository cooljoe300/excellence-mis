'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createProgram } from '@/app/actions/programs';

export function ProgramFormModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set('is_active', 'true');
    const result = await createProgram(formData);
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
        <h2 className="text-lg font-semibold text-slate-900">Add Program</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input name="name" label="Program name" required />
          <Input name="code" label="Code" placeholder="DIT" required />
          <Textarea name="description" label="Description" rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="duration_months" label="Duration (months)" type="number" defaultValue="12" required />
            <Input name="tuition_fee" label="Tuition fee (KES)" type="number" step="0.01" defaultValue="0" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
