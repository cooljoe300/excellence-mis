'use server';

import { createClient } from '@/lib/supabase/server';
import { academicYearFromDate } from '@/lib/academic-period';
import { revalidatePath } from 'next/cache';

function intakePayload(formData: FormData) {
  const startDate = formData.get('start_date') as string;
  const termId = ((formData.get('term_id') as string) || '').trim() || null;
  return {
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    start_date: startDate,
    end_date: formData.get('end_date') as string,
    is_current: formData.get('is_current') === 'true',
    is_active: formData.get('is_active') !== 'false',
    academic_year: academicYearFromDate(startDate) || null,
    term_id: termId,
  };
}

export async function getIntakes() {
  const supabase = await createClient();
  const withTerm = await supabase
    .from('intakes')
    .select('*, term:academic_terms(*)')
    .order('start_date', { ascending: false });
  if (!withTerm.error) return withTerm.data ?? [];

  const { data, error } = await supabase
    .from('intakes')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function clearCurrentIntake(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exceptId?: string
) {
  let query = supabase.from('intakes').update({ is_current: false });
  if (exceptId) query = query.neq('id', exceptId);
  await query;
}

export async function createIntake(formData: FormData) {
  const supabase = await createClient();
  const isCurrent = formData.get('is_current') === 'true';

  if (isCurrent) {
    await clearCurrentIntake(supabase);
  }

  const payload = intakePayload(formData);
  if (isCurrent) {
    payload.is_current = true;
  }

  const { error } = await supabase.from('intakes').insert(payload);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/intakes');
  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/timetable');
  return { success: true };
}

export async function updateIntake(id: string, formData: FormData) {
  const supabase = await createClient();
  const isCurrent = formData.get('is_current') === 'true';

  if (isCurrent) {
    await clearCurrentIntake(supabase, id);
  }

  const payload = intakePayload(formData);
  payload.is_current = isCurrent;

  const { error } = await supabase
    .from('intakes')
    .update(payload)
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/intakes');
  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/timetable');
  return { success: true };
}

export async function deleteIntake(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('intakes').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/intakes');
  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/timetable');
  return { success: true };
}
