import type { Student } from '@/lib/types';

/**
 * Single source of truth for fee money.
 *
 * `fee_payments.amount` is the billed amount after the discount has been
 * applied and after unit items have been reconciled (migration 056 triggers).
 * Reports and dashboards must never redefine it from line items or ignore the
 * discount, otherwise the same student shows one balance on the fees page and
 * another in reports.
 */

export function roundMoney(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100) / 100;
}

export interface FeeMoneyLike {
  amount: number | string | null;
  amount_paid: number | string | null;
  status?: string | null;
}

export function invoiceBilled(fee: FeeMoneyLike): number {
  return Math.max(0, roundMoney(fee.amount));
}

export function invoicePaid(fee: FeeMoneyLike): number {
  return Math.max(0, roundMoney(fee.amount_paid));
}

export function invoiceBalance(fee: FeeMoneyLike): number {
  return Math.max(0, roundMoney(invoiceBilled(fee) - invoicePaid(fee)));
}

export function invoiceCredit(fee: FeeMoneyLike): number {
  return Math.max(0, roundMoney(invoicePaid(fee) - invoiceBilled(fee)));
}

export function isInvoiceWithoutBilling(fee: FeeMoneyLike): boolean {
  return invoiceBilled(fee) === 0 && invoicePaid(fee) === 0;
}

export interface StudentFeeSummary {
  studentId: string;
  student?: Student;
  billed: number;
  paid: number;
  balance: number;
  credit: number;
  invoiceCount: number;
  lastPaymentDate: string | null;
  lastInvoiceDate: string | null;
}

type FeeRow = FeeMoneyLike & {
  student_id: string;
  student?: Student;
  paid_date?: string | null;
  created_at?: string | null;
};

export function summarizeFeesByStudent(fees: FeeRow[]): StudentFeeSummary[] {
  const byStudent = new Map<string, StudentFeeSummary>();

  for (const fee of fees) {
    const current = byStudent.get(fee.student_id) ?? {
      studentId: fee.student_id,
      student: fee.student,
      billed: 0,
      paid: 0,
      balance: 0,
      credit: 0,
      invoiceCount: 0,
      lastPaymentDate: null,
      lastInvoiceDate: null,
    };

    current.billed += invoiceBilled(fee);
    current.paid += invoicePaid(fee);
    current.invoiceCount += 1;
    current.student = current.student ?? fee.student;

    if (fee.paid_date && (!current.lastPaymentDate || fee.paid_date > current.lastPaymentDate)) {
      current.lastPaymentDate = fee.paid_date;
    }
    if (fee.created_at && (!current.lastInvoiceDate || fee.created_at > current.lastInvoiceDate)) {
      current.lastInvoiceDate = fee.created_at;
    }

    byStudent.set(fee.student_id, current);
  }

  return [...byStudent.values()].map((summary) => {
    const billed = roundMoney(summary.billed);
    const paid = roundMoney(summary.paid);
    return {
      ...summary,
      billed,
      paid,
      balance: Math.max(0, roundMoney(billed - paid)),
      credit: Math.max(0, roundMoney(paid - billed)),
    };
  });
}

export type StudentFeeClass = 'settled' | 'partial' | 'unpaid' | 'no-billing';

export function classifyStudentFees(summary: StudentFeeSummary): StudentFeeClass {
  if (summary.billed <= 0) return 'no-billing';
  if (summary.balance <= 0) return 'settled';
  if (summary.paid > 0) return 'partial';
  return 'unpaid';
}

export function studentFeeStatusLabel(summary: StudentFeeSummary): string {
  switch (classifyStudentFees(summary)) {
    case 'settled':
      return summary.credit > 0 ? 'Paid — credit' : 'Paid';
    case 'partial':
      return 'Partial';
    case 'unpaid':
      return 'Outstanding';
    default:
      return summary.credit > 0 ? 'Credit' : 'No billing';
  }
}

export interface FeeTotals {
  billed: number;
  paid: number;
  outstanding: number;
  credit: number;
  invoiceCount: number;
  studentsWithBalance: number;
  settledStudents: number;
  partialStudents: number;
  unpaidStudents: number;
  creditStudents: number;
  unbilledStudents: number;
}

export function summarizeFeeTotals(fees: FeeRow[]): FeeTotals {
  const summaries = summarizeFeesByStudent(fees);
  const totals: FeeTotals = {
    billed: 0,
    paid: 0,
    outstanding: 0,
    credit: 0,
    invoiceCount: fees.length,
    studentsWithBalance: 0,
    settledStudents: 0,
    partialStudents: 0,
    unpaidStudents: 0,
    creditStudents: 0,
    unbilledStudents: 0,
  };

  for (const summary of summaries) {
    totals.billed += summary.billed;
    totals.paid += summary.paid;
    totals.outstanding += summary.balance;
    totals.credit += summary.credit;

    const state = classifyStudentFees(summary);
    if (state === 'settled') totals.settledStudents += 1;
    if (state === 'partial') totals.partialStudents += 1;
    if (state === 'unpaid') totals.unpaidStudents += 1;
    if (state === 'no-billing') totals.unbilledStudents += 1;
    if (summary.balance > 0) totals.studentsWithBalance += 1;
    if (summary.credit > 0) totals.creditStudents += 1;
  }

  return {
    ...totals,
    billed: roundMoney(totals.billed),
    paid: roundMoney(totals.paid),
    outstanding: roundMoney(totals.outstanding),
    credit: roundMoney(totals.credit),
  };
}
