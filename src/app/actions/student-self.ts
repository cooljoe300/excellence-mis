'use server';

import { after } from 'next/server';
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

export async function getStudentRegisterPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profileRes, programsRes, studentRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('programs').select('id, code, name, duration_months, tuition_fee, is_active, description, created_at, updated_at').eq('is_active', true).order('name'),
    supabase
      .from('students')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (programsRes.error) throw new Error(programsRes.error.message);
  if (studentRes.error) throw new Error(studentRes.error.message);

  const nameParts = (profileRes.data?.full_name ?? '').trim().split(/\s+/);

  return {
    programs: programsRes.data ?? [],
    existingStudent: studentRes.data,
    defaultFirstName: studentRes.data?.first_name ?? nameParts[0] ?? '',
    defaultLastName: studentRes.data?.last_name ?? nameParts.slice(1).join(' ') ?? '',
  };
}

export async function createMyStudentRecord(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

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
    .select('id, admission_number, student_number')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already registered.' };
    }
    return { error: error.message };
  }

  revalidatePath('/student');

  // Defer admin list refresh so the student doesn't wait for it
  after(() => {
    revalidatePath('/dashboard/students');
  });

  return {
    success: true,
    id: data.id as string,
    admissionNumber: data.admission_number ?? data.student_number,
  };
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
  return { success: true };
}
