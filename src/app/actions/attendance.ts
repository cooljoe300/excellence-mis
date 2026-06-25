'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { AttendanceStatus } from '@/lib/types';

export async function getAttendance(date?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('attendance')
    .select('*, enrollment:enrollments(*, student:students(*), course:courses(*))')
    .order('date', { ascending: false });

  if (date) {
    query = query.eq('date', date);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function recordAttendance(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('attendance').upsert(
    {
      enrollment_id: formData.get('enrollment_id') as string,
      date: formData.get('date') as string,
      status: formData.get('status') as AttendanceStatus,
      notes: (formData.get('notes') as string) || null,
      recorded_by: user?.id ?? null,
    },
    { onConflict: 'enrollment_id,date' }
  );
  if (error) return { error: error.message };
  revalidatePath('/dashboard/attendance');
  return { success: true };
}
