import type { SupabaseClient } from '@supabase/supabase-js';

export interface UnbilledEnrollment {
  enrollmentId: string;
  courseId: string;
  code: string;
  name: string;
  unitFee: number;
}

function parseCourse(course: unknown): { code: string; name: string; unit_fee: number } | null {
  if (!course || typeof course !== 'object') return null;
  const c = Array.isArray(course) ? course[0] : course;
  if (!c || typeof c !== 'object') return null;
  const row = c as { code?: string; name?: string; unit_fee?: number };
  if (!row.code || !row.name) return null;
  return { code: row.code, name: row.name, unit_fee: Number(row.unit_fee ?? 0) };
}

export async function getUnbilledEnrollmentsForCourses(
  supabase: SupabaseClient,
  studentId: string,
  termId: string,
  courseIds: string[]
): Promise<UnbilledEnrollment[]> {
  if (courseIds.length === 0) return [];

  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, course_id, course:courses(code, name, unit_fee)')
    .eq('student_id', studentId)
    .eq('term_id', termId)
    .in('course_id', courseIds);

  if (error || !enrollments?.length) return [];

  const enrollmentIds = enrollments.map((e) => e.id as string);
  const { data: billedItems } = await supabase
    .from('fee_payment_items')
    .select('enrollment_id')
    .in('enrollment_id', enrollmentIds);

  const billedIds = new Set(
    (billedItems ?? []).map((i) => i.enrollment_id as string).filter(Boolean)
  );

  const unbilled: UnbilledEnrollment[] = [];

  for (const enrollment of enrollments) {
    if (billedIds.has(enrollment.id as string)) continue;

    const course = parseCourse(enrollment.course);
    if (!course) continue;

    const unitFee = Number(course.unit_fee ?? 0);
    if (unitFee <= 0) continue;

    unbilled.push({
      enrollmentId: enrollment.id as string,
      courseId: enrollment.course_id as string,
      code: course.code,
      name: course.name,
      unitFee,
    });
  }

  return unbilled;
}

export async function createFeeInvoiceForEnrollments(
  supabase: SupabaseClient,
  params: {
    studentId: string;
    termId: string;
    enrollments: UnbilledEnrollment[];
    descriptionPrefix?: string;
  }
): Promise<{ feePaymentId: string; totalFee: number } | { error: string } | null> {
  const { studentId, termId, enrollments, descriptionPrefix = 'Unit registration' } = params;

  if (enrollments.length === 0) return null;

  const totalFee = enrollments.reduce((sum, e) => sum + e.unitFee, 0);
  if (totalFee <= 0) return null;

  const courseLabels = enrollments.map((e) => `${e.code} — ${e.name}`).join(', ');

  const { data: feePayment, error: feeError } = await supabase
    .from('fee_payments')
    .insert({
      student_id: studentId,
      term_id: termId,
      amount: totalFee,
      amount_paid: 0,
      status: 'pending',
      description: `${descriptionPrefix}: ${courseLabels}`,
    })
    .select('id')
    .single();

  if (feeError) return { error: feeError.message };

  const { error: itemsError } = await supabase.from('fee_payment_items').insert(
    enrollments.map((e) => ({
      fee_payment_id: feePayment.id,
      course_id: e.courseId,
      enrollment_id: e.enrollmentId,
      amount: e.unitFee,
    }))
  );

  if (itemsError) return { error: itemsError.message };

  return { feePaymentId: feePayment.id as string, totalFee };
}
