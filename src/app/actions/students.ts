'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import {
  deregisterStudentEnrollmentsAndFees,
  isRestrictedStudentStatus,
} from '@/lib/student-deregistration-fees';
import type { StudentStatus } from '@/lib/types';

function generateTemporaryPassword(length = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function getStudents(search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('students')
    .select('*, program:programs(*), intake:intakes(*)')
    .order('created_at', { ascending: false });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,student_number.ilike.%${search}%,admission_number.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getStudent(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select('*, program:programs(*), intake:intakes(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createStudent(formData: FormData) {
  const supabase = await createClient();
  const adminSupabase = createAdminClient();
  const programId = (formData.get('program_id') as string)?.trim();
  if (!programId) {
    return { error: 'Please select a program. Admission numbers are based on the student program.' };
  }

  const email = formData.get('email') as string;
  const firstName = formData.get('first_name') as string;
  const lastName = formData.get('last_name') as string;

  // Check if auth user already exists with this email
  const { data: existingUser, error: userCheckError } = await adminSupabase.auth.admin.listUsers();
  let existingAuthUser = null;
  if (!userCheckError && existingUser) {
    existingAuthUser = existingUser.users.find(u => u.email === email);
  }

  let authUserId = existingAuthUser?.id;
  let temporaryPassword = null;

  // Create auth account if it doesn't exist
  if (!existingAuthUser) {
    temporaryPassword = generateTemporaryPassword();
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: `${firstName} ${lastName}`,
        role: 'student',
      },
    });

    if (authError) {
      return { error: `Failed to create authentication account: ${authError.message}` };
    }
    authUserId = authData.user.id;
  }

  const { data, error } = await supabase
    .from('students')
    .insert({
      profile_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: (formData.get('phone') as string) || null,
      date_of_birth: (formData.get('date_of_birth') as string) || null,
      gender: (formData.get('gender') as string) || null,
      nationality: (formData.get('nationality') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      country: (formData.get('country') as string) || 'Kenya',
      emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
      emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
      program_id: programId,
      intake_id: (formData.get('intake_id') as string) || null,
      enrollment_date:
        (formData.get('enrollment_date') as string) ||
        new Date().toISOString().split('T')[0],
      status: (formData.get('status') as StudentStatus) || 'active',
      notes: (formData.get('notes') as string) || null,
      student_number: '',
      admission_number: '',
      lms_sync_status: 'not_synced',
    })
    .select('id, admission_number, student_number')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/dashboard/students');
  return {
    success: true,
    id: data.id,
    admissionNumber: data.admission_number ?? data.student_number,
    temporaryPassword,
    email,
    authUserId,
  };
}

export async function updateStudent(id: string, formData: FormData) {
  const supabase = await createClient();
  const newStatus = formData.get('status') as StudentStatus;

  const { data: existing, error: existingError } = await supabase
    .from('students')
    .select('status')
    .eq('id', id)
    .single();

  if (existingError) return { error: existingError.message };

  const becomingRestricted =
    isRestrictedStudentStatus(newStatus) && !isRestrictedStudentStatus(existing.status);

  if (becomingRestricted) {
    const deregistration = await deregisterStudentEnrollmentsAndFees(supabase, id);
    if ('error' in deregistration) return { error: deregistration.error };
  }

  const { error } = await supabase
    .from('students')
    .update({
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: formData.get('email') as string,
      phone: (formData.get('phone') as string) || null,
      date_of_birth: (formData.get('date_of_birth') as string) || null,
      gender: (formData.get('gender') as string) || null,
      nationality: (formData.get('nationality') as string) || null,
      address: (formData.get('address') as string) || null,
      city: (formData.get('city') as string) || null,
      country: (formData.get('country') as string) || 'Kenya',
      emergency_contact_name: (formData.get('emergency_contact_name') as string) || null,
      emergency_contact_phone: (formData.get('emergency_contact_phone') as string) || null,
      program_id: (formData.get('program_id') as string) || null,
      intake_id: (formData.get('intake_id') as string) || null,
      status: newStatus,
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/students');
  revalidatePath(`/dashboard/students/${id}`);
  revalidatePath(`/dashboard/students/${id}/fees`);
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  return { success: true };
}

export async function deleteStudent(id: string) {
  const supabase = await createClient();

  const { data: paidFees, error: paidFeesError } = await supabase
    .from('fee_payments')
    .select('id')
    .eq('student_id', id)
    .gt('amount_paid', 0)
    .limit(1);

  if (paidFeesError) return { error: paidFeesError.message };
  if (paidFees?.length) {
    return {
      error:
        'Cannot delete a student with payment history. Set their status to Withdrawn instead — fees already paid are kept for records.',
    };
  }

  const { data: pendingSubmissions, error: pendingError } = await supabase
    .from('fee_payment_submissions')
    .select('id')
    .eq('student_id', id)
    .eq('status', 'pending')
    .limit(1);

  if (pendingError) return { error: pendingError.message };
  if (pendingSubmissions?.length) {
    return {
      error:
        'Cannot delete a student with pending fee payments. Reject or approve them first, or set status to Withdrawn.',
    };
  }

  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/fees');
  return { success: true };
}
