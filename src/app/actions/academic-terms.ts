'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAcademicTerms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function clearCurrentTerm(supabase: Awaited<ReturnType<typeof createClient>>, exceptId?: string) {
  let query = supabase.from('academic_terms').update({ is_current: false });
  if (exceptId) query = query.neq('id', exceptId);
  await query;
}

export async function createAcademicTerm(formData: FormData) {
  const supabase = await createClient();
  const isCurrent = formData.get('is_current') === 'true';

  if (isCurrent) {
    await clearCurrentTerm(supabase);
  }

  const { error } = await supabase.from('academic_terms').insert({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    is_current: isCurrent,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/semesters');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/enroll');
  revalidatePath('/student');
  return { success: true };
}

export async function updateAcademicTerm(id: string, formData: FormData) {
  const supabase = await createClient();
  const isCurrent = formData.get('is_current') === 'true';

  if (isCurrent) {
    await clearCurrentTerm(supabase, id);
  }

  const { error } = await supabase
    .from('academic_terms')
    .update({
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      is_current: isCurrent,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/semesters');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/enroll');
  revalidatePath('/student');
  return { success: true };
}

export async function deleteAcademicTerm(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('academic_terms').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/semesters');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/enroll');
  return { success: true };
}

export async function setCurrentAcademicTerm(id: string) {
  const supabase = await createClient();
  await clearCurrentTerm(supabase, id);
  const { error } = await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/semesters');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/enroll');
  revalidatePath('/student');
  return { success: true };
}
