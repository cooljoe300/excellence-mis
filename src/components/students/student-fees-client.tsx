'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { FeePayment, FeePaymentSubmission, Student } from '@/lib/types';
import type { PaymentSettings } from '@/lib/system-settings';
import { submitMyFeePayment } from '@/app/actions/student-fees';
import { getMyStkPushStatus, initiateMyStkPush } from '@/app/actions/mpesa';
import { formatCurrency, formatDate, getAdmissionNumber, getAvailableFeeBalance, getFeeBalance, getPartialPaymentPresets, getPendingSubmissionAmount, getStudentFeeDisplayStatus, cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { CreditCard, Smartphone, Building2, CheckCircle2, Info, Loader2 } from 'lucide-react';

function BalanceSummary({
  fee,
  balance,
  pendingAmount,
  availableBalance,
}: {
  fee: FeePayment;
  balance: number;
  pendingAmount: number;
  availableBalance: number;
}) {
  return (
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
        <>
          <div className="mt-1 flex justify-between text-amber-700">
            <span>Pending approval</span>
            <span>{formatCurrency(pendingAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between font-semibold text-blue-700">
            <span>Available to pay</span>
            <span>{formatCurrency(availableBalance)}</span>
          </div>
        </>
      )}
    </div>
  );
}

function PayFeeModal({
  fee,
  admissionNumber,
  paymentSettings,
  studentPhone,
  stkConfigured,
  initialMode = 'stk',
  onClose,
}: {
  fee: FeePayment;
  admissionNumber: string;
  paymentSettings: PaymentSettings;
  studentPhone: string;
  stkConfigured: boolean;
  initialMode?: 'stk' | 'manual';
  onClose: () => void;
}) {
  const router = useRouter();
  const balance = getFeeBalance(fee);
  const pendingAmount = getPendingSubmissionAmount(fee.submissions);
  const availableBalance = getAvailableFeeBalance(fee, fee.submissions);
  const presets = getPartialPaymentPresets(availableBalance);
  const stkVisible = paymentSettings.mpesaStkEnabled || stkConfigured;
  const stkReady = stkVisible && stkConfigured;

  const [mode, setMode] = useState<'stk' | 'manual'>(() => {
    if (!stkVisible) return 'manual';
    return initialMode === 'manual' ? 'manual' : 'stk';
  });
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(studentPhone);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [stkRequestId, setStkRequestId] = useState<string | null>(null);
  const [stkWaiting, setStkWaiting] = useState(false);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isPartialPayment = isValidAmount && parsedAmount < availableBalance;
  const remainingAfterPayment = isValidAmount
    ? Math.max(0, availableBalance - parsedAmount)
    : availableBalance;

  useEffect(() => {
    if (!stkRequestId || !stkWaiting) return;

    let cancelled = false;
    const poll = async () => {
      const result = await getMyStkPushStatus(stkRequestId);
      if (cancelled || 'error' in result) return;

      if (result.status === 'completed') {
        setStkWaiting(false);
        setSuccess(
          result.amount < availableBalance
            ? `M-Pesa payment of ${formatCurrency(result.amount)} received. Remaining balance will update shortly — you can pay the rest anytime.`
            : `M-Pesa payment of ${formatCurrency(result.amount)} received and applied to your invoice.`
        );
        setReceiptId(result.submissionId ?? null);
        router.refresh();
        return;
      }

      if (result.status === 'failed' || result.status === 'cancelled') {
        setStkWaiting(false);
        setError(result.resultDesc || 'M-Pesa payment was not completed.');
        setStkRequestId(null);
      }
    };

    const interval = window.setInterval(poll, 3000);
    poll();

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setStkWaiting(false);
        setError('Payment timed out. If you completed M-Pesa on your phone, refresh this page in a moment.');
      }
    }, 120000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [stkRequestId, stkWaiting, availableBalance, router]);

  async function handleStkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const paidAmount = parseFloat(amount);
    if (!paidAmount || paidAmount <= 0) {
      setError('Enter a valid amount.');
      setLoading(false);
      return;
    }

    if (paidAmount > availableBalance) {
      setError(`Amount cannot exceed the available balance of ${formatCurrency(availableBalance)}.`);
      setLoading(false);
      return;
    }

    const result = await initiateMyStkPush(fee.id, paidAmount, phone.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStkRequestId(result.requestId ?? null);
    setStkWaiting(true);
    setSuccess('Check your phone — enter your M-Pesa PIN when Safaricom prompts you.');
    setLoading(false);
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const paidAmount = parseFloat(amount);
    if (!paidAmount || paidAmount <= 0) {
      setError('Enter a valid amount.');
      setLoading(false);
      return;
    }

    if (paidAmount > availableBalance) {
      setError(`Amount cannot exceed the available balance of ${formatCurrency(availableBalance)}.`);
      setLoading(false);
      return;
    }

    const result = await submitMyFeePayment(
      fee.id,
      paidAmount,
      paymentMethod === 'mpesa' ? 'M-Pesa' : 'Bank',
      referenceNumber.trim()
    );

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const partial = paidAmount < availableBalance;
    const remaining = Math.max(0, availableBalance - paidAmount);

    setSuccess(
      partial
        ? `Partial payment of ${formatCurrency(paidAmount)} submitted for approval. Remaining balance: ${formatCurrency(remaining)} — you can pay the rest anytime.`
        : `Payment of ${formatCurrency(paidAmount)} submitted for approval. An admin will verify your ${paymentMethod === 'mpesa' ? 'M-Pesa' : 'bank'} code.`
    );
    setReceiptId(result.submissionId ?? null);
    setLoading(false);
    router.refresh();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Pay fees"
      description={
        stkVisible
          ? 'Pay instantly with M-Pesa STK push or submit a manual payment'
          : 'Pay what you have — partial payments are welcome'
      }
      size="md"
    >
        {stkVisible && !success && (
          <div className="mt-4 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(['stk', 'manual'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setError(null);
                }}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  mode === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                )}
              >
                {tab === 'stk' ? 'M-Pesa STK push' : 'Manual payment'}
              </button>
            ))}
          </div>
        )}

        {mode === 'manual' && (
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
        )}

        {success ? (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="flex items-start gap-2">
              {stkWaiting ? (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{success}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {receiptId && !stkWaiting && (
                <Link href={`/student/fees/receipt/${receiptId}`} target="_blank">
                  <Button>Download receipt</Button>
                </Link>
              )}
              {!stkWaiting && (
                <Button variant="secondary" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        ) : mode === 'stk' ? (
          <form onSubmit={handleStkSubmit} className="mt-4 space-y-4">
            <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900">
              <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Enter your M-Pesa number and amount. You will get a prompt on your phone to enter your
                PIN — no paybill steps or confirmation code needed.
              </p>
            </div>

            {!stkReady && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                M-Pesa STK push is enabled but not fully set up yet. Ask admin to add the M-Pesa
                passkey and other Daraja credentials, then redeploy the app.
              </div>
            )}

            <BalanceSummary
              fee={fee}
              balance={balance}
              pendingAmount={pendingAmount}
              availableBalance={availableBalance}
            />

            <Input
              label="M-Pesa phone number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712 345 678"
              required
            />

            <div className="space-y-2">
              <Input
                label="Amount to pay (KES)"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`e.g. ${Math.min(1000, Math.floor(availableBalance)) || 500}`}
                required
              />
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={`${preset.label}-${preset.amount}`}
                      type="button"
                      onClick={() => setAmount(preset.amount.toString())}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        amount === preset.amount.toString()
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {preset.label}
                      {preset.label !== 'Full balance' && preset.label !== 'Half'
                        ? ''
                        : ` (${formatCurrency(preset.amount)})`}
                    </button>
                  ))}
                </div>
              )}
              {isValidAmount && isPartialPayment && (
                <p className="text-xs text-amber-700">
                  Partial payment — {formatCurrency(remainingAfterPayment)} will remain on this
                  invoice.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !isValidAmount || !phone.trim() || !stkReady}>
                {loading ? 'Sending prompt...' : 'Send M-Pesa prompt'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                You do not need the full balance today. Send whatever you can via M-Pesa or bank,
                then enter the <strong>exact amount you paid</strong> below.
              </p>
            </div>

            <BalanceSummary
              fee={fee}
              balance={balance}
              pendingAmount={pendingAmount}
              availableBalance={availableBalance}
            />

            <Select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              options={[
                { value: 'mpesa', label: 'M-Pesa' },
                { value: 'bank', label: 'Bank transfer' },
              ]}
            />

            <div className="space-y-2">
              <Input
                label="Amount you paid (KES)"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`e.g. ${Math.min(1000, Math.floor(availableBalance)) || 500}`}
                required
              />
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <button
                      key={`${preset.label}-${preset.amount}`}
                      type="button"
                      onClick={() => setAmount(preset.amount.toString())}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        amount === preset.amount.toString()
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {preset.label}
                      {preset.label !== 'Full balance' && preset.label !== 'Half'
                        ? ''
                        : ` (${formatCurrency(preset.amount)})`}
                    </button>
                  ))}
                </div>
              )}
              {isValidAmount && (
                <p className={`text-xs ${isPartialPayment ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {isPartialPayment
                    ? `Partial payment — ${formatCurrency(remainingAfterPayment)} will remain after approval.`
                    : 'This will clear the available balance on this invoice.'}
                </p>
              )}
            </div>

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
              <Button type="submit" disabled={loading || !isValidAmount}>
                {loading ? 'Submitting...' : isPartialPayment ? 'Submit partial payment' : 'Submit payment'}
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
  stkConfigured,
  totalDue,
  totalPaid,
  totalBilled,
  fromEnrollment = false,
}: {
  student: Student;
  fees: FeePayment[];
  paymentSettings: PaymentSettings;
  stkConfigured: boolean;
  totalDue: number;
  totalPaid: number;
  totalBilled: number;
  fromEnrollment?: boolean;
}) {
  const [payingFee, setPayingFee] = useState<FeePayment | null>(null);
  const [payMode, setPayMode] = useState<'stk' | 'manual'>('stk');
  const admissionNumber = getAdmissionNumber(student);
  const stkVisible = paymentSettings.mpesaStkEnabled || stkConfigured;

  function openPayModal(fee: FeePayment, mode: 'stk' | 'manual' = 'stk') {
    setPayMode(mode);
    setPayingFee(fee);
  }

  return (
    <div className="space-y-6">
      {fromEnrollment && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Units registered successfully. Your fee invoice is ready — pay any amount you can now
              via M-Pesa or bank, and clear the rest later.
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
          {stkVisible && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2">
              <p className="font-semibold text-emerald-900">M-Pesa STK push</p>
              <p className="mt-1 text-emerald-800">
                Pay directly from your phone. Click <strong>Pay fees</strong>, enter your M-Pesa number
                and amount, then approve the prompt on your phone.
              </p>
              {!stkConfigured && (
                <p className="mt-2 text-xs text-amber-800">
                  STK is visible but not active yet — admin must complete M-Pesa Daraja setup
                  (especially MPESA_PASSKEY).
                </p>
              )}
            </div>
          )}
          <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
            <p className="font-semibold text-slate-900">Partial payments are OK</p>
            <p className="mt-1 text-slate-600">
              If you do not have the full balance, pay what you can today. Your invoice stays open
              until the remainder is cleared.
              {stkVisible
                ? ' Use M-Pesa STK push for an instant payment prompt on your phone.'
                : ' Submit each M-Pesa or bank payment separately with its confirmation code.'}
            </p>
          </div>
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
                        <Button size="sm" onClick={() => openPayModal(fee, 'stk')}>
                          {balance < fee.amount ? 'Pay remainder' : 'Pay fees'}
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
          studentPhone={student.phone ?? ''}
          stkConfigured={stkConfigured}
          initialMode={payMode}
          onClose={() => setPayingFee(null)}
        />
      )}
    </div>
  );
}
