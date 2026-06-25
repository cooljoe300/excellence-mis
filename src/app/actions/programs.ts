'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getPrograms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('programs')
    .select('*')
    .order('name');
  if (error) throw new Error(error.message);
  return data;
}

export async function createProgram(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from('programs').insert({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    description: (formData.get('description') as string) || null,
    duration_months: parseInt(formData.get('duration_months') as string) || 12,
    tuition_fee: parseFloat(formData.get('tuition_fee') as string) || 0,
    is_active: formData.get('is_active') === 'true',
  });
  if (error) return { error: error.message };
  revalidatePath('/dashboard/programs');
  return { success: true };
}

export async function updateProgram(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('programs')
    .update({
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: (formData.get('description') as string) || null,
      duration_months: parseInt(formData.get('duration_months') as string) || 12,
      tuition_fee: parseFloat(formData.get('tuition_fee') as string) || 0,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/programs');
  return { success: true };
}

export async function deleteProgram(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/programs');
  return { success: true };
}
