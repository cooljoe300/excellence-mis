'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { PaymentStatus } from '@/lib/types';

export async function getFeePayments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('fee_payments')
    .select(
      '*, student:students(*), term:academic_terms(*), submissions:fee_payment_submissions(*)'
    )
    .order('created_at', { ascending: false });

  if (error) {
    const fallback = await supabase
      .from('fee_payments')
      .select('*, student:students(*), term:academic_terms(*)')
      .order('created_at', { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data ?? [];
  }

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

  let status: PaymentStatus = 'pending';
  if (amountPaid >= amount) status = 'paid';
  else if (amountPaid > 0) status = 'partial';

  const today = new Date().toISOString().split('T')[0];

  const { error } = await supabase.from('fee_payments').insert({
    student_id: formData.get('student_id') as string,
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
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  return { success: true };
}

export async function updateFeePayment(id: string, formData: FormData) {
  const supabase = await createClient();
  const amount = parseFloat(formData.get('amount') as string);
  const amountPaid = parseFloat(formData.get('amount_paid') as string) || 0;

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
  const { data, error } = await supabase.rpc('approve_fee_payment_submission', {
    p_submission_id: submissionId,
  });

  if (error) {
    if (error.message.includes('approve_fee_payment_submission')) {
      return {
        error: 'Payment approval is not set up yet. Ask admin to run migration 011_fee_payment_approval.sql in Supabase.',
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
  };

  if (result?.error) return { error: result.error };
  if (!result?.success) return { error: 'Payment could not be approved.' };

  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');

  return {
    success: true,
    amountPaid: result.amount_paid,
    balance: result.balance,
    status: result.status,
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
  } = await supabase.auth.getUser();
  
  if (!user) return { error: 'You must be signed in.' };

  const paymentMethod = (formData.get('payment_method') as string) || null;
  const referenceNumber = (formData.get('reference_number') as string) || null;
  const paymentDate = (formData.get('payment_date') as string) || new Date().toISOString().split('T')[0];
  const notes = (formData.get('notes') as string) || null;
  const amountPaid = parseFloat(formData.get('amount_paid') as string) || null;

  // Get the current fee payment
  const { data: fee, error: fetchError } = await supabase
    .from('fee_payments')
    .select('*')
    .eq('id', feeId)
    .single();

  if (fetchError || !fee) {
    return { error: 'Fee payment not found.' };
  }

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
    return { error: error.message };
  }

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

  return { success: true, receiptNumber };
}
