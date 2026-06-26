'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { EnrollmentStatus } from '@/lib/types';
import {
  createFeeInvoiceForEnrollments,
  getUnbilledEnrollmentsForCourses,
} from '@/lib/enrollment-fees';

export async function getCurrentAcademicTermId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('academic_terms')
    .select('id')
    .eq('is_current', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.id ?? null;
}

export async function getProgramCourses(programId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, code, name, unit_fee, credits')
    .eq('program_id', programId)
    .eq('is_active', true)
    .order('name');

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getStudentCourseIdsForTerm(studentId: string, termId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('term_id', termId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.course_id as string);
}

export async function setStudentEnrollmentsForTerm(
  studentId: string,
  termId: string,
  courseIds: string[]
) {
  const supabase = await createClient();
  const normalized = Array.from(new Set(courseIds.filter(Boolean)));

  const { data: existing, error: existingError } = await supabase
    .from('enrollments')
    .select('id, course_id, grade, score')
    .eq('student_id', studentId)
    .eq('term_id', termId);

  if (existingError) return { error: existingError.message };

  const existingCourseIds = new Set((existing ?? []).map((e) => e.course_id as string));
  const desiredCourseIds = new Set(normalized);

  const toAdd = normalized.filter((id) => !existingCourseIds.has(id));
  const toRemove = (existing ?? [])
    .filter((e) => !desiredCourseIds.has(e.course_id as string))
    // Don't remove anything that already has grades/scores entered.
    .filter((e) => e.grade == null && e.score == null)
    .map((e) => e.course_id as string);

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .in('course_id', toRemove);
    if (deleteError) return { error: deleteError.message };
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from('enrollments').insert(
      toAdd.map((courseId) => ({
        student_id: studentId,
        term_id: termId,
        course_id: courseId,
        status: 'active' satisfies EnrollmentStatus,
      }))
    );
    if (insertError) return { error: insertError.message };
  }

  const unbilledEnrollments = await getUnbilledEnrollmentsForCourses(
    supabase,
    studentId,
    termId,
    normalized
  );

  let feePaymentId: string | null = null;

  if (unbilledEnrollments.length > 0) {
    const invoiceResult = await createFeeInvoiceForEnrollments(supabase, {
      studentId,
      termId,
      enrollments: unbilledEnrollments,
    });

    if (invoiceResult && 'error' in invoiceResult) return { error: invoiceResult.error };
    if (invoiceResult && 'feePaymentId' in invoiceResult) {
      feePaymentId = invoiceResult.feePaymentId;
    }
  }

  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  return { success: true, feePaymentId };
}

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
  const studentId = formData.get('student_id') as string;
  const courseId = formData.get('course_id') as string;
  const termId = formData.get('term_id') as string;

  const { error } = await supabase.from('enrollments').insert({
    student_id: studentId,
    course_id: courseId,
    term_id: termId,
    status: (formData.get('status') as EnrollmentStatus) || 'active',
    grade: (formData.get('grade') as string) || null,
    score: formData.get('score') ? parseFloat(formData.get('score') as string) : null,
  });
  if (error) return { error: error.message };

  const unbilledEnrollments = await getUnbilledEnrollmentsForCourses(
    supabase,
    studentId,
    termId,
    [courseId]
  );

  if (unbilledEnrollments.length > 0) {
    const invoiceResult = await createFeeInvoiceForEnrollments(supabase, {
      studentId,
      termId,
      enrollments: unbilledEnrollments,
    });
    if (invoiceResult && 'error' in invoiceResult) return { error: invoiceResult.error };
  }

  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
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

export async function getEnrollmentsForStudent(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, course:courses(*), term:academic_terms(*)')
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
