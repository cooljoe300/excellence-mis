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
  if (error) throw new Error(error.message);
  return data;
}

export async function createFeePayment(formData: FormData) {
  const supabase = await createClient();
  const amount = parseFloat(formData.get('amount') as string);
  const amountPaid = parseFloat(formData.get('amount_paid') as string) || 0;

  let status: PaymentStatus = 'pending';
  if (amountPaid >= amount) status = 'paid';
  else if (amountPaid > 0) status = 'partial';

  const { error } = await supabase.from('fee_payments').insert({
    student_id: formData.get('student_id') as string,
    term_id: (formData.get('term_id') as string) || null,
    amount,
    amount_paid: amountPaid,
    status,
    due_date: (formData.get('due_date') as string) || null,
    paid_date: amountPaid > 0 ? (formData.get('paid_date') as string) || new Date().toISOString().split('T')[0] : null,
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
