'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { EnrollmentStatus } from '@/lib/types';

export async function getEnrollments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, student:students(*), course:courses(*), term:academic_terms(*)')
    .order('enrolled_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createEnrollment(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('enrollments').insert({
    student_id: formData.get('student_id') as string,
    course_id: formData.get('course_id') as string,
    term_id: formData.get('term_id') as string,
    status: (formData.get('status') as EnrollmentStatus) || 'active',
    grade: (formData.get('grade') as string) || null,
    score: formData.get('score') ? parseFloat(formData.get('score') as string) : null,
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/enrollments');
  return { success: true };
}

export async function updateEnrollment(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('enrollments')
    .update({
      status: formData.get('status') as EnrollmentStatus,
      grade: (formData.get('grade') as string) || null,
      score: formData.get('score') ? parseFloat(formData.get('score') as string) : null,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/enrollments');
  return { success: true };
}

export async function deleteEnrollment(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('enrollments').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/enrollments');
  return { success: true };
}

export async function getAcademicTerms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
