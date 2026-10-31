import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { invoiceBalance, invoiceBilled } from '@/lib/fee-money';

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

export function getFeeBalance(fee: {
  amount: number;
  amount_paid: number;
  original_amount?: number | null;
  discount_amount?: number;
  items?: { amount: number; enrollment_id?: string | null }[];
  deregisteredEnrollmentIds?: Set<string>;
}) {
  // `amount` is the billed total after discounts and after deregistered units
  // have been removed (see migration 056). Re-deriving it from line items made
  // the same invoice show different balances on different screens.
  return invoiceBalance(fee);
}

export function getOriginalFeeAmount(fee: { original_amount?: number | null; amount: number }) {
  return fee.original_amount ?? fee.amount;
}

export function getDiscountAmount(fee: { discount_amount?: number }) {
  return fee.discount_amount ?? 0;
}

export function getAdjustedFeeAmount(fee: { amount: number; original_amount?: number | null; discount_amount?: number }) {
  return fee.amount; // This is already the adjusted amount after discount
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
  if (invoiceBilled(fee) <= 0 && Number(fee.amount_paid ?? 0) <= 0) return 'waived';
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
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-600',
    'pending approval': 'bg-amber-100 text-amber-800',
    not_synced: 'bg-amber-100 text-amber-800',
    synced: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    // Audit log statuses
    success: 'bg-emerald-100 text-emerald-800',
    failure: 'bg-red-100 text-red-800',
    danger: 'bg-red-100 text-red-800',
    warning: 'bg-amber-100 text-amber-800',
  };
  return colors[status] ?? 'bg-slate-100 text-slate-600';
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';
    
    let words = '';
    
    if (n >= 100) {
      words += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      words += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    
    if (n > 0) {
      words += ones[n] + ' ';
    }
    
    return words.trim();
  }
  
  let words = '';
  let remaining = Math.round(amount);
  
  if (remaining >= 1000000) {
    words += convertLessThanThousand(Math.floor(remaining / 1000000)) + ' Million ';
    remaining %= 1000000;
  }
  
  if (remaining >= 1000) {
    words += convertLessThanThousand(Math.floor(remaining / 1000)) + ' Thousand ';
    remaining %= 1000;
  }
  
  if (remaining > 0) {
    words += convertLessThanThousand(remaining);
  }
  
  return words.trim() + ' Kenyan Shillings Only';
}
