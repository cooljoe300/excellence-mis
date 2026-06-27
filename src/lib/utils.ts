import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const maybeMessage = (err as { message?: unknown }).message;
    if (typeof maybeMessage === 'string' && maybeMessage.trim()) return maybeMessage;
  }
  return 'Something went wrong. Please try again.';
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return format(parseISO(date), 'dd MMM yyyy');
  } catch {
    return date;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getAdmissionNumber(student: {
  admission_number?: string | null;
  student_number: string;
}) {
  return student.admission_number ?? student.student_number;
}

export function getFeeBalance(fee: { amount: number; amount_paid: number }) {
  return Math.max(0, Number(fee.amount) - Number(fee.amount_paid));
}

export function getAvailableFeeBalance(
  fee: { amount: number; amount_paid: number },
  submissions?: { status?: string; amount: number }[]
) {
  const balance = getFeeBalance(fee);
  const pending = getPendingSubmissionAmount(submissions);
  return Math.max(0, balance - pending);
}

export function getPartialPaymentPresets(availableBalance: number) {
  if (availableBalance <= 0) return [];

  const full = Math.round(availableBalance * 100) / 100;
  const half = Math.round((availableBalance / 2) * 100) / 100;
  const presets = [
    { label: 'Full balance', amount: full },
    { label: 'Half', amount: half },
  ];

  for (const step of [1000, 500, 100]) {
    if (step < full && !presets.some((p) => p.amount === step)) {
      presets.push({ label: formatCurrency(step), amount: step });
    }
  }

  return presets
    .filter((preset, index, list) => list.findIndex((p) => p.amount === preset.amount) === index)
    .filter((preset) => preset.amount > 0 && preset.amount <= full)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
}

export function getPendingSubmissionAmount(
  submissions: { status?: string; amount: number }[] | undefined
) {
  return (submissions ?? [])
    .filter((s) => (s.status ?? 'approved') === 'pending')
    .reduce((sum, s) => sum + Number(s.amount), 0);
}

export function getStudentFeeDisplayStatus(fee: {
  amount: number;
  amount_paid: number;
  status: string;
  submissions?: { status?: string; amount: number }[];
}) {
  const balance = getFeeBalance(fee);
  if (balance <= 0) return 'paid';
  if (getPendingSubmissionAmount(fee.submissions) > 0) return 'pending approval';
  return fee.status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    inactive: 'bg-slate-100 text-slate-600',
    graduated: 'bg-blue-100 text-blue-800',
    suspended: 'bg-amber-100 text-amber-800',
    withdrawn: 'bg-red-100 text-red-800',
    pending: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    dropped: 'bg-red-100 text-red-800',
    present: 'bg-emerald-100 text-emerald-800',
    absent: 'bg-red-100 text-red-800',
    late: 'bg-amber-100 text-amber-800',
    excused: 'bg-blue-100 text-blue-800',
    paid: 'bg-emerald-100 text-emerald-800',
    partial: 'bg-amber-100 text-amber-800',
    overdue: 'bg-red-100 text-red-800',
    waived: 'bg-slate-100 text-slate-600',
    'pending approval': 'bg-amber-100 text-amber-800',
    not_synced: 'bg-amber-100 text-amber-800',
    synced: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status] ?? 'bg-slate-100 text-slate-600';
}
