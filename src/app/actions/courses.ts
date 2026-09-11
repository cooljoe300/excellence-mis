'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPrograms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .eq('is_active', true)
    .order('name');
  
  if (error) throw new Error(error.message);
  return data;
}

export async function getCourses(programId?: string | undefined) {
  const supabase = await createClient();
  let query = supabase
    .from('courses')
    .select('*, program:programs(*), instructor:profiles(*)')
    .eq('is_active', true)
    .order('name');
  
  if (programId) {
    query = query.eq('program_id', programId);
  }
  
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function createCourse(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('courses').insert({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    description: (formData.get('description') as string) || null,
    program_id: (formData.get('program_id') as string) || null,
    credits: parseInt(formData.get('credits') as string) || 3,
    unit_fee: parseFloat(formData.get('unit_fee') as string) || 0,
    instructor_id: (formData.get('instructor_id') as string) || null,
    is_active: formData.get('is_active') !== 'false',
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/courses');
  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('courses')
    .update({
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: (formData.get('description') as string) || null,
      program_id: (formData.get('program_id') as string) || null,
      credits: parseInt(formData.get('credits') as string) || 3,
      unit_fee: parseFloat(formData.get('unit_fee') as string) || 0,
      instructor_id: (formData.get('instructor_id') as string) || null,
      is_active: formData.get('is_active') !== 'false',
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/courses');
  return { success: true };
}

export async function deleteCourse(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/courses');
  return { success: true };
}
