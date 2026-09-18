'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getPaymentSettings } from '@/app/actions/system-settings';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getFeePayment } from '@/app/actions/fees';
import type { FeePayment } from '@/lib/types';
import { getFeeBalance } from '@/lib/utils';
import { isRestrictedStudentStatus } from '@/lib/student-deregistration-fees';
import { logWhatsAppNotification, getWhatsAppService } from '@/app/actions/whatsapp-notifications';
import { getSystemSettings } from '@/app/actions/system-settings';
import { whatsappService } from '@/lib/whatsapp-service';
import { logAudit } from '@/lib/audit-logger';

export async function getMyFeesPageData() {
  const student = await getMyStudentRecord();
  if (!student) return null;

  console.log('[getMyFeesPageData] Student ID:', student.id);
  console.log('[getMyFeesPageData] Student email:', student.email);
  console.log('[getMyFeesPageData] Student profile_id:', student.profile_id);

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

  console.log('[getMyFeesPageData] Fees query error:', feesRes.error);
  console.log('[getMyFeesPageData] Fees count:', feesRes.data?.length || 0);

  let fees = (feesRes.data ?? []) as FeePayment[];

  if (feesRes.error) {
    const fallback = await supabase
      .from('fee_payments')
      .select('*, term:academic_terms(name), items:fee_payment_items(*, course:courses(code, name))')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (fallback.error) throw new Error(fallback.error.message);
    fees = (fallback.data ?? []) as FeePayment[];
  }
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
  const student = await getMyStudentRecord();
  if (!student) return { error: 'Student record not found.' };
  if (isRestrictedStudentStatus(student.status)) {
    return {
      error:
        'Your student account is not active. Contact the college administration about your fees.',
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('submit_student_fee_payment', {
    p_fee_payment_id: feePaymentId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_reference_number: referenceNumber,
  });

  if (error) {
    if (error.message.includes('submit_student_fee_payment')) {
      return {
        error: 'Payment system is not set up yet. Ask admin to run migrations 009 and 011 in Supabase.',
      };
    }
    return { error: error.message };
  }

  const result = data as {
    error?: string;
    success?: boolean;
    submission_id?: string;
    amount_paid?: number;
    pending_amount?: number;
    balance?: number;
    status?: string;
  };

  if (result?.error) return { error: result.error };
  if (!result?.success) return { error: 'Payment could not be recorded.' };

  // Log payment submission for approval
  await logAudit({
    action: 'submit',
    module: 'fees',
    entityType: 'fee_payment_submission',
    entityId: result.submission_id,
    entityName: `${student.first_name} ${student.last_name} - ${amount}`,
    details: `Student submitted fee payment for approval: ${amount} via ${paymentMethod}, Reference: ${referenceNumber}`,
    newValue: { amount, payment_method: paymentMethod, reference_number: referenceNumber, status: 'pending' },
    actorType: 'STUDENT',
  });

  // Send WhatsApp notification to Finance about pending payment
  let whatsappNotified = false;
  let whatsappError = null;
  
  try {
    const settings = await getSystemSettings();
    const whatsappEnabled = settings.find((s: any) => s.key === 'whatsapp_enabled')?.value === 'true';
    const financePhone = settings.find((s: any) => s.key === 'whatsapp_finance_phone')?.value;
    const enablePending = settings.find((s: any) => s.key === 'whatsapp_enable_payment_pending')?.value === 'true';

    if (whatsappEnabled && financePhone && enablePending && result.submission_id) {
      // Get fee payment details for the notification
      const feePayment = await getFeePayment(feePaymentId);
      
      if (feePayment && student) {
        const admissionNumber = student.student_number || 'N/A';
        const currentDate = new Date().toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
        
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://excellence-mis.vercel.app';
        const reviewLink = `${baseUrl}/dashboard/fees?submission=${result.submission_id}`;

        // Use settings-based service if credentials are configured, otherwise fallback to env vars
        const hasDbCredentials = settings.some((s: any) => 
          s.key.startsWith('whatsapp_twilio_') || 
          s.key.startsWith('whatsapp_messagebird_') || 
          s.key.startsWith('whatsapp_meta_')
        );
        
        const service = hasDbCredentials ? await getWhatsAppService() : whatsappService;
        const notificationResult = await service.sendPaymentPendingNotification({
          recipientPhone: financePhone,
          templateName: 'payment_pending_approval',
          templateData: {
            student_name: `${student.first_name} ${student.last_name}`,
            admission_number: admissionNumber,
            amount: feePayment.amount?.toString() || '0',
            payment_method: paymentMethod,
            reference_number: referenceNumber,
            date: currentDate,
            review_link: reviewLink,
          },
        });

        // Log the notification
        await logWhatsAppNotification({
          paymentId: feePaymentId,
          studentId: student.id,
          recipientPhone: financePhone,
          notificationType: 'PAYMENT_PENDING_APPROVAL',
          templateName: 'payment_pending_approval',
          result: notificationResult,
        });

        whatsappNotified = notificationResult.success;
        if (!notificationResult.success) {
          whatsappError = notificationResult.error;
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    whatsappError = error instanceof Error ? error.message : 'Unknown error';
  }

  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/dashboard/fees');

  return {
    success: true,
    submissionId: result.submission_id as string | undefined,
    pendingAmount: result.pending_amount,
    balance: result.balance,
    status: result.status,
    whatsappNotified,
    whatsappError,
  };
}

export async function getMyFeePaymentSubmission(submissionId: string) {
  const student = await getMyStudentRecord();
  if (!student) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payment_submissions')
    .select(
      '*, fee_payment:fee_payments(*, term:academic_terms(name), items:fee_payment_items(*, course:courses(code, name)))'
    )
    .eq('id', submissionId)
    .single();

  if (error || !data) return null;
  if (data.student_id !== student.id) return null;

  return {
    submission: data,
    fee: data.fee_payment as FeePayment,
    student,
  };
}

export async function getMyFeePayment(feePaymentId: string) {
  const student = await getMyStudentRecord();
  if (!student) return null;

  let fee;
  try {
    fee = await getFeePayment(feePaymentId);
  } catch {
    return null;
  }

  if (fee.student_id !== student.id) return null;
  return { fee, student };
}
