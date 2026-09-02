'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { EnrollmentStatus } from '@/lib/types';
import {
  createFeeInvoiceForEnrollments,
  getUnbilledEnrollmentsForCourses,
} from '@/lib/enrollment-fees';
import { adjustFeesForDroppedEnrollments } from '@/lib/student-deregistration-fees';

export async function getCurrentAcademicTermId(): Promise<string | null> {
  const supabase = await createClient();

  const { data: explicit, error: explicitError } = await supabase
    .from('academic_terms')
    .select('id')
    .eq('is_current', true)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (explicitError) return null;
  if (explicit?.id) return explicit.id;

  const today = new Date().toISOString().split('T')[0];
  const { data: activeByDate } = await supabase
    .from('academic_terms')
    .select('id')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeByDate?.id) return activeByDate.id;

  const { data: latest } = await supabase
    .from('academic_terms')
    .select('id')
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return latest?.id ?? null;
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
    .eq('term_id', termId)
    .in('status', ['active', 'pending']);

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
    .eq('term_id', termId)
    .in('status', ['active', 'pending']);

  if (existingError) return { error: existingError.message };

  const existingCourseIds = new Set((existing ?? []).map((e) => e.course_id as string));
  const desiredCourseIds = new Set(normalized);

  const toAdd = normalized.filter((id) => !existingCourseIds.has(id));
  const toRemove = (existing ?? [])
    .filter((e) => !desiredCourseIds.has(e.course_id as string))
    // Don't remove anything that already has grades/scores entered.
    .filter((e) => e.grade == null && e.score == null);

  const toRemoveIds = toRemove.map((e) => e.id as string);
  const toRemoveCourseIds = toRemove.map((e) => e.course_id as string);

  if (toRemoveIds.length > 0) {
    const feeResult = await adjustFeesForDroppedEnrollments(supabase, toRemoveIds);
    if ('error' in feeResult) return { error: feeResult.error };
  }

  if (toRemoveCourseIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .in('course_id', toRemoveCourseIds);
    if (deleteError) return { error: deleteError.message };
  }

  if (toAdd.length > 0) {
    // Remove stale dropped rows so UNIQUE(student_id, course_id, term_id) allows re-enrollment.
    await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .in('course_id', toAdd)
      .eq('status', 'dropped');

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
  revalidatePath(`/dashboard/students/${studentId}/fees`);
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student/fees');
  revalidatePath('/student');
  return {
    success: true,
    feePaymentId,
    unitsRemoved: toRemoveIds.length,
  };
}

export async function getEnrollments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, student:students(*, program:programs(*)), course:courses(*), term:academic_terms(*)')
    .order('enrolled_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getEnrollmentsWithFees() {
  const supabase = await createClient();
  
  // Get enrollments with student and program data
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('*, student:students(*, program:programs(*)), course:courses(*), term:academic_terms(*)')
    .order('enrolled_at', { ascending: false });
  
  if (error) throw new Error(error.message);
  
  // Get all unique student IDs and term IDs from enrollments
  const studentIds = [...new Set(enrollments?.map((e: any) => e.student_id) || [])];
  const termIds = [...new Set(enrollments?.map((e: any) => e.term_id) || [])];
  
  // Get all fee payments for these students in these terms
  const { data: feePayments } = await supabase
    .from('fee_payments')
    .select('student_id, term_id, amount, amount_paid, status')
    .in('student_id', studentIds)
    .in('term_id', termIds)
    .in('status', ['paid', 'partial']);
  
  // Map fee payments by student_id:term_id
  const feePaymentsByStudentTerm = new Map();
  feePayments?.forEach((fp: any) => {
    const key = `${fp.student_id}:${fp.term_id}`;
    if (!feePaymentsByStudentTerm.has(key)) {
      feePaymentsByStudentTerm.set(key, { total: 0, paid: 0 });
    }
    const studentTermFees = feePaymentsByStudentTerm.get(key);
    studentTermFees.total += Number(fp.amount || 0);
    studentTermFees.paid += Number(fp.amount_paid || 0);
  });
  
  // Enrich enrollments with fee data per term
  const enrichedEnrollments = enrollments?.map((enrollment: any) => {
    const key = `${enrollment.student_id}:${enrollment.term_id}`;
    const studentTermFees = feePaymentsByStudentTerm.get(key) || { total: 0, paid: 0 };
    const balance = Math.max(0, studentTermFees.total - studentTermFees.paid);
    
    return {
      ...enrollment,
      feesPaid: studentTermFees.paid,
      feesBalance: balance,
      totalFees: studentTermFees.total,
    };
  }) || [];
  
  return enrichedEnrollments;
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
  revalidatePath('/student/fees');
  revalidatePath('/student');
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

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('id, student_id, grade, score')
    .eq('id', id)
    .maybeSingle();

  if (enrollmentError) return { error: enrollmentError.message };
  if (!enrollment) return { error: 'Enrollment not found.' };
  if (enrollment.grade != null || enrollment.score != null) {
    return { error: 'Cannot remove an enrollment that already has grades recorded.' };
  }

  const feeResult = await adjustFeesForDroppedEnrollments(supabase, [id]);
  if ('error' in feeResult) return { error: feeResult.error };

  const { error } = await supabase.from('enrollments').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath(`/dashboard/students/${enrollment.student_id}`);
  revalidatePath(`/dashboard/students/${enrollment.student_id}/fees`);
  revalidatePath('/student/fees');
  revalidatePath('/student');
  return { success: true };
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
