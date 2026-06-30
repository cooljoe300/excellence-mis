'use server';

import { revalidatePath } from 'next/cache';
import { initiateStkPush, getMpesaStkMissingConfig } from '@/lib/mpesa';
import { createClient } from '@/lib/supabase/server';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { getAdmissionNumber, getAvailableFeeBalance } from '@/lib/utils';
import { isRestrictedStudentStatus } from '@/lib/student-deregistration-fees';
import type { FeePayment } from '@/lib/types';

export async function getMpesaStkAvailability() {
  const settings = await getPaymentSettings();
  const missingConfig = getMpesaStkMissingConfig();
  return {
    enabled: settings.pesapalEnabled,
    configured: missingConfig.length === 0,
    missingConfig,
  };
}

export async function initiateMyStkPush(
  feePaymentId: string,
  amount: number,
  phoneNumber: string
) {
  const availability = await getMpesaStkAvailability();
  if (!availability.enabled) {
    return { error: 'M-Pesa STK push is not enabled. Use manual paybill payment instead.' };
  }
  if (!availability.configured) {
    const missing = availability.missingConfig.join(', ');
    return {
      error: `M-Pesa STK push is not fully configured yet (${missing}). Ask admin to add these in server settings and redeploy.`,
    };
  }

  const student = await getMyStudentRecord();
  if (!student) return { error: 'Student record not found.' };
  if (isRestrictedStudentStatus(student.status)) {
    return {
      error:
        'Your student account is not active. Contact the college administration about your fees.',
    };
  }

  const paidAmount = Math.round(amount);
  if (!Number.isFinite(paidAmount) || paidAmount < 1) {
    return { error: 'Enter a valid payment amount.' };
  }

  const supabase = await createClient();
  const { data: fee, error: feeError } = await supabase
    .from('fee_payments')
    .select('*, submissions:fee_payment_submissions(*)')
    .eq('id', feePaymentId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (feeError || !fee) {
    return { error: 'Fee invoice not found.' };
  }

  const availableBalance = getAvailableFeeBalance(fee as FeePayment, fee.submissions);
  if (availableBalance <= 0) {
    return { error: 'This invoice has no balance left to pay.' };
  }
  if (paidAmount > availableBalance) {
    return {
      error: `Amount cannot exceed the available balance of KES ${availableBalance.toLocaleString()}.`,
    };
  }

  const admissionNumber = getAdmissionNumber(student);
  const { data: requestRow, error: insertError } = await supabase
    .from('mpesa_stk_push_requests')
    .insert({
      fee_payment_id: feePaymentId,
      student_id: student.id,
      amount: paidAmount,
      phone_number: phoneNumber.trim(),
      account_reference: admissionNumber,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !requestRow) {
    if (insertError?.message.includes('mpesa_stk_push_requests')) {
      return {
        error: 'M-Pesa STK push is not set up yet. Ask admin to run migration 013 in Supabase.',
      };
    }
    return { error: insertError?.message ?? 'Could not start M-Pesa payment.' };
  }

  try {
    const stk = await initiateStkPush({
      phoneNumber,
      amount: paidAmount,
      accountReference: admissionNumber,
      transactionDesc: 'EOC fees',
    });

    const { error: updateError } = await supabase.rpc('update_mpesa_stk_push_ids', {
      p_request_id: requestRow.id,
      p_checkout_request_id: stk.checkoutRequestId,
      p_merchant_request_id: stk.merchantRequestId,
    });

    if (updateError) {
      return { error: updateError.message };
    }

    return {
      success: true,
      requestId: requestRow.id as string,
      message: stk.responseDescription,
    };
  } catch (error) {
    await supabase
      .from('mpesa_stk_push_requests')
      .update({
        status: 'failed',
        result_desc: error instanceof Error ? error.message : 'STK push failed.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestRow.id);

    return {
      error: error instanceof Error ? error.message : 'M-Pesa could not send the payment prompt.',
    };
  }
}

export async function getMyStkPushStatus(requestId: string) {
  const student = await getMyStudentRecord();
  if (!student) return { error: 'Student record not found.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mpesa_stk_push_requests')
    .select('id, status, result_desc, mpesa_receipt_number, submission_id, amount')
    .eq('id', requestId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (error) {
    if (error.message.includes('mpesa_stk_push_requests')) {
      return { error: 'M-Pesa STK push is not set up yet.' };
    }
    return { error: error.message };
  }

  if (!data) return { error: 'Payment request not found.' };

  if (data.status === 'completed') {
    revalidatePath('/student/fees');
    revalidatePath('/student');
    revalidatePath('/dashboard/fees');
  }

  return {
    status: data.status as string,
    resultDesc: data.result_desc as string | null,
    receiptNumber: data.mpesa_receipt_number as string | null,
    submissionId: data.submission_id as string | null,
    amount: Number(data.amount),
  };
}
