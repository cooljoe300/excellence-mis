'use server';

import { revalidatePath } from 'next/cache';
import {
  getPesapalConfig,
  getPesapalMissingConfig,
  getPesapalTransactionLimit,
  getPesapalTransactionStatus,
  registerPesapalIpn,
  submitPesapalOrder,
} from '@/lib/pesapal';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { getAdmissionNumber, getAvailableFeeBalance } from '@/lib/utils';
import { isRestrictedStudentStatus } from '@/lib/student-deregistration-fees';
import type { FeePayment } from '@/lib/types';

const PESAPAL_IPN_SETTING_KEY = 'pesapal_ipn_id';

async function getOrCreatePesapalIpnId() {
  const envIpnId = process.env.PESAPAL_IPN_ID?.trim();
  if (envIpnId) return envIpnId;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', PESAPAL_IPN_SETTING_KEY)
    .maybeSingle();

  if (data?.value) return data.value;

  const config = getPesapalConfig();
  if (!config) throw new Error('PesaPal is not configured.');

  const ipnId = await registerPesapalIpn(config.ipnUrl);
  await supabase.from('system_settings').upsert(
    { key: PESAPAL_IPN_SETTING_KEY, value: ipnId },
    { onConflict: 'key' }
  );

  return ipnId;
}

export async function getPesapalAvailability() {
  const settings = await getPaymentSettings();
  const missingConfig = getPesapalMissingConfig();
  return {
    enabled: settings.pesapalEnabled,
    configured: missingConfig.length === 0,
    missingConfig,
    maxTransactionAmount: getPesapalTransactionLimit(),
  };
}

export async function processPesapalOrder(orderTrackingId: string) {
  const status = await getPesapalTransactionStatus(orderTrackingId);
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('complete_pesapal_payment', {
    p_order_tracking_id: orderTrackingId,
    p_status_code: status.status_code,
    p_confirmation_code: status.confirmation_code ?? '',
    p_payment_method: status.payment_method ? `PesaPal (${status.payment_method})` : 'PesaPal',
    p_result_desc: status.description || status.payment_status_description,
    p_raw_callback: status,
  });

  if (error) {
    return { error: error.message };
  }

  if (data && typeof data === 'object' && 'error' in data) {
    return { error: String(data.error) };
  }

  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/dashboard/fees');

  return {
    success: true,
    status: status.payment_status_description,
    statusCode: status.status_code,
    confirmationCode: status.confirmation_code,
    amount: status.amount,
    result: data,
  };
}

export async function initiateMyPesapalPayment(feePaymentId: string, amount: number) {
  const availability = await getPesapalAvailability();
  if (!availability.enabled) {
    return { error: 'Online payments are not enabled. Use manual payment instead.' };
  }
  if (!availability.configured) {
    const missing = availability.missingConfig.join(', ');
    return {
      error: `PesaPal is not fully configured yet (${missing}). Ask admin to add these in server settings and redeploy.`,
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

  const maxTransactionAmount = getPesapalTransactionLimit();
  if (maxTransactionAmount !== null && paidAmount > maxTransactionAmount) {
    return {
      error: `Online payments are limited to KES ${maxTransactionAmount.toLocaleString()} per transaction. Pay a smaller amount or use manual payment for the rest.`,
    };
  }

  const admissionNumber = getAdmissionNumber(student);
  const merchantReference = crypto.randomUUID();

  const { data: requestRow, error: insertError } = await supabase
    .from('pesapal_payment_requests')
    .insert({
      fee_payment_id: feePaymentId,
      student_id: student.id,
      amount: paidAmount,
      merchant_reference: merchantReference,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !requestRow) {
    if (insertError?.message.includes('pesapal_payment_requests')) {
      return {
        error: 'PesaPal payments are not set up yet. Ask admin to run migration 016 in Supabase.',
      };
    }
    return { error: insertError?.message ?? 'Could not start payment.' };
  }

  try {
    const config = getPesapalConfig();
    if (!config) return { error: 'PesaPal is not configured on the server.' };

    const notificationId = await getOrCreatePesapalIpnId();
    const order = await submitPesapalOrder({
      merchantReference,
      amount: paidAmount,
      description: `EOC fees ${admissionNumber}`,
      notificationId,
      callbackUrl: config.callbackUrl,
      billingAddress: {
        email_address: student.email,
        phone_number: student.phone ?? undefined,
        first_name: student.first_name,
        last_name: student.last_name,
      },
    });

    const { error: updateError } = await supabase.rpc('update_pesapal_tracking_id', {
      p_request_id: requestRow.id,
      p_order_tracking_id: order.orderTrackingId,
    });

    if (updateError) {
      return { error: updateError.message };
    }

    return {
      success: true,
      redirectUrl: order.redirectUrl,
      requestId: requestRow.id as string,
    };
  } catch (error) {
    await supabase
      .from('pesapal_payment_requests')
      .update({
        status: 'failed',
        result_desc: error instanceof Error ? error.message : 'PesaPal payment failed.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestRow.id);

    return {
      error: error instanceof Error ? error.message : 'PesaPal could not start the payment.',
    };
  }
}

export async function getMyPesapalPaymentStatus(requestId: string) {
  const student = await getMyStudentRecord();
  if (!student) return { error: 'Student record not found.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('pesapal_payment_requests')
    .select('id, status, result_desc, confirmation_code, submission_id, amount, order_tracking_id')
    .eq('id', requestId)
    .eq('student_id', student.id)
    .maybeSingle();

  if (error) {
    if (error.message.includes('pesapal_payment_requests')) {
      return { error: 'PesaPal payments are not set up yet.' };
    }
    return { error: error.message };
  }

  if (!data) return { error: 'Payment request not found.' };

  if (data.status === 'pending' && data.order_tracking_id) {
    try {
      await processPesapalOrder(data.order_tracking_id as string);
    } catch {
      // Status will remain pending until IPN/callback succeeds.
    }
  }

  const { data: refreshed } = await supabase
    .from('pesapal_payment_requests')
    .select('id, status, result_desc, confirmation_code, submission_id, amount')
    .eq('id', requestId)
    .eq('student_id', student.id)
    .maybeSingle();

  const row = refreshed ?? data;

  if (row.status === 'completed') {
    revalidatePath('/student/fees');
    revalidatePath('/student');
    revalidatePath('/dashboard/fees');
  }

  return {
    status: row.status as string,
    resultDesc: row.result_desc as string | null,
    receiptNumber: row.confirmation_code as string | null,
    submissionId: row.submission_id as string | null,
    amount: Number(row.amount),
  };
}
