'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Alert } from '@/components/ui/alert';
import { useToast } from '@/components/ui/toast';
import { createFeePayment, approveFeePaymentSubmission, markFeeAsPaid, rejectFeePaymentSubmission } from '@/app/actions/fees';
import type { AcademicTerm, FeePayment, FeePaymentSubmission, Student } from '@/lib/types';
import {
  formatCurrency,
  formatDate,
  getFeeBalance,
  getStudentFeeDisplayStatus,
} from '@/lib/utils';
import { CheckCircle2, XCircle, MessageCircle, Bell } from 'lucide-react';

type PendingApproval = {
  submission: FeePaymentSubmission;
  fee: FeePayment;
  student: Student;
};

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
  const { success } = useToast();
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
    success('Fee payment recorded successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="Record Fee Payment" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Record'}</Button>
          </div>
        </form>
    </Modal>
  );
}

function MarkAsPaidModal({
  fee,
  onClose,
}: {
  fee: FeePayment;
  onClose: () => void;
}) {
  const router = useRouter();
  const { success } = useToast();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await markFeeAsPaid(fee.id, new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    success('Fee payment marked as paid successfully');
    router.refresh();
    onClose();
  }

  const student = fee.student as Student;
  const balance = getFeeBalance(fee);

  return (
    <Modal open onClose={onClose} title="Mark Fee as Paid" size="md">
      <div className="mb-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Student:</span>
          <span className="text-sm font-medium text-slate-900">
            {student?.first_name} {student?.last_name}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Admission Number:</span>
          <span className="text-sm font-mono text-slate-900">{student?.admission_number || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Total Amount:</span>
          <span className="text-sm font-semibold text-slate-900">{formatCurrency(fee.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Current Status:</span>
          <Badge status={fee.status}>{fee.status}</Badge>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          name="amount_paid" 
          label="Amount Paid (KES)" 
          type="number" 
          step="0.01" 
          defaultValue={fee.amount}
          required
        />
        <Select
          name="payment_method"
          label="Payment method"
          options={[
            { value: '', label: 'Select method' },
            { value: 'M-Pesa', label: 'M-Pesa' },
            { value: 'Bank', label: 'Bank' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Card', label: 'Card' },
            { value: 'Other', label: 'Other' },
          ]}
          defaultValue={fee.payment_method || ''}
        />
        <Input name="reference_number" label="Reference number / Receipt number" defaultValue={fee.reference_number || ''} />
        <Input name="payment_date" label="Payment date" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
        <Input name="notes" label="Notes (optional)" placeholder="Additional details about this payment" />
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Processing...' : 'Confirm Payment'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RejectModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  rejectionReason,
  onReasonChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
}) {
  return (
    <Modal open={isOpen} onClose={onClose} title="Reject Payment" size="md">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Please provide a reason for rejecting this payment. This will be communicated to the student.
        </p>
        <textarea
          value={rejectionReason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g., Transaction reference could not be verified"
          className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
        />
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading || !rejectionReason.trim()} variant="danger">
            {loading ? 'Rejecting...' : 'Reject Payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FeesClient({
  fees,
  students,
  terms,
  pendingApprovals,
  approvalSetup,
}: {
  fees: FeePayment[];
  students: Student[];
  terms: AcademicTerm[];
  pendingApprovals: PendingApproval[];
  approvalSetup: { ready: boolean; message?: string };
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [markAsPaidFee, setMarkAsPaidFee] = useState<FeePayment | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveSuccess, setApproveSuccess] = useState<string | null>(null);
  const [whatsappStatus, setWhatsappStatus] = useState<{ notified: boolean; error?: string } | null>(null);

  const totalOutstanding = fees.reduce((sum, f) => sum + getFeeBalance(f), 0);
  const totalPaid = fees.reduce((sum, f) => sum + Number(f.amount_paid ?? 0), 0);
  const pendingCount = pendingApprovals.length;

  const pendingByFeeId = new Map<string, PendingApproval[]>();
  for (const item of pendingApprovals) {
    const feeId = item.submission.fee_payment_id;
    const list = pendingByFeeId.get(feeId) ?? [];
    list.push(item);
    pendingByFeeId.set(feeId, list);
  }

  async function handleApprove(submissionId: string) {
    setApprovingId(submissionId);
    setApproveError(null);
    setApproveSuccess(null);
    setWhatsappStatus(null);
    const result = await approveFeePaymentSubmission(submissionId);
    if (result.error) {
      setApproveError(result.error);
      setApprovingId(null);
      return;
    }
    setApprovingId(null);
    setApproveSuccess('Payment approved successfully.');
    setWhatsappStatus({
      notified: result.whatsappNotified || false,
      error: result.whatsappError || undefined,
    });
    router.refresh();
  }

  function handleRejectClick(submissionId: string) {
    setRejectingId(submissionId);
    setRejectionReason('');
    setShowRejectModal(true);
  }

  async function handleRejectConfirm() {
    if (!rejectingId || !rejectionReason.trim()) {
      setApproveError('Please provide a rejection reason.');
      return;
    }
    
    setApproveError(null);
    const result = await rejectFeePaymentSubmission(rejectingId, rejectionReason);
    if (result.error) {
      setApproveError(result.error);
      return;
    }
    
    setRejectingId(null);
    setShowRejectModal(false);
    setRejectionReason('');
    setWhatsappStatus({
      notified: result.whatsappNotified || false,
      error: result.whatsappError || undefined,
    });
    setApproveSuccess('Payment rejected successfully.');
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Fees & Payments"
        description={`Collected: ${formatCurrency(totalPaid)} · Outstanding: ${formatCurrency(totalOutstanding)}${pendingCount > 0 ? ` · ${pendingCount} pending approval` : ''}`}
        action={<Button onClick={() => setShowForm(true)}>+ Record Payment</Button>}
      />

      {approveError && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{approveError}</div>
      )}

      {approveSuccess && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {approveSuccess}
          {whatsappStatus && !whatsappStatus.notified && whatsappStatus.error && (
            <span className="block mt-1 text-amber-700">
              WhatsApp notification failed: {whatsappStatus.error}
            </span>
          )}
        </div>
      )}

      {!approvalSetup.ready && approvalSetup.message && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {approvalSetup.message}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60">
        <div className="border-b border-amber-200 px-6 py-4">
          <h2 className="font-semibold text-amber-900">
            Pending approval{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            When students submit M-Pesa or bank payment codes, verify the reference and click{' '}
            <strong>Approve</strong>.
          </p>
        </div>

        {pendingCount === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-600">
            No payments waiting for approval right now.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-amber-200/80 bg-amber-100/50 text-left text-amber-900">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Invoice</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Method</th>
                  <th className="px-6 py-3 font-medium">Reference</th>
                  <th className="px-6 py-3 font-medium">Submitted</th>
                  <th className="px-6 py-3 font-medium">WhatsApp</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/60">
                {pendingApprovals.map(({ submission, fee, student }) => (
                  <tr key={submission.id} className="bg-white/70">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {student?.first_name} {student?.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{fee.description ?? 'Fee invoice'}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatCurrency(submission.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{submission.payment_method}</td>
                    <td className="px-6 py-4 font-mono text-slate-800">{submission.reference_number}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(submission.created_at)}</td>
                    <td className="px-6 py-4">
                      <MessageCircle className="h-4 w-4 text-slate-400" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={approvingId === submission.id}
                          onClick={() => handleApprove(submission.id)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {approvingId === submission.id ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRejectClick(submission.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Link href={`/dashboard/fees/receipt/${submission.id}`} target="_blank">
                          <Button size="sm" variant="secondary">
                            Receipt
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                <th className="px-6 py-3 text-left font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fees.map((fee) => {
                const balance = getFeeBalance(fee);
                const pendingSubmissions = pendingByFeeId.get(fee.id) ?? [];
                const submissions = [...((fee.submissions ?? []) as FeePaymentSubmission[])].sort(
                  (a, b) => b.created_at.localeCompare(a.created_at)
                );
                const pendingAmount = pendingSubmissions.reduce(
                  (sum, { submission }) => sum + Number(submission.amount),
                  0
                );
                const displayStatus =
                  pendingAmount > 0 ? 'pending approval' : getStudentFeeDisplayStatus(fee);
                return (
                  <tr key={fee.id} className="align-top hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">
                      {(fee.student as Student)?.first_name} {(fee.student as Student)?.last_name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <p>{fee.description ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(fee.created_at)}</p>
                      {pendingAmount > 0 && (
                        <p className="mt-1 text-xs font-medium text-amber-700">
                          {formatCurrency(pendingAmount)} awaiting approval
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatCurrency(fee.amount)}</td>
                    <td className="px-6 py-4 font-medium text-emerald-700">
                      {formatCurrency(fee.amount_paid)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-blue-700">
                      {balance > 0 ? formatCurrency(balance) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={displayStatus}>{displayStatus}</Badge>
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
                        <div className="space-y-2">
                          {pendingSubmissions.map(({ submission: s }) => (
                            <div
                              key={s.id}
                              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"
                            >
                              <div className="font-medium text-amber-900">
                                {formatCurrency(s.amount)} · {s.payment_method} · {s.reference_number}
                              </div>
                              <span className="text-amber-700">{formatDate(s.created_at)}</span>
                            </div>
                          ))}
                          {submissions
                            .filter((s) => s.status !== 'pending')
                            .map((s) => (
                              <div key={s.id} className="text-xs text-slate-500">
                                <span className="font-medium text-slate-700">
                                  {formatCurrency(s.amount)}
                                </span>
                                {' · '}
                                {s.payment_method} · {s.reference_number}
                                <span className="block text-slate-400">
                                  {s.status === 'approved' ? 'Approved' : s.status} ·{' '}
                                  {formatDate(s.created_at)}
                                </span>
                                <Link
                                  href={`/dashboard/fees/receipt/${s.id}`}
                                  target="_blank"
                                  className="mt-1 inline-block text-blue-700 hover:underline"
                                >
                                  View receipt
                                </Link>
                              </div>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {pendingSubmissions.length > 0 ? (
                        <div className="space-y-2">
                          {pendingSubmissions.map(({ submission: s }) => (
                            <div key={s.id} className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={approvingId === s.id}
                                onClick={() => handleApprove(s.id)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                {approvingId === s.id ? 'Approving...' : 'Approve'}
                              </Button>
                              <Link href={`/dashboard/fees/receipt/${s.id}`} target="_blank">
                                <Button size="sm" variant="secondary">
                                  Receipt
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : fee.status !== 'paid' ? (
                        <Button
                          size="sm"
                          onClick={() => setMarkAsPaidFee(fee)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark as Paid
                        </Button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard/fees/fee-receipt/${fee.id}`} target="_blank">
                            <Button size="sm" variant="secondary">
                              View Receipt
                            </Button>
                          </Link>
                          <Link href={`/dashboard/fees/fee-receipt/${fee.id}`} target="_blank">
                            <Button size="sm" variant="ghost">
                              Download PDF
                            </Button>
                          </Link>
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
      
      {markAsPaidFee && (
        <MarkAsPaidModal fee={markAsPaidFee} onClose={() => setMarkAsPaidFee(null)} />
      )}
      
      {showRejectModal && (
        <RejectModal
          isOpen={showRejectModal}
          onClose={() => setShowRejectModal(false)}
          onConfirm={handleRejectConfirm}
          loading={!!rejectingId}
          rejectionReason={rejectionReason}
          onReasonChange={setRejectionReason}
        />
      )}
    </div>
  );
}
