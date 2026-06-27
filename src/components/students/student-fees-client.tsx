'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { FeePayment, FeePaymentSubmission, Student } from '@/lib/types';
import type { PaymentSettings } from '@/app/actions/system-settings';
import { submitMyFeePayment } from '@/app/actions/student-fees';
import { formatCurrency, formatDate, getAdmissionNumber, getFeeBalance, getPendingSubmissionAmount, getStudentFeeDisplayStatus } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { CreditCard, Smartphone, Building2, CheckCircle2 } from 'lucide-react';

function PayFeeModal({
  fee,
  admissionNumber,
  paymentSettings,
  onClose,
}: {
  fee: FeePayment;
  admissionNumber: string;
  paymentSettings: PaymentSettings;
  onClose: () => void;
}) {
  const router = useRouter();
  const balance = getFeeBalance(fee);
  const pendingAmount = getPendingSubmissionAmount(fee.submissions);
  const availableBalance = Math.max(0, balance - pendingAmount);
  const [amount, setAmount] = useState(availableBalance.toString());
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      setLoading(false);
      return;
    }

    if (parsedAmount > availableBalance) {
      setError(`Amount cannot exceed the available balance of ${formatCurrency(availableBalance)}.`);
      setLoading(false);
      return;
    }

    const result = await submitMyFeePayment(
      fee.id,
      parsedAmount,
      paymentMethod === 'mpesa' ? 'M-Pesa' : 'Bank',
      referenceNumber.trim()
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(
      `Payment submitted for approval (${formatCurrency(parsedAmount)}). An admin will verify your ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'bank'} code.`
    );
    setReceiptId(result.submissionId ?? null);
    setLoading(false);
    router.refresh();
  }

  return (
    <Modal open onClose={onClose} title="Pay fees" description={fee.description ?? 'Fee invoice'} size="md">

        <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
          <div className="flex items-center gap-2 font-medium text-blue-900">
            <Smartphone className="h-4 w-4" />
            M-Pesa Paybill
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">Business number</span>
            <span className="font-mono font-bold text-blue-900">{paymentSettings.mpesaPaybill}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-800">Account number</span>
            <span className="font-mono font-bold text-blue-900">{admissionNumber}</span>
          </div>
          <p className="text-xs text-blue-700">{paymentSettings.mpesaAccountLabel}</p>

          <div className="border-t border-blue-200 pt-3">
            <div className="flex items-center gap-2 font-medium text-blue-900">
              <Building2 className="h-4 w-4" />
              Bank transfer
            </div>
            <p className="mt-1 text-blue-800">
              {paymentSettings.bankName} · {paymentSettings.bankAccount}
            </p>
            <p className="text-xs text-blue-700">Branch: {paymentSettings.bankBranch}</p>
          </div>
        </div>

        {success ? (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
            <div className="mt-4 flex flex-wrap gap-2">
              {receiptId && (
                <Link href={`/student/fees/receipt/${receiptId}`} target="_blank">
                  <Button>Download receipt</Button>
                </Link>
              )}
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Amount due</span>
                <span className="font-medium">{formatCurrency(fee.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Already paid</span>
                <span className="font-medium">{formatCurrency(fee.amount_paid)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <span>Balance</span>
                <span className="text-blue-700">{formatCurrency(balance)}</span>
              </div>
              {pendingAmount > 0 && (
                <div className="mt-1 flex justify-between text-amber-700">
                  <span>Pending approval</span>
                  <span>{formatCurrency(pendingAmount)}</span>
                </div>
              )}
              {pendingAmount > 0 && (
                <div className="mt-1 flex justify-between font-semibold text-blue-700">
                  <span>Available to pay</span>
                  <span>{formatCurrency(availableBalance)}</span>
                </div>
              )}
            </div>

            <Select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'mpesa', label: 'M-Pesa' },
                { value: 'bank', label: 'Bank transfer' },
              ]}
            />

            <Input
              label="Amount paid (KES)"
              type="number"
              min="1"
              step="0.01"
              max={availableBalance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Input
              label={paymentMethod === 'mpesa' ? 'M-Pesa confirmation code' : 'Bank transaction reference'}
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={paymentMethod === 'mpesa' ? 'e.g. QGH7X8Y9ZL' : 'e.g. FT26063ABC123'}
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit payment'}
              </Button>
            </div>
          </form>
        )}
    </Modal>
  );
}

export function StudentFeesClient({
  student,
  fees,
  paymentSettings,
  totalDue,
  totalPaid,
  totalBilled,
  fromEnrollment = false,
}: {
  student: Student;
  fees: FeePayment[];
  paymentSettings: PaymentSettings;
  totalDue: number;
  totalPaid: number;
  totalBilled: number;
  fromEnrollment?: boolean;
}) {
  const [payingFee, setPayingFee] = useState<FeePayment | null>(null);
  const admissionNumber = getAdmissionNumber(student);

  return (
    <div className="space-y-6">
      {fromEnrollment && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Units registered successfully. Your payment invoice is ready — pay below via M-Pesa or
              bank transfer.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total billed</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(totalBilled)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-sm text-slate-500">Total paid</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="py-5">
            <p className="text-sm text-blue-800">Outstanding balance</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatCurrency(totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-700" />
            How to pay
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">M-Pesa Paybill</p>
            <p className="mt-2 text-slate-600">
              Paybill: <span className="font-mono font-bold">{paymentSettings.mpesaPaybill}</span>
            </p>
            <p className="text-slate-600">
              Account: <span className="font-mono font-bold">{admissionNumber}</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">{paymentSettings.mpesaAccountLabel}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-slate-900">Bank transfer</p>
            <p className="mt-2 text-slate-600">{paymentSettings.bankName}</p>
            <p className="text-slate-600">
              Account: <span className="font-mono font-bold">{paymentSettings.bankAccount}</span>
            </p>
            <p className="text-slate-600">Branch: {paymentSettings.bankBranch}</p>
          </div>
        </CardContent>
      </Card>

      {fees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-slate-500">
          No fee invoices yet. Register units to generate a fee invoice.
        </div>
      ) : (
        <div className="space-y-4">
          {fees.map((fee) => {
            const balance = getFeeBalance(fee);
            const pendingAmount = getPendingSubmissionAmount(fee.submissions);
            const displayStatus = getStudentFeeDisplayStatus(fee);
            const isPaid = balance <= 0;
            const hasPending = pendingAmount > 0;
            const submissions = [...((fee.submissions ?? []) as FeePaymentSubmission[])].sort(
              (a, b) => b.created_at.localeCompare(a.created_at)
            );
            return (
              <Card key={fee.id}>
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">{fee.description ?? 'Fee invoice'}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {(fee.term as { name: string } | null)?.name ?? 'No term'} ·{' '}
                        {formatDate(fee.created_at)}
                      </p>
                      {hasPending && (
                        <p className="mt-1 text-xs text-amber-700">
                          {formatCurrency(pendingAmount)} pending admin approval
                        </p>
                      )}
                      {fee.reference_number && !hasPending && (
                        <p className="mt-1 text-xs text-slate-500">
                          Last ref: {fee.payment_method} — {fee.reference_number}
                        </p>
                      )}
                    </div>
                    <Badge status={displayStatus}>{displayStatus}</Badge>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-slate-500">Amount</p>
                      <p className="font-medium">{formatCurrency(fee.amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Paid</p>
                      <p className="font-medium text-emerald-700">{formatCurrency(fee.amount_paid)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Balance</p>
                      <p className="font-semibold text-blue-700">{formatCurrency(balance)}</p>
                      {hasPending && (
                        <p className="text-xs text-amber-600">{formatCurrency(pendingAmount)} awaiting approval</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end justify-start gap-2 sm:justify-end">
                      <Link href={`/student/fees/invoice/${fee.id}`} target="_blank">
                        <Button size="sm" variant="secondary">
                          Invoice
                        </Button>
                      </Link>
                      {!isPaid && (
                        <Button size="sm" onClick={() => setPayingFee(fee)}>
                          Pay now
                        </Button>
                      )}
                    </div>
                  </div>

                  {submissions.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Payment receipts
                      </p>
                      <div className="mt-2 space-y-2">
                        {submissions.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <div>
                              <span className="font-medium text-slate-800">
                                {formatCurrency(s.amount)}
                              </span>
                              <span className="text-slate-500">
                                {' '}
                                · {s.payment_method} · {s.reference_number}
                              </span>
                              <span className="ml-2 text-xs capitalize text-slate-400">
                                {(s.status ?? 'approved') === 'pending' ? 'pending approval' : s.status}
                              </span>
                            </div>
                            <Link href={`/student/fees/receipt/${s.id}`} target="_blank">
                              <Button size="sm" variant="secondary">
                                Receipt
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {payingFee && (
        <PayFeeModal
          fee={payingFee}
          admissionNumber={admissionNumber}
          paymentSettings={paymentSettings}
          onClose={() => setPayingFee(null)}
        />
      )}
    </div>
  );
}
