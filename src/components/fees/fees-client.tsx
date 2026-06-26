'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createFeePayment } from '@/app/actions/fees';
import type { AcademicTerm, FeePayment, FeePaymentSubmission, Student } from '@/lib/types';
import { formatCurrency, formatDate, getFeeBalance } from '@/lib/utils';

function FeeFormModal({
  students,
  terms,
  onClose,
}: {
  students: Student[];
  terms: AcademicTerm[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createFeePayment(new FormData(e.currentTarget));
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
        <h2 className="text-lg font-semibold">Record Fee Payment</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Select
            name="student_id"
            label="Student"
            options={[
              { value: '', label: 'Select student' },
              ...students.map((s) => ({
                value: s.id,
                label: `${s.student_number} — ${s.first_name} ${s.last_name}`,
              })),
            ]}
            required
          />
          <Select
            name="term_id"
            label="Academic term"
            options={[
              { value: '', label: 'No term' },
              ...terms.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input name="amount" label="Amount (KES)" type="number" step="0.01" required />
            <Input name="amount_paid" label="Amount paid (KES)" type="number" step="0.01" defaultValue="0" />
          </div>
          <Input name="due_date" label="Due date" type="date" />
          <Input name="payment_method" label="Payment method" placeholder="M-Pesa, Bank, Cash" />
          <Input name="reference_number" label="Reference number" />
          <Input name="description" label="Description" placeholder="Tuition fee - Term 1" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FeesClient({
  fees,
  students,
  terms,
}: {
  fees: FeePayment[];
  students: Student[];
  terms: AcademicTerm[];
}) {
  const [showForm, setShowForm] = useState(false);

  const totalOutstanding = fees.reduce((sum, f) => sum + getFeeBalance(f), 0);
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount_paid ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Fees & Payments"
        description={`Collected: ${formatCurrency(totalPaid)} · Outstanding: ${formatCurrency(totalOutstanding)}`}
        action={<Button onClick={() => setShowForm(true)}>+ Record Payment</Button>}
      />

      {fees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No fee records yet.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Description</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Amount</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Paid</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Balance</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Payment ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map((fee) => {
                const balance = getFeeBalance(fee);
                const submissions = [...((fee.submissions ?? []) as FeePaymentSubmission[])].sort(
                  (a, b) => b.created_at.localeCompare(a.created_at)
                );
                return (
                  <tr key={fee.id} className="align-top hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">
                      {(fee.student as Student)?.first_name} {(fee.student as Student)?.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{fee.description ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(fee.created_at)}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(fee.amount)}</td>
                    <td className="px-6 py-4 font-medium text-emerald-700">
                      {formatCurrency(fee.amount_paid)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-700">
                      {balance > 0 ? formatCurrency(balance) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={balance <= 0 ? 'active' : fee.status}>
                        {balance <= 0 ? 'paid in full' : fee.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {submissions.length === 0 ? (
                        fee.reference_number ? (
                          <span>
                            {fee.payment_method} · {fee.reference_number}
                          </span>
                        ) : (
                          '—'
                        )
                      ) : (
                        <div className="space-y-1">
                          {submissions.map((s) => (
                            <div key={s.id} className="text-xs">
                              <span className="font-medium">{formatCurrency(s.amount)}</span>
                              {' · '}
                              {s.payment_method} · {s.reference_number}
                              <span className="block text-slate-400">{formatDate(s.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && (
        <FeeFormModal students={students} terms={terms} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}
