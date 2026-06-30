import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaymentStatus } from '@/lib/types';

const DEREGISTERED_NOTE = '[Units deregistered — balance adjusted]';

function derivePaymentStatus(amount: number, amountPaid: number): PaymentStatus {
  if (amount === 0 && amountPaid === 0) return 'waived';
  if (amountPaid >= amount) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'pending';
}

function appendDeregistrationNote(description: string | null): string {
  const base = description?.trim() || 'Unit registration fees';
  if (base.includes('Units deregistered')) return base;
  return `${base} ${DEREGISTERED_NOTE}`;
}

export async function rejectPendingSubmissionsForFeePayment(
  supabase: SupabaseClient,
  feePaymentId: string
) {
  await supabase
    .from('fee_payment_submissions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('fee_payment_id', feePaymentId)
    .eq('status', 'pending');
}

export async function recalculateFeePaymentAfterDeregistration(
  supabase: SupabaseClient,
  feePaymentId: string
): Promise<{ success: true } | { error: string }> {
  const { data: fee, error: feeError } = await supabase
    .from('fee_payments')
    .select('id, amount, amount_paid, status, description')
    .eq('id', feePaymentId)
    .single();

  if (feeError || !fee) {
    return { error: feeError?.message ?? 'Fee invoice not found.' };
  }

  const { data: items, error: itemsError } = await supabase
    .from('fee_payment_items')
    .select('amount')
    .eq('fee_payment_id', feePaymentId);

  if (itemsError) return { error: itemsError.message };

  const itemsTotal = (items ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const amountPaid = Number(fee.amount_paid ?? 0);
  let newAmount = itemsTotal;

  if (amountPaid > newAmount) {
    newAmount = amountPaid;
  }

  const status = derivePaymentStatus(newAmount, amountPaid);

  await rejectPendingSubmissionsForFeePayment(supabase, feePaymentId);

  const { error: updateError } = await supabase
    .from('fee_payments')
    .update({
      amount: newAmount,
      status,
      description: appendDeregistrationNote(fee.description as string | null),
      paid_date:
        status === 'paid'
          ? fee.paid_date ?? new Date().toISOString().split('T')[0]
          : amountPaid > 0
            ? fee.paid_date
            : null,
    })
    .eq('id', feePaymentId);

  if (updateError) return { error: updateError.message };

  return { success: true };
}

export async function adjustFeesForDroppedEnrollments(
  supabase: SupabaseClient,
  enrollmentIds: string[]
): Promise<{ adjustedInvoiceIds: string[] } | { error: string }> {
  if (enrollmentIds.length === 0) return { adjustedInvoiceIds: [] };

  const { data: items, error } = await supabase
    .from('fee_payment_items')
    .select('id, fee_payment_id')
    .in('enrollment_id', enrollmentIds);

  if (error) return { error: error.message };
  if (!items?.length) return { adjustedInvoiceIds: [] };

  const feePaymentIds = Array.from(new Set(items.map((item) => item.fee_payment_id as string)));

  const { error: deleteError } = await supabase
    .from('fee_payment_items')
    .delete()
    .in('enrollment_id', enrollmentIds);

  if (deleteError) return { error: deleteError.message };

  for (const feePaymentId of feePaymentIds) {
    const result = await recalculateFeePaymentAfterDeregistration(supabase, feePaymentId);
    if ('error' in result) return result;
  }

  return { adjustedInvoiceIds: feePaymentIds };
}

export async function rejectAllPendingSubmissionsForStudent(
  supabase: SupabaseClient,
  studentId: string
) {
  await supabase
    .from('fee_payment_submissions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('status', 'pending');
}

export async function deregisterStudentEnrollmentsAndFees(
  supabase: SupabaseClient,
  studentId: string
): Promise<
  | { success: true; droppedEnrollments: number; adjustedInvoiceIds: string[] }
  | { error: string }
> {
  const { data: enrollments, error: enrollmentsError } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .in('status', ['active', 'pending'])
    .is('grade', null)
    .is('score', null);

  if (enrollmentsError) return { error: enrollmentsError.message };

  const enrollmentIds = (enrollments ?? []).map((row) => row.id as string);
  let adjustedInvoiceIds: string[] = [];

  if (enrollmentIds.length > 0) {
    const feeResult = await adjustFeesForDroppedEnrollments(supabase, enrollmentIds);
    if ('error' in feeResult) return feeResult;
    adjustedInvoiceIds = feeResult.adjustedInvoiceIds;

    const { error: dropError } = await supabase
      .from('enrollments')
      .update({ status: 'dropped' })
      .in('id', enrollmentIds);

    if (dropError) return { error: dropError.message };
  }

  await rejectAllPendingSubmissionsForStudent(supabase, studentId);

  return {
    success: true,
    droppedEnrollments: enrollmentIds.length,
    adjustedInvoiceIds,
  };
}

export function isRestrictedStudentStatus(status: string | null | undefined) {
  return status === 'withdrawn' || status === 'inactive' || status === 'suspended';
}
