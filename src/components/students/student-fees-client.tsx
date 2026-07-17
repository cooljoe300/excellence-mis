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
import { initiateMyPesapalPayment } from '@/app/actions/pesapal';
import {
  getMpesaStkAvailability,
  getMyStkPushStatus,
  initiateMyStkPush,
} from '@/app/actions/mpesa';
import { formatCurrency, formatDate, getAdmissionNumber, getAvailableFeeBalance, getFeeBalance, getPartialPaymentPresets, getPendingSubmissionAmount, getStudentFeeDisplayStatus, cn } from '@/lib/utils';
import { isRestrictedStudentStatus } from '@/lib/student-deregistration-fees';
import { Modal } from '@/components/ui/modal';
import {
  CreditCard,
  Smartphone,
  Building2,
  CheckCircle2,
  Info,
  Wallet,
  Receipt,
  Sparkles,
  Banknote,
  FileText,
  ArrowRight,
} from 'lucide-react';

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'slate' | 'emerald' | 'blue';
}) {
  const tones = {
    slate: {
      card: 'border-slate-200 bg-white',
      icon: 'bg-slate-100 text-slate-600',
      label: 'text-slate-500',
      value: 'text-slate-900',
    },
    emerald: {
      card: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white',
      icon: 'bg-emerald-100 text-emerald-700',
      label: 'text-emerald-800',
      value: 'text-emerald-700',
    },
    blue: {
      card: 'border-blue-200/80 bg-gradient-to-br from-blue-50 to-white',
      icon: 'bg-blue-100 text-blue-700',
      label: 'text-blue-800',
      value: 'text-blue-700',
    },
  }[tone];

  return (
    <Card className={cn('shadow-sm', tones.card)}>
      <CardContent className="flex items-center gap-3 py-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tones.icon)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className={cn('text-xs font-medium', tones.label)}>{label}</p>
          <p className={cn('mt-0.5 text-lg font-bold tracking-tight', tones.value)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentMethodCard({
  title,
  description,
  icon: Icon,
  children,
  accent,
}: {
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  accent: 'emerald' | 'blue' | 'slate' | 'indigo';
}) {
  const accents = {
    emerald: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white',
    blue: 'border-blue-200/80 bg-gradient-to-br from-blue-50/80 to-white',
    slate: 'border-slate-200 bg-white',
    indigo: 'border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 to-white',
  }[accent];
  const iconBg = {
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
  }[accent];

  return (
    <div className={cn('rounded-xl border p-3 shadow-sm', accents)}>
      <div className="flex items-start gap-2">
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {description && <p className="mt-0.5 text-xs text-slate-600">{description}</p>}
          <div className="mt-2 space-y-1 text-xs text-slate-700">{children}</div>
        </div>
      </div>
    </div>
  );
}

function FeeProgressBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[11px] font-medium text-slate-500">
        <span>Payment progress</span>
        <span>{pct}% paid</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

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
    <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
      <div className="flex justify-between">
        <span className="text-slate-600">Amount due</span>
        <span className="font-medium">{formatCurrency(fee.amount)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-slate-600">Already paid</span>
        <span className="font-medium">{formatCurrency(fee.amount_paid)}</span>
      </div>
      <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-semibold">
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
  pesapalConfigured,
  pesapalMaxAmount = null,
  initialMode = 'online',
  onClose,
  fromRegistration = false,
}: {
  fee: FeePayment;
  admissionNumber: string;
  paymentSettings: PaymentSettings;
  pesapalConfigured: boolean;
  pesapalMaxAmount?: number | null;
  initialMode?: 'online' | 'manual' | 'stk';
  onClose: () => void;
  fromRegistration?: boolean;
}) {
  const router = useRouter();
  const balance = getFeeBalance(fee);
  const pendingAmount = getPendingSubmissionAmount(fee.submissions);
  const availableBalance = getAvailableFeeBalance(fee, fee.submissions);
  const onlineMaxAmount =
    pesapalMaxAmount !== null && pesapalMaxAmount > 0
      ? Math.min(availableBalance, pesapalMaxAmount)
      : availableBalance;
  const presets = getPartialPaymentPresets(onlineMaxAmount).filter(
    (preset) => pesapalMaxAmount === null || preset.amount <= pesapalMaxAmount
  );
  const onlineVisible = paymentSettings.pesapalEnabled || pesapalConfigured;
  const onlineReady = onlineVisible && pesapalConfigured;
  const stkVisible = paymentSettings.mpesaStkEnabled;

  const [mode, setMode] = useState<'online' | 'manual' | 'stk'>(() => {
    if (initialMode === 'stk' && stkVisible) return 'stk';
    if (initialMode === 'manual') return 'manual';
    if (onlineVisible) return 'online';
    if (stkVisible) return 'stk';
    return 'manual';
  });
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [stkRequestId, setStkRequestId] = useState<string | null>(null);
  const [stkStatus, setStkStatus] = useState<string | null>(null);
  const [stkConfigured, setStkConfigured] = useState<boolean>(false);
  const [stkMissingConfig, setStkMissingConfig] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  useEffect(() => {
    if (!stkVisible) return;
    void (async () => {
      const availability = await getMpesaStkAvailability();
      setStkConfigured(availability.configured);
      setStkMissingConfig(availability.missingConfig);
    })();
  }, [stkVisible]);

  const parsedAmount = parseFloat(amount);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isPartialPayment = isValidAmount && parsedAmount < availableBalance;
  const remainingAfterPayment = isValidAmount
    ? Math.max(0, availableBalance - parsedAmount)
    : availableBalance;

  async function handlePesapalSubmit(e: React.FormEvent) {
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

    if (pesapalMaxAmount !== null && paidAmount > pesapalMaxAmount) {
      setError(
        `Online payments are limited to ${formatCurrency(pesapalMaxAmount)} per transaction. Pay a smaller amount or use manual payment for the rest.`
      );
      setLoading(false);
      return;
    }

    const result = await initiateMyPesapalPayment(fee.id, paidAmount);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
      return;
    }

    setError('PesaPal did not return a payment page.');
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
    
    // Redirect to admission completion page if coming from registration
    if (fromRegistration && !partial) {
      setTimeout(() => {
        router.replace('/student/admission-complete');
      }, 1500);
    }
  }

  async function handleStkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setStkStatus(null);

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

    const result = await initiateMyStkPush(fee.id, paidAmount, phoneNumber);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStkRequestId(result.requestId ?? null);
    setStkStatus('pending');
    setSuccess(result.message ?? 'STK prompt sent. Check your phone and enter your M-Pesa PIN.');
    setLoading(false);
  }

  async function checkStkStatus() {
    if (!stkRequestId) return;
    setLoading(true);
    setError(null);
    const status = await getMyStkPushStatus(stkRequestId);
    if (status.error) {
      setError(status.error);
      setLoading(false);
      return;
    }

    const currentStatus = status.status ?? 'pending';
    setStkStatus(currentStatus);
    if (currentStatus === 'completed') {
      setSuccess(
        `STK payment received: ${formatCurrency(status.amount ?? 0)}${
          status.receiptNumber ? ` (Receipt ${status.receiptNumber})` : ''
        }.`
      );
      setReceiptId(status.submissionId ?? null);
      router.refresh();
    } else if (currentStatus === 'failed' || currentStatus === 'cancelled') {
      setError(status.resultDesc ?? 'STK payment did not complete.');
    } else {
      setSuccess('STK request is still pending. Complete the prompt on your phone, then check again.');
    }
    setLoading(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Pay fees"
      description={
        onlineVisible || stkVisible
          ? 'Pay online with PesaPal or M-Pesa STK Push, or submit a manual payment'
          : 'Pay what you have — partial payments are welcome'
      }
      size="md"
    >
        {(onlineVisible || stkVisible) && !success && (
          <div className="mt-3 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(
              [
                ...(onlineVisible ? (['online'] as const) : []),
                ...(stkVisible ? (['stk'] as const) : []),
                'manual',
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setMode(tab);
                  setError(null);
                }}
                className={cn(
                  'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  mode === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
                )}
              >
                {tab === 'online'
                  ? 'Pay online (PesaPal)'
                  : tab === 'stk'
                    ? 'M-Pesa STK Push'
                    : 'Manual payment'}
              </button>
            ))}
          </div>
        )}

        {mode === 'manual' && (
        <div className="mt-3 space-y-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs">
          <div className="flex items-center gap-2 font-medium text-blue-900">
            <Building2 className="h-3.5 w-3.5" />
            Bank payment
          </div>
          <p className="mt-1 font-semibold text-blue-900">{paymentSettings.bankName}</p>
          <p className="text-blue-800">
            Paybill: <span className="font-mono font-bold text-blue-900">{paymentSettings.mpesaPaybill}</span>
          </p>
          <p className="text-blue-800">
            Account No:{' '}
            <span className="font-mono font-bold text-blue-900">{paymentSettings.bankAccount}</span>
          </p>
          <p className="text-blue-800">Name: {paymentSettings.bankBranch}</p>
        </div>
        )}

        {success ? (
          <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{success}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {receiptId && (
                <Link href={`/student/fees/receipt/${receiptId}`} target="_blank">
                  <Button size="sm">Download receipt</Button>
                </Link>
              )}
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : mode === 'online' ? (
          <form onSubmit={handlePesapalSubmit} className="mt-3 space-y-3">
            <div className="flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <CreditCard className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Enter amount and continue to PesaPal to pay with M-Pesa, card, or other methods.
                You will be returned here after payment.
              </p>
            </div>

            {!onlineReady && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                PesaPal is enabled but not fully set up yet. Ask admin to add PESAPAL_CONSUMER_KEY and
                PESAPAL_CONSUMER_SECRET on the server, then redeploy.
              </div>
            )}

            {pesapalMaxAmount !== null && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Online payments are limited to {formatCurrency(pesapalMaxAmount)} per transaction
                {availableBalance > pesapalMaxAmount
                  ? ` (${formatCurrency(availableBalance - pesapalMaxAmount)} will remain — pay again or use manual payment).`
                  : '.'}
              </div>
            )}

            <BalanceSummary
              fee={fee}
              balance={balance}
              pendingAmount={pendingAmount}
              availableBalance={availableBalance}
            />

            <div className="space-y-2">
              <Input
                label="Amount to pay (KES)"
                type="number"
                min="1"
                max={pesapalMaxAmount ?? undefined}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`e.g. ${Math.min(pesapalMaxAmount ?? 1000, Math.floor(onlineMaxAmount)) || 500}`}
                required
              />
              {presets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={`${preset.label}-${preset.amount}`}
                      type="button"
                      onClick={() => setAmount(preset.amount.toString())}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
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
                <p className="text-[11px] text-amber-700">
                  Partial payment — {formatCurrency(remainingAfterPayment)} will remain on this invoice.
                </p>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || !isValidAmount || !onlineReady}>
                {loading ? 'Redirecting...' : 'Continue to PesaPal'}
              </Button>
            </div>
          </form>
        ) : mode === 'stk' ? (
          <form onSubmit={handleStkSubmit} className="mt-3 space-y-3">
            <div className="flex gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
              <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Enter amount and phone number, then we will send an M-Pesa STK prompt to your phone.
              </p>
            </div>

            {!stkConfigured && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                STK is enabled but not fully configured yet ({stkMissingConfig.join(', ') || 'missing env vars'}).
              </div>
            )}

            <BalanceSummary
              fee={fee}
              balance={balance}
              pendingAmount={pendingAmount}
              availableBalance={availableBalance}
            />

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

            <Input
              label="M-Pesa phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0712345678"
              required
            />

            {stkStatus && <p className="text-[11px] text-slate-600">Current STK status: {stkStatus}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              {stkRequestId && (
                <Button type="button" variant="secondary" size="sm" onClick={checkStkStatus} disabled={loading}>
                  Check status
                </Button>
              )}
              <Button type="submit" size="sm" disabled={loading || !isValidAmount || !stkConfigured}>
                {loading ? 'Sending prompt...' : 'Send STK prompt'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} className="mt-3 space-y-3">
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((preset) => (
                    <button
                      key={`${preset.label}-${preset.amount}`}
                      type="button"
                      onClick={() => setAmount(preset.amount.toString())}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
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
                <p className={`text-[11px] ${isPartialPayment ? 'text-amber-700' : 'text-emerald-700'}`}>
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

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading || !isValidAmount}>
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
  pesapalConfigured,
  pesapalMaxAmount = null,
  totalDue,
  totalPaid,
  totalBilled,
  fromEnrollment = false,
  fromRegistration = false,
}: {
  student: Student;
  fees: FeePayment[];
  paymentSettings: PaymentSettings;
  pesapalConfigured: boolean;
  pesapalMaxAmount?: number | null;
  totalDue: number;
  totalPaid: number;
  totalBilled: number;
  fromEnrollment?: boolean;
  fromRegistration?: boolean;
}) {
  const [payingFee, setPayingFee] = useState<FeePayment | null>(null);
  const [payMode, setPayMode] = useState<'online' | 'manual' | 'stk'>('online');
  const admissionNumber = getAdmissionNumber(student);
  const onlineVisible = paymentSettings.pesapalEnabled || pesapalConfigured;
  const paymentsBlocked = isRestrictedStudentStatus(student.status);

  function openPayModal(fee: FeePayment, mode: 'online' | 'manual' | 'stk' = 'online') {
    if (paymentsBlocked) return;
    setPayMode(mode);
    setPayingFee(fee);
  }

  const paidPercent =
    totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#003380] via-blue-800 to-indigo-900 p-4 text-white shadow-lg sm:p-5">
        <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-6 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-blue-100">
              <Sparkles className="h-3 w-3" />
              Fees & Payments
            </div>
            <h1 className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
              {student.first_name}&apos;s fee account
            </h1>
            <p className="mt-1.5 max-w-xl text-xs text-blue-100/90">
              Pay any amount — PesaPal, M-Pesa STK, paybill, or bank. Partial payments welcome.
            </p>
            <p className="mt-2 inline-block rounded-lg bg-white/10 px-2 py-1 font-mono text-xs text-white">
              {admissionNumber}
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">
              Outstanding balance
            </p>
            <p className="mt-1 text-2xl font-bold sm:text-3xl">{formatCurrency(totalDue)}</p>
            {totalBilled > 0 && (
              <p className="mt-1 text-xs text-blue-100">
                {paidPercent}% of {formatCurrency(totalBilled)} cleared
              </p>
            )}
          </div>
        </div>
        {totalBilled > 0 && (
          <div className="relative mt-4">
            <div className="mb-1 flex justify-between text-[11px] text-blue-200">
              <span>Overall payment progress</span>
              <span>{paidPercent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {paymentsBlocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p className="font-semibold">Account not active</p>
          <p className="mt-1">
            Your student account is {student.status}. You cannot make new fee payments here.
            Contact the college administration if you have questions about your fee balance.
          </p>
        </div>
      )}

      {fromEnrollment && !paymentsBlocked && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-3 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-900">Invoice ready</p>
            <p className="mt-1 text-xs text-emerald-800">
              Units registered successfully. Pay any amount now via M-Pesa or bank — clear the rest later.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total billed" value={formatCurrency(totalBilled)} icon={Receipt} tone="slate" />
        <StatTile label="Total paid" value={formatCurrency(totalPaid)} icon={Banknote} tone="emerald" />
        <StatTile label="Outstanding" value={formatCurrency(totalDue)} icon={Wallet} tone="blue" />
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-700" />
          <h2 className="text-base font-bold text-slate-900">Payment methods</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {onlineVisible && (
            <PaymentMethodCard
              title="PesaPal online"
              description="Instant payment with M-Pesa or card on a secure page."
              icon={CreditCard}
              accent="emerald"
            >
              <p>
                Tap <strong>Pay fees</strong> on any invoice, then choose Pay online.
              </p>
              {!pesapalConfigured && (
                <p className="text-xs text-amber-700">PesaPal credentials not configured yet.</p>
              )}
              {pesapalMaxAmount !== null && (
                <p className="text-xs text-amber-700">
                  Max {formatCurrency(pesapalMaxAmount)} per online transaction.
                </p>
              )}
            </PaymentMethodCard>
          )}
          {paymentSettings.mpesaStkEnabled && (
            <PaymentMethodCard
              title="M-Pesa STK Push"
              description="Receive a payment prompt on your phone."
              icon={Smartphone}
              accent="blue"
            >
              <p>
                Choose <strong>M-Pesa STK Push</strong> and enter your handset number.
              </p>
            </PaymentMethodCard>
          )}
          <PaymentMethodCard title="Bank payment" icon={Building2} accent="slate">
            <p className="font-semibold">{paymentSettings.bankName}</p>
            <p>
              Paybill: <span className="font-mono font-bold">{paymentSettings.mpesaPaybill}</span>
            </p>
            <p>
              Account No: <span className="font-mono font-bold">{paymentSettings.bankAccount}</span>
            </p>
            <p>Name: {paymentSettings.bankBranch}</p>
          </PaymentMethodCard>
        </div>
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-center text-xs text-slate-600">
          <Info className="mr-1 inline h-3.5 w-3.5 align-text-bottom text-slate-400" />
          Partial payments are OK — your invoice stays open until the balance is cleared.
        </p>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-700" />
            <h2 className="text-base font-bold text-slate-900">Your invoices</h2>
          </div>
          {fees.length > 0 && (
            <span className="text-xs text-slate-500">
              {fees.length} invoice{fees.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        {fees.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-base font-semibold text-slate-900">No invoices yet</p>
            <p className="mt-2 max-w-sm text-xs text-slate-500">
              Register your units first — a fee invoice will appear here automatically.
            </p>
            <Link href="/student/enroll" className="mt-4">
              <Button size="sm">
                Register units
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
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
              <Card
                key={fee.id}
                className="overflow-hidden border-slate-200 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />
                <CardContent className="p-4 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{fee.description ?? 'Fee invoice'}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {(fee.term as { name: string } | null)?.name ?? 'No term'} ·{' '}
                        {formatDate(fee.created_at)}
                      </p>
                      {hasPending && (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          {formatCurrency(pendingAmount)} pending approval
                        </p>
                      )}
                    </div>
                    <Badge status={displayStatus}>{displayStatus}</Badge>
                  </div>

                  <FeeProgressBar paid={Number(fee.amount_paid)} total={Number(fee.amount)} />

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Billed</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{formatCurrency(fee.amount)}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700">Paid</p>
                      <p className="mt-1 text-base font-bold text-emerald-700">{formatCurrency(fee.amount_paid)}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-blue-700">Balance</p>
                      <p className="mt-1 text-base font-bold text-blue-700">{formatCurrency(balance)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/student/fees/invoice/${fee.id}`} target="_blank">
                      <Button size="sm" variant="secondary">
                        <FileText className="mr-1.5 h-4 w-4" />
                        View invoice
                      </Button>
                    </Link>
                    {!isPaid && !paymentsBlocked && (
                      <>
                        <Button size="sm" onClick={() => openPayModal(fee, 'online')}>
                          {balance < fee.amount ? 'Pay remainder' : 'Pay fees'}
                        </Button>
                        {paymentSettings.mpesaStkEnabled && (
                          <Button size="sm" variant="secondary" onClick={() => openPayModal(fee, 'stk')}>
                            <Smartphone className="mr-1.5 h-4 w-4" />
                            STK Push
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  {submissions.length > 0 && (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Payment history
                      </p>
                      <div className="mt-2 space-y-1">
                        {submissions.map((s) => (
                          <div
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(s.amount)}
                              </span>
                              <span className="text-slate-500">
                                {' '}
                                · {s.payment_method} · {s.reference_number}
                              </span>
                              <span
                                className={cn(
                                  'ml-2 text-[11px] font-medium capitalize',
                                  (s.status ?? 'approved') === 'pending'
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                )}
                              >
                                {(s.status ?? 'approved') === 'pending' ? 'pending' : s.status}
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
      </section>

      {payingFee && (
        <PayFeeModal
          fee={payingFee}
          admissionNumber={admissionNumber}
          paymentSettings={paymentSettings}
          pesapalConfigured={pesapalConfigured}
          pesapalMaxAmount={pesapalMaxAmount}
          initialMode={payMode}
          onClose={() => setPayingFee(null)}
          fromRegistration={fromRegistration}
        />
      )}
    </div>
  );
}
