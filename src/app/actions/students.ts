'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { StudentStatus } from '@/lib/types';

export async function getStudents(search?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('students')
    .select('*, program:programs(*)')
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
    .select('*, program:programs(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createStudent(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .insert({
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
  };
}

export async function updateStudent(id: string, formData: FormData) {
  const supabase = await createClient();
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
      status: formData.get('status') as StudentStatus,
      notes: (formData.get('notes') as string) || null,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/students');
  revalidatePath(`/dashboard/students/${id}`);
  return { success: true };
}

export async function deleteStudent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/students');
  return { success: true };
}
