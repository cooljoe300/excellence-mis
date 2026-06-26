'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { getMyStudentRecord } from '@/app/actions/student-self';
import type { FeePayment } from '@/lib/types';
import { getFeeBalance } from '@/lib/utils';

export async function getMyFeesPageData() {
  const student = await getMyStudentRecord();
  if (!student) return null;

  const supabase = await createClient();
  const [paymentSettings, feesRes] = await Promise.all([
    getPaymentSettings(),
    supabase
      .from('fee_payments')
      .select(
        '*, term:academic_terms(name), items:fee_payment_items(*, course:courses(code, name)), submissions:fee_payment_submissions(*)'
      )
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
  ]);

  if (feesRes.error) throw new Error(feesRes.error.message);

  const fees = (feesRes.data ?? []) as FeePayment[];
  const totalDue = fees.reduce((sum, fee) => sum + getFeeBalance(fee), 0);
  const totalPaid = fees.reduce((sum, fee) => sum + Number(fee.amount_paid ?? 0), 0);
  const totalBilled = fees.reduce((sum, fee) => sum + Number(fee.amount ?? 0), 0);

  return {
    student,
    paymentSettings,
    fees,
    totalDue,
    totalPaid,
    totalBilled,
  };
}

export async function submitMyFeePayment(
  feePaymentId: string,
  amount: number,
  paymentMethod: string,
  referenceNumber: string
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_student_fee_payment', {
    p_fee_payment_id: feePaymentId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_reference_number: referenceNumber,
  });

  if (error) return { error: error.message };

  const result = data as {
    error?: string;
    success?: boolean;
    amount_paid?: number;
    balance?: number;
    status?: string;
  };

  if (result?.error) return { error: result.error };
  if (!result?.success) return { error: 'Payment could not be recorded.' };

  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/dashboard/fees');

  return {
    success: true,
    amountPaid: result.amount_paid,
    balance: result.balance,
    status: result.status,
  };
}
