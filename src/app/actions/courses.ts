'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit-logger';

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
  const name = formData.get('name') as string;
  const code = formData.get('code') as string;

  const { data, error } = await supabase.from('courses').insert({
    name,
    code,
    description: (formData.get('description') as string) || null,
    program_id: (formData.get('program_id') as string) || null,
    credits: parseInt(formData.get('credits') as string) || 3,
    unit_fee: parseFloat(formData.get('unit_fee') as string) || 0,
    instructor_id: (formData.get('instructor_id') as string) || null,
    is_active: formData.get('is_active') !== 'false',
  }).select('id').single();

  if (error) return { error: error.message };

  revalidatePath('/dashboard/courses');

  // Log audit action
  await logAudit({
    action: 'create',
    module: 'courses',
    entityType: 'course',
    entityId: data.id,
    entityName: `${code}: ${name}`,
    details: `Course created: ${code} - ${name}`,
    newValue: { name, code },
  });

  return { success: true };
}

export async function updateCourse(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const code = formData.get('code') as string;

  // Get existing course for audit log
  const { data: existing } = await supabase
    .from('courses')
    .select('name, code')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('courses')
    .update({
      name,
      code,
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

  // Log audit action
  await logAudit({
    action: 'update',
    module: 'courses',
    entityType: 'course',
    entityId: id,
    entityName: `${code}: ${name}`,
    details: `Course updated: ${existing?.code}: ${existing?.name} → ${code}: ${name}`,
    previousValue: existing ? { name: existing.name, code: existing.code } : null,
    newValue: { name, code },
  });

  return { success: true };
}

export async function deleteCourse(id: string) {
  const supabase = await createClient();

  // Get existing course for audit log
  const { data: existing } = await supabase
    .from('courses')
    .select('name, code')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/courses');

  // Log audit action
  await logAudit({
    action: 'delete',
    module: 'courses',
    entityType: 'course',
    entityId: id,
    entityName: existing ? `${existing.code}: ${existing.name}` : 'Unknown course',
    details: `Course deleted: ${existing?.code} - ${existing?.name}`,
    previousValue: existing,
  });

  return { success: true };
}
