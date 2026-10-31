'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PaymentStatus } from '@/lib/types';
import { logWhatsAppNotification, getWhatsAppService } from '@/app/actions/whatsapp-notifications';
import { getSystemSettings } from '@/app/actions/system-settings';
import { whatsappService } from '@/lib/whatsapp-service';
import { syncPendingApprovalNotifications } from '@/app/actions/notifications';
import { logAudit } from '@/lib/audit-logger';

export async function getFeePayments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payments')
    .select(
      '*, student:students(*, program:programs(*), intake:intakes(*)), term:academic_terms(*), submissions:fee_payment_submissions(*), items:fee_payment_items(*, course:courses(code, name))'
    )
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await supabase
      .from('fee_payments')
      .select('*, student:students(*, program:programs(*)), term:academic_terms(*)')
      .order('created_at', { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data ?? [];
  }

  // Attach intakes to students in fee payments
  const studentIds = [...new Set(data?.map(f => f.student_id) || [])];
  const { data: studentIntakes, error: intakesError } = await supabase
    .from('student_intakes')
    .select('student_id, intake:intakes(*)')
    .in('student_id', studentIds);

  const intakesByStudent = new Map<string, any[]>();
  if (!intakesError && studentIntakes) {
    studentIntakes.forEach(si => {
      if (!intakesByStudent.has(si.student_id)) {
        intakesByStudent.set(si.student_id, []);
      }
      intakesByStudent.get(si.student_id)?.push(si.intake);
    });
  }

  // Attach intakes to each fee payment's student, falling back to the
  // legacy students.intake_id relation when no junction row exists.
  data?.forEach(fee => {
    if (fee.student) {
      const junction = intakesByStudent.get(fee.student_id);
      if (junction && junction.length > 0) {
        (fee.student as any).intakes = junction;
      } else {
        const legacyIntake = (fee.student as any).intake;
        (fee.student as any).intakes = Array.isArray(legacyIntake)
          ? legacyIntake
          : legacyIntake
            ? [legacyIntake]
            : [];
      }
    }
  });

  return data ?? [];
}

export async function checkPaymentApprovalSetup(): Promise<{ ready: boolean; message?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('fee_payment_submissions').select('status').limit(1);

  if (error) {
    const missingColumn =
      error.message.includes('status') ||
      error.message.includes('column') ||
      error.code === '42703';
    if (missingColumn) {
      return {
        ready: false,
        message:
          'Payment approval is not set up. Run supabase/migrations/011_fee_payment_approval.sql in the Supabase SQL Editor, then redeploy the app.',
      };
    }
  }

  return { ready: true };
}

export async function getPendingFeePaymentSubmissions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payment_submissions')
    .select(
      '*, student:students(*), fee_payment:fee_payments(*, student:students(*), term:academic_terms(name))'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    if (
      error.message.includes('status') ||
      error.message.includes('column') ||
      error.code === '42703'
    ) {
      return [];
    }
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createFeePayment(formData: FormData) {
  const supabase = await createClient();
  const amount = parseFloat(formData.get('amount') as string);
  const amountPaid = parseFloat(formData.get('amount_paid') as string) || 0;
  const studentId = formData.get('student_id') as string;

  // Get student information for audit log
  const { data: student } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_number')
    .eq('id', studentId)
    .single();

  let status: PaymentStatus = 'pending';
  if (amountPaid >= amount) status = 'paid';
  else if (amountPaid > 0) status = 'partial';

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase.from('fee_payments').insert({
    student_id: studentId,
    term_id: (formData.get('term_id') as string) || null,
    amount,
    amount_paid: amountPaid,
    status,
    invoice_date: today,
    due_date: (formData.get('due_date') as string) || null,
    paid_date: amountPaid > 0 ? (formData.get('paid_date') as string) || today : null,
    receipt_date: amountPaid >= amount ? today : null,
    payment_method: (formData.get('payment_method') as string) || null,
    reference_number: (formData.get('reference_number') as string) || null,
    description: (formData.get('description') as string) || null,
  }).select('id').single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');

  // Log audit action
  await logAudit({
    action: 'create',
    module: 'fees',
    entityType: 'fee_payment',
    entityId: data.id,
    entityName: student ? `${student.first_name} ${student.last_name} - ${amount}` : `Unknown student - ${amount}`,
    details: `Fee payment created: ${amount} (Paid: ${amountPaid}, Status: ${status})`,
    newValue: { amount, amount_paid: amountPaid, status },
  });

  return { success: true };
}

export async function updateFeePayment(id: string, formData: FormData) {
  const supabase = await createClient();
  const amount = parseFloat(formData.get('amount') as string);
  const amountPaid = parseFloat(formData.get('amount_paid') as string) || 0;

  // Get existing fee payment for audit log
  const { data: existing } = await supabase
    .from('fee_payments')
    .select('*, student:students(first_name, last_name, student_number)')
    .eq('id', id)
    .single();

  let status: PaymentStatus = (formData.get('status') as PaymentStatus) || 'pending';
  if (amountPaid >= amount) status = 'paid';
  else if (amountPaid > 0) status = 'partial';
  else if (status !== 'waived') status = 'pending';

  const { error } = await supabase
    .from('fee_payments')
    .update({
      amount,
      amount_paid: amountPaid,
      status,
      due_date: (formData.get('due_date') as string) || null,
      paid_date: (formData.get('paid_date') as string) || null,
      payment_method: (formData.get('payment_method') as string) || null,
      reference_number: (formData.get('reference_number') as string) || null,
      description: (formData.get('description') as string) || null,
    })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');

  // Log audit action
  await logAudit({
    action: 'update',
    module: 'fees',
    entityType: 'fee_payment',
    entityId: id,
    entityName: existing?.student ? `${existing.student.first_name} ${existing.student.last_name} - ${amount}` : `Unknown student - ${amount}`,
    details: `Fee payment updated: ${existing?.amount} → ${amount}, Paid: ${existing?.amount_paid} → ${amountPaid}, Status: ${existing?.status} → ${status}`,
    previousValue: existing ? { amount: existing.amount, amount_paid: existing.amount_paid, status: existing.status } : null,
    newValue: { amount, amount_paid: amountPaid, status },
  });

  return { success: true };
}

export async function deleteFeePayment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('fee_payments').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  return { success: true };
}

export async function approveFeePaymentSubmission(submissionId: string) {
  const supabase = await createClient();
  
  // Get submission details before approval for audit log
  const { data: submissionBefore } = await supabase
    .from('fee_payment_submissions')
    .select('*, student:students(*), fee_payment:fee_payments(*)')
    .eq('id', submissionId)
    .single();

  const { data, error } = await supabase.rpc('approve_fee_payment_submission', {
    p_submission_id: submissionId,
  });

  if (error) {
    if (error.message.includes('approve_fee_payment_submission')) {
      return {
        error: 'Payment approval is not set up yet. Ask admin to run migration 011_fee_payment_approval.sql and 024_update_approval_with_receipt.sql in Supabase.',
      };
    }
    return { error: error.message };
  }

  const result = data as {
    error?: string;
    success?: boolean;
    amount_paid?: number;
    balance?: number;
    status?: string;
    receipt_number?: string;
  };

  if (result?.error) return { error: result.error };
  if (!result?.success) return { error: 'Payment could not be approved.' };

  // Log approval action
  if (submissionBefore && submissionBefore.student) {
    await logAudit({
      action: 'approve',
      module: 'fees',
      entityType: 'fee_payment_submission',
      entityId: submissionId,
      entityName: `${submissionBefore.student.first_name} ${submissionBefore.student.last_name} - ${submissionBefore.amount}`,
      details: `Payment approved: ${submissionBefore.amount} via ${submissionBefore.payment_method}, Reference: ${submissionBefore.reference_number}`,
      previousValue: { status: 'pending' },
      newValue: { status: 'approved', amount_paid: result.amount_paid, balance: result.balance, receipt_number: result.receipt_number },
      actorType: 'ADMIN',
    });
  }

  // Send WhatsApp notification to student about approved payment
  let whatsappNotified = false;
  let whatsappError = null;
  
  try {
    const settings = await getSystemSettings();
    const whatsappEnabled = settings.find((s: any) => s.key === 'whatsapp_enabled')?.value === 'true';
    const enableApproved = settings.find((s: any) => s.key === 'whatsapp_enable_payment_approved')?.value === 'true';

    if (whatsappEnabled && enableApproved) {
      // Get the submission details for notification
      const { data: submission } = await supabase
        .from('fee_payment_submissions')
        .select('*, student:students(*, phone), fee_payment:fee_payments(*)')
        .eq('id', submissionId)
        .single();

      if (submission && submission.student && submission.fee_payment) {
        const student = submission.student as any;
        const feePayment = submission.fee_payment as any;
        
        if (student.phone) {
          const admissionNumber = student.student_number || 'N/A';
          const currentDate = new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
          });

          // Use settings-based service if credentials are configured, otherwise fallback to env vars
          const hasDbCredentials = settings.some((s: any) => 
            s.key.startsWith('whatsapp_twilio_') || 
            s.key.startsWith('whatsapp_messagebird_') || 
            s.key.startsWith('whatsapp_meta_')
          );
          
          const service = hasDbCredentials ? await getWhatsAppService() : whatsappService;
          const notificationResult = await service.sendPaymentApprovedNotification({
            recipientPhone: student.phone,
            templateName: 'payment_approved',
            templateData: {
              student_name: `${student.first_name} ${student.last_name}`,
              admission_number: admissionNumber,
              amount: submission.amount?.toString() || '0',
              payment_method: submission.payment_method,
              reference_number: submission.reference_number,
              receipt_number: result.receipt_number || 'N/A',
              date: currentDate,
            },
          });

          // Log the notification
          await logWhatsAppNotification({
            paymentId: feePayment.id,
            studentId: student.id,
            recipientPhone: student.phone,
            notificationType: 'PAYMENT_APPROVED',
            templateName: 'payment_approved',
            result: notificationResult,
          });

          whatsappNotified = notificationResult.success;
          if (!notificationResult.success) {
            whatsappError = notificationResult.error;
          }
        }
      }
    }
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    whatsappError = error instanceof Error ? error.message : 'Unknown error';
  }

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/student/(portal)/fees');
  revalidatePath('/student/(portal)');
  revalidatePath('/student/(portal)/page');

  // Sync notifications to remove this approval from pending notifications
  await syncPendingApprovalNotifications();

  return {
    success: true,
    amountPaid: result.amount_paid,
    balance: result.balance,
    status: result.status,
    receiptNumber: result.receipt_number,
    whatsappNotified,
    whatsappError,
  };
}

export async function rejectFeePaymentSubmission(submissionId: string, rejectionReason: string) {
  const supabase = await createClient();
  
  // First, get the submission details
  const { data: submission, error: fetchError } = await supabase
    .from('fee_payment_submissions')
    .select('*, student:students(*, phone), fee_payment:fee_payments(*)')
    .eq('id', submissionId)
    .single();

  if (fetchError || !submission) {
    return { error: 'Payment submission not found.' };
  }

  if (submission.status !== 'pending') {
    return { error: 'This submission has already been processed.' };
  }

  // Update the submission status to rejected
  const { error } = await supabase
    .from('fee_payment_submissions')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: (await (supabase.auth as any).getUser()).data.user?.id,
    })
    .eq('id', submissionId);

  if (error) {
    return { error: error.message };
  }

  // Log rejection action
  if (submission && submission.student) {
    await logAudit({
      action: 'reject',
      module: 'fees',
      entityType: 'fee_payment_submission',
      entityId: submissionId,
      entityName: `${submission.student.first_name} ${submission.student.last_name} - ${submission.amount}`,
      details: `Payment rejected: ${submission.amount} via ${submission.payment_method}, Reference: ${submission.reference_number}, Reason: ${rejectionReason}`,
      previousValue: { status: 'pending' },
      newValue: { status: 'rejected', rejection_reason: rejectionReason },
      actorType: 'ADMIN',
    });
  }

  // Send WhatsApp notification to student about rejected payment
  let whatsappNotified = false;
  let whatsappError = null;
  
  try {
    const settings = await getSystemSettings();
    const whatsappEnabled = settings.find((s: any) => s.key === 'whatsapp_enabled')?.value === 'true';
    const enableRejected = settings.find((s: any) => s.key === 'whatsapp_enable_payment_rejected')?.value === 'true';

    if (whatsappEnabled && enableRejected) {
      const student = submission.student as any;
      const feePayment = submission.fee_payment as any;
      
      if (student && student.phone) {
        const admissionNumber = student.student_number || 'N/A';

        // Use settings-based service if credentials are configured, otherwise fallback to env vars
        const hasDbCredentials = settings.some((s: any) => 
          s.key.startsWith('whatsapp_twilio_') || 
          s.key.startsWith('whatsapp_messagebird_') || 
          s.key.startsWith('whatsapp_meta_')
        );
        
        const service = hasDbCredentials ? await getWhatsAppService() : whatsappService;
        const notificationResult = await service.sendPaymentRejectedNotification({
          recipientPhone: student.phone,
          templateName: 'payment_rejected',
          templateData: {
            student_name: `${student.first_name} ${student.last_name}`,
            admission_number: admissionNumber,
            amount: submission.amount?.toString() || '0',
            reference_number: submission.reference_number,
            rejection_reason: rejectionReason,
          },
        });

        // Log the notification
        await logWhatsAppNotification({
          paymentId: feePayment.id,
          studentId: student.id,
          recipientPhone: student.phone,
          notificationType: 'PAYMENT_REJECTED',
          templateName: 'payment_rejected',
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

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/student/(portal)/fees');
  revalidatePath('/student/(portal)');
  revalidatePath('/student/(portal)/page');

  // Sync notifications to remove this approval from pending notifications
  await syncPendingApprovalNotifications();

  return {
    success: true,
    whatsappNotified,
    whatsappError,
  };
}

export async function getFeePaymentsForStudent(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payments')
    .select(
      '*, term:academic_terms(name), items:fee_payment_items(*, course:courses(code, name)), submissions:fee_payment_submissions(*)'
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFeePayment(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payments')
    .select(
      '*, student:students(*, program:programs(name)), term:academic_terms(name), items:fee_payment_items(*, course:courses(code, name))'
    )
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getFeePaymentSubmission(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payment_submissions')
    .select(
      '*, fee_payment:fee_payments(*, student:students(*, program:programs(name)), term:academic_terms(name), items:fee_payment_items(*, course:courses(code, name)))'
    )
    .eq('id', submissionId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function markFeeAsPaid(feeId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();
  
  if (!user) return { error: 'You must be signed in.' };

  const paymentMethod = (formData.get('payment_method') as string) || null;
  const referenceNumber = (formData.get('reference_number') as string) || null;
  const paymentDate = (formData.get('payment_date') as string) || new Date().toISOString().split('T')[0];
  const notes = (formData.get('notes') as string) || null;
  const amountPaid = parseFloat(formData.get('amount_paid') as string) || null;

  console.log('[markFeeAsPaid] Fee ID:', feeId);
  console.log('[markFeeAsPaid] Amount paid:', amountPaid);
  console.log('[markFeeAsPaid] Payment method:', paymentMethod);
  console.log('[markFeeAsPaid] Reference number:', referenceNumber);

  // Get the current fee payment
  const { data: fee, error: fetchError } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('id', feeId)
    .single();

  if (fetchError || !fee) {
    console.error('[markFeeAsPaid] Fee payment not found:', fetchError);
    return { error: 'Fee payment not found.' };
  }

  console.log('[markFeeAsPaid] Fee student_id:', fee.student_id);
  console.log('[markFeeAsPaid] Fee status before:', fee.status);
  console.log('[markFeeAsPaid] Fee amount_paid before:', fee.amount_paid);

  // Generate unique receipt number if not already exists
  let receiptNumber = fee.receipt_number;
  if (!receiptNumber) {
    const year = new Date().getFullYear();
    const prefix = `EOC/RCP/${year}/`;
    
    // Get the last receipt number for this year
    const { data: lastReceipt } = await supabase
      .from('fee_payments')
      .select('receipt_number')
      .like('receipt_number', `${prefix}%`)
      .order('receipt_number', { ascending: false })
      .limit(1)
      .single();
    
    let nextNumber = 1;
    if (lastReceipt?.receipt_number) {
      const lastNum = parseInt(lastReceipt.receipt_number.split('/').pop() || '0');
      nextNumber = lastNum + 1;
    }
    
    receiptNumber = `${prefix}${String(nextNumber).padStart(6, '0')}`;
  }

  // Use the provided amount_paid or default to full amount
  const finalAmountPaid = amountPaid !== null ? amountPaid : fee.amount;
  const today = new Date().toISOString().split('T')[0];

  console.log('[markFeeAsPaid] Final amount paid:', finalAmountPaid);
  console.log('[markFeeAsPaid] Receipt number:', receiptNumber);
  console.log('[markFeeAsPaid] Payment date:', paymentDate);

  // Update the fee payment to paid
  const { error } = await supabase
    .from('fee_payments')
    .update({
      amount_paid: finalAmountPaid,
      status: finalAmountPaid >= fee.amount ? 'paid' : 'partial',
      payment_method: paymentMethod || fee.payment_method,
      reference_number: referenceNumber || fee.reference_number,
      paid_date: paymentDate,
      receipt_number: receiptNumber,
      receipt_date: today,
      invoice_date: fee.invoice_date || today,
      notes: notes ? `${fee.notes ? fee.notes + '\n' : ''}[Admin mark as paid] ${notes}` : fee.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feeId);

  if (error) {
    console.error('[markFeeAsPaid] Update error:', error);
    return { error: error.message };
  }

  console.log('[markFeeAsPaid] Update successful');

  // Create an audit log entry in the notes
  const adminNote = `[Marked as paid by admin on ${new Date().toISOString()} - User: ${user.email} - Receipt: ${receiptNumber}]`;
  await supabase
    .from('fee_payments')
    .update({
      notes: `${fee.notes ? fee.notes + '\n' : ''}${adminNote}`,
    })
    .eq('id', feeId);

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/student/(portal)/fees');
  revalidatePath('/student/(portal)');
  revalidatePath('/student/(portal)/page');

  return { success: true, receiptNumber };
}

export async function applyFeeDiscount(
  feePaymentId: string,
  discountType: 'fixed' | 'percentage',
  discountAmount: number,
  discountPercentage: number | null,
  reason: string
) {
  const supabase = await createClient();
  
  // Get fee payment details before applying discount
  const { data: feePaymentBefore } = await supabase
    .from('fee_payments')
    .select('*, student:students(*)')
    .eq('id', feePaymentId)
    .single();

  const { data, error } = await supabase.rpc('apply_fee_discount', {
    p_fee_payment_id: feePaymentId,
    p_discount_type: discountType,
    p_discount_amount: discountAmount,
    p_reason: reason,
    ...(discountPercentage !== null && { p_discount_percentage: discountPercentage }),
  });

  if (error) {
    console.error('Error applying fee discount:', error);
    return { error: error.message };
  }

  const result = data as {
    error?: string;
    success?: boolean;
    original_amount?: number;
    discount_amount?: number;
    adjusted_amount?: number;
    amount_paid?: number;
    balance?: number;
  };

  if (result?.error) return { error: result.error };
  if (!result?.success) return { error: 'Failed to apply discount' };

  // Log discount application
  if (feePaymentBefore && feePaymentBefore.student) {
    await logAudit({
      action: 'apply_discount',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: feePaymentId,
      entityName: `${feePaymentBefore.student.first_name} ${feePaymentBefore.student.last_name}`,
      details: `Fee discount applied: ${discountType === 'percentage' ? `${discountPercentage}%` : `${discountAmount}`} off, Reason: ${reason}`,
      previousValue: { amount: result.original_amount, discount_amount: null },
      newValue: { amount: result.adjusted_amount, discount_amount: result.discount_amount, balance: result.balance },
      actorType: 'ADMIN',
    });
  }

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/student/(portal)/fees');
  revalidatePath('/student/(portal)');

  return {
    success: true,
    originalAmount: result.original_amount,
    discountAmount: result.discount_amount,
    adjustedAmount: result.adjusted_amount,
    amountPaid: result.amount_paid,
    balance: result.balance,
  };
}

export async function removeFeeDiscount(feePaymentId: string) {
  const supabase = await createClient();
  
  // Get fee payment details before removing discount
  const { data: feePaymentBefore } = await supabase
    .from('fee_payments')
    .select('*, student:students(*)')
    .eq('id', feePaymentId)
    .single();

  const { data, error } = await supabase.rpc('remove_fee_discount', {
    p_fee_payment_id: feePaymentId,
  });

  if (error) {
    console.error('Error removing fee discount:', error);
    return { error: error.message };
  }

  const result = data as {
    error?: string;
    success?: boolean;
    original_amount?: number;
    discount_amount?: number;
    adjusted_amount?: number;
    amount_paid?: number;
    balance?: number;
  };

  if (result?.error) return { error: result.error };
  if (!result?.success) return { error: 'Failed to remove discount' };

  // Log discount removal
  if (feePaymentBefore && feePaymentBefore.student) {
    await logAudit({
      action: 'remove_discount',
      module: 'fees',
      entityType: 'fee_payment',
      entityId: feePaymentId,
      entityName: `${feePaymentBefore.student.first_name} ${feePaymentBefore.student.last_name}`,
      details: `Fee discount removed: ${result.discount_amount} discount removed`,
      previousValue: { amount: result.adjusted_amount, discount_amount: result.discount_amount },
      newValue: { amount: result.original_amount, discount_amount: null, balance: result.balance },
      actorType: 'ADMIN',
    });
  }

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  revalidatePath('/student/(portal)/fees');
  revalidatePath('/student/(portal)');

  return {
    success: true,
    originalAmount: result.original_amount,
    discountAmount: result.discount_amount,
    adjustedAmount: result.adjusted_amount,
    amountPaid: result.amount_paid,
    balance: result.balance,
  };
}

export async function getFeeDiscountHistory(feePaymentId?: string, studentId?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('fee_discount_history')
    .select('*, student:students(*), applied_by_profile:profiles(full_name, email), approved_by_profile:profiles(full_name, email)');

  if (feePaymentId) {
    query = query.eq('fee_payment_id', feePaymentId);
  }

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query.order('applied_at', { ascending: false });

  if (error) {
    console.error('Error fetching discount history:', error);
    return [];
  }

  return data ?? [];
}
