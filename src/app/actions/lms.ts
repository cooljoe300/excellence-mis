'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  createMoodleUser,
  generateLmsUsername,
  generateTemporaryPassword,
} from '@/lib/moodle';

export async function importStudentToLms(studentId: string) {
  const supabase = await createClient();

  const { data: student, error } = await supabase
    .from('students')
    .select('*, program:programs(name, code)')
    .eq('id', studentId)
    .single();

  if (error || !student) {
    return { error: 'Student not found' };
  }

  if (student.lms_sync_status === 'synced' && student.lms_user_id) {
    return {
      error: 'Student is already imported to LMS',
      username: student.lms_username,
    };
  }

  const admissionNumber = student.admission_number ?? student.student_number;
  const username = generateLmsUsername(admissionNumber);
  const password = generateTemporaryPassword();

  try {
    const result = await createMoodleUser({
      username,
      password,
      firstname: student.first_name,
      lastname: student.last_name,
      email: student.email,
      idnumber: admissionNumber,
    });

    const { error: updateError } = await supabase
      .from('students')
      .update({
        lms_username: result.username,
        lms_user_id: String(result.id),
        lms_sync_status: 'synced',
        lms_synced_at: new Date().toISOString(),
        lms_sync_error: null,
      })
      .eq('id', studentId);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath(`/dashboard/students/${studentId}`);
    revalidatePath('/dashboard/students');

    return {
      success: true,
      username: result.username,
      temporaryPassword: password,
      lmsUrl: process.env.MOODLE_URL ?? 'https://lms.excellenceonlinecollege.com',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LMS import failed';

    await supabase
      .from('students')
      .update({
        lms_sync_status: 'failed',
        lms_sync_error: message,
      })
      .eq('id', studentId);

    revalidatePath(`/dashboard/students/${studentId}`);
    return { error: message };
  }
}
