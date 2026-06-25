'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { StudentStatus } from '@/lib/types';

export async function getMyStudentRecord() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('students')
    .select('*, program:programs(*)')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function createMyStudentRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  // Prevent duplicates
  const existing = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (existing.data?.id) return { error: 'You have already registered.' };

  const { data, error } = await supabase
    .from('students')
    .insert({
      profile_id: user.id,
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      email: user.email ?? (formData.get('email') as string),
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
      enrollment_date:
        (formData.get('enrollment_date') as string) ||
        new Date().toISOString().split('T')[0],
      status: (formData.get('status') as StudentStatus) || 'active',
      notes: (formData.get('notes') as string) || null,
      student_number: '',
      admission_number: '',
      lms_sync_status: 'not_synced',
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/students');
  revalidatePath('/student');
  return { success: true, id: data.id as string };
}

export async function updateMyStudentRecord(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { error } = await supabase
    .from('students')
    .update({
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
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
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', studentId)
    .eq('profile_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/student');
  revalidatePath(`/dashboard/students/${studentId}`);
  return { success: true };
}

