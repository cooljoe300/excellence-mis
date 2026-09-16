'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit-logger';

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
  const name = formData.get('name') as string;
  const code = (formData.get('code') as string).trim();
  const admissionPrefix =
    (formData.get('admission_prefix') as string)?.trim().toUpperCase() || code.toUpperCase();

  const { data, error } = await supabase.from('programs').insert({
    name,
    code,
    admission_prefix: admissionPrefix,
    description: (formData.get('description') as string) || null,
    duration_months: parseInt(formData.get('duration_months') as string) || 12,
    tuition_fee: parseFloat(formData.get('tuition_fee') as string) || 0,
    is_active: formData.get('is_active') === 'true',
  }).select('id').single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/programs');
  revalidatePath('/dashboard/settings');

  // Log audit action
  await logAudit({
    action: 'create',
    module: 'programs',
    entityType: 'program',
    entityId: data.id,
    entityName: `${code}: ${name}`,
    details: `Program created: ${code} - ${name}`,
    newValue: { name, code },
  });

  return { success: true };
}

export async function updateProgram(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const code = (formData.get('code') as string).trim();
  const admissionPrefix =
    (formData.get('admission_prefix') as string)?.trim().toUpperCase() || code.toUpperCase();

  // Get existing program for audit log
  const { data: existing } = await supabase
    .from('programs')
    .select('name, code')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('programs')
    .update({
      name,
      code,
      admission_prefix: admissionPrefix,
      description: (formData.get('description') as string) || null,
      duration_months: parseInt(formData.get('duration_months') as string) || 12,
      tuition_fee: parseFloat(formData.get('tuition_fee') as string) || 0,
      is_active: formData.get('is_active') === 'true',
    })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/programs');
  revalidatePath('/dashboard/settings');

  // Log audit action
  await logAudit({
    action: 'update',
    module: 'programs',
    entityType: 'program',
    entityId: id,
    entityName: `${code}: ${name}`,
    details: `Program updated: ${existing?.code}: ${existing?.name} → ${code}: ${name}`,
    previousValue: existing ? { name: existing.name, code: existing.code } : null,
    newValue: { name, code },
  });

  return { success: true };
}

export async function deleteProgram(id: string) {
  const supabase = await createClient();

  // Get existing program for audit log
  const { data: existing } = await supabase
    .from('programs')
    .select('name, code')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('programs').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/programs');

  // Log audit action
  await logAudit({
    action: 'delete',
    module: 'programs',
    entityType: 'program',
    entityId: id,
    entityName: existing ? `${existing.code}: ${existing.name}` : 'Unknown program',
    details: `Program deleted: ${existing?.code} - ${existing?.name}`,
    previousValue: existing,
  });

  return { success: true };
}
