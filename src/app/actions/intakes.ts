'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getIntakes() {
  const supabase = await createClient();
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

  const { error } = await supabase.from('intakes').insert({
    name: formData.get('name') as string,
    code: formData.get('code') as string,
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    is_current: isCurrent,
    is_active: formData.get('is_active') !== 'false',
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard/intakes');
  revalidatePath('/dashboard/students');
  return { success: true };
}

export async function updateIntake(id: string, formData: FormData) {
  const supabase = await createClient();
  const isCurrent = formData.get('is_current') === 'true';

  if (isCurrent) {
    await clearCurrentIntake(supabase, id);
  }

  const { error } = await supabase
    .from('intakes')
    .update({
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      start_date: formData.get('start_date') as string,
      end_date: formData.get('end_date') as string,
      is_current: isCurrent,
      is_active: formData.get('is_active') !== 'false',
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/intakes');
  revalidatePath('/dashboard/students');
  return { success: true };
}

export async function deleteIntake(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('intakes').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/intakes');
  revalidatePath('/dashboard/students');
  return { success: true };
}
