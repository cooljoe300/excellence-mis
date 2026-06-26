'use server';

import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  getCurrentAcademicTermId,
  getProgramCourses,
  getStudentCourseIdsForTerm,
} from '@/app/actions/enrollments';

export interface UnitOption {
  id: string;
  code: string;
  name: string;
  unit_fee: number;
  credits: number;
}

function getProgramName(program: unknown): string | null {
  if (!program || typeof program !== 'object') return null;
  if (Array.isArray(program)) {
    const first = program[0];
    return first && typeof first === 'object' && 'name' in first
      ? String((first as { name: string }).name)
      : null;
  }
  return 'name' in program ? String((program as { name: string }).name) : null;
}

export async function getMyUnitEnrollmentData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, program_id, program:programs(id, name, code)')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);
  if (!student) return { needsRegistration: true as const };

  const termId = await getCurrentAcademicTermId();
  if (!termId) {
    return {
      needsRegistration: false as const,
      student,
      termId: null,
      programName: getProgramName(student.program),
      units: [] as UnitOption[],
      enrolledUnitIds: [] as string[],
      error: 'No current academic term is set. Please contact the college.',
    };
  }

  if (!student.program_id) {
    return {
      needsRegistration: false as const,
      student,
      termId,
      programName: null,
      units: [] as UnitOption[],
      enrolledUnitIds: [] as string[],
      error: 'Please select your program under My Details before registering units.',
    };
  }

  const [units, enrolledUnitIds] = await Promise.all([
    getProgramCourses(student.program_id),
    getStudentCourseIdsForTerm(student.id, termId),
  ]);

  return {
    needsRegistration: false as const,
    student,
    termId,
    programName: getProgramName(student.program),
    units: units as UnitOption[],
    enrolledUnitIds,
    error: null,
  };
}

export async function enrollMyUnits(courseIds: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be signed in.' };

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, program_id, first_name, last_name')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (studentError) return { error: studentError.message };
  if (!student) return { error: 'Complete your student registration first.' };
  if (!student.program_id) return { error: 'Select your program under My Details first.' };

  const termId = await getCurrentAcademicTermId();
  if (!termId) return { error: 'No current academic term is set. Please contact the college.' };

  const normalized = Array.from(new Set(courseIds.filter(Boolean)));

  const { data: programCourses, error: coursesError } = await supabase
    .from('courses')
    .select('id, code, name, unit_fee')
    .eq('program_id', student.program_id)
    .eq('is_active', true);

  if (coursesError) return { error: coursesError.message };

  const validCourseMap = new Map((programCourses ?? []).map((c) => [c.id as string, c]));
  const invalid = normalized.filter((id) => !validCourseMap.has(id));
  if (invalid.length > 0) {
    return { error: 'One or more selected units are not valid for your program.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('enrollments')
    .select('id, course_id, grade, score')
    .eq('student_id', student.id)
    .eq('term_id', termId);

  if (existingError) return { error: existingError.message };

  const existingByCourse = new Map((existing ?? []).map((e) => [e.course_id as string, e]));
  const desiredSet = new Set(normalized);

  const toRemove = (existing ?? [])
    .filter((e) => !desiredSet.has(e.course_id as string))
    .filter((e) => e.grade == null && e.score == null)
    .map((e) => e.course_id as string);

  const toAdd = normalized.filter((id) => !existingByCourse.has(id));

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', student.id)
      .eq('term_id', termId)
      .in('course_id', toRemove);
    if (deleteError) return { error: deleteError.message };
  }

  const newEnrollments: { id: string; course_id: string }[] = [];

  if (toAdd.length > 0) {
    const { data: inserted, error: insertError } = await supabase
      .from('enrollments')
      .insert(
        toAdd.map((courseId) => ({
          student_id: student.id,
          term_id: termId,
          course_id: courseId,
          status: 'active',
        }))
      )
      .select('id, course_id');

    if (insertError) return { error: insertError.message };
    newEnrollments.push(...(inserted ?? []));
  }

  const addedCourses = toAdd.map((id) => validCourseMap.get(id)!);
  const totalFee = addedCourses.reduce((sum, c) => sum + Number(c.unit_fee ?? 0), 0);

  let feePaymentId: string | null = null;

  if (totalFee > 0 && newEnrollments.length > 0) {
    const courseLabels = addedCourses.map((c) => `${c.code} — ${c.name}`).join(', ');
    const { data: feePayment, error: feeError } = await supabase
      .from('fee_payments')
      .insert({
        student_id: student.id,
        term_id: termId,
        amount: totalFee,
        amount_paid: 0,
        status: 'pending',
        description: `Unit registration: ${courseLabels}`,
      })
      .select('id')
      .single();

    if (feeError) return { error: feeError.message };
    feePaymentId = feePayment.id;

    const enrollmentByCourse = new Map(newEnrollments.map((e) => [e.course_id, e.id]));
    const { error: itemsError } = await supabase.from('fee_payment_items').insert(
      addedCourses.map((c) => ({
        fee_payment_id: feePayment.id,
        course_id: c.id,
        enrollment_id: enrollmentByCourse.get(c.id) ?? null,
        amount: Number(c.unit_fee ?? 0),
      }))
    );

    if (itemsError) return { error: itemsError.message };
  }

  revalidatePath('/student');
  revalidatePath('/student/enroll');

  after(() => {
    revalidatePath('/dashboard/enrollments');
    revalidatePath('/dashboard/fees');
    revalidatePath(`/dashboard/students/${student.id}`);
  });

  const selectedCourses = normalized.map((id) => validCourseMap.get(id)!);
  const selectedTotal = selectedCourses.reduce((sum, c) => sum + Number(c.unit_fee ?? 0), 0);

  return {
    success: true,
    addedCount: toAdd.length,
    removedCount: toRemove.length,
    newUnitsFee: totalFee,
    selectedTotal,
    feePaymentId,
    units: selectedCourses.map((c) => ({
      code: c.code,
      name: c.name,
      unit_fee: Number(c.unit_fee ?? 0),
    })),
  };
}

export async function getMyEnrollmentsWithFees() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!student) return null;

  const termId = await getCurrentAcademicTermId();

  let enrollmentsQuery = supabase
    .from('enrollments')
    .select('*, course:courses(id, code, name, unit_fee), term:academic_terms(name)')
    .eq('student_id', student.id)
    .order('enrolled_at', { ascending: false });

  if (termId) {
    enrollmentsQuery = enrollmentsQuery.eq('term_id', termId);
  }

  const { data: enrollments } = await enrollmentsQuery;

  const { data: fees } = await supabase
    .from('fee_payments')
    .select('*, items:fee_payment_items(*, course:courses(code, name))')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return { enrollments: enrollments ?? [], fees: fees ?? [] };
}
