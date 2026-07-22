'use server';

import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  getCurrentAcademicTermId,
  getProgramCourses,
  getStudentCourseIdsForTerm,
} from '@/app/actions/enrollments';
import {
  createFeeInvoiceForEnrollments,
  getUnbilledEnrollmentsForCourses,
} from '@/lib/enrollment-fees';

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

  let student;
  let studentError: { message: string } | null = null;

  // First try to find student by profile_id (for self-registered students)
  const { data: studentByProfile, error: profileError } = await supabase
    .from('students')
    .select('id, program_id, program:programs(id, name, code), profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (profileError) {
    studentError = profileError;
  } else {
    student = studentByProfile;
  }

  // Fallback: Try to find student by email (for admin-registered students)
  if (!student && user.email) {
    const { data: studentByEmail, error: emailError } = await supabase
      .from('students')
      .select('id, program_id, program:programs(id, name, code), profile_id')
      .eq('email', user.email)
      .maybeSingle();

    if (emailError) {
      studentError = emailError;
    } else {
      student = studentByEmail;
    }

    // Link the profile_id to the user for future queries
    if (student && !student.profile_id) {
      const { error: updateError } = await supabase
        .from('students')
        .update({ profile_id: user.id })
        .eq('id', student.id);
      
      if (updateError) {
        console.error('Failed to link student profile:', updateError);
      }
    }
  }

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

  let student;
  let studentError;

  // First try to find student by profile_id (for self-registered students)
  const { data: studentByProfile, error: profileError } = await supabase
    .from('students')
    .select('id, program_id, first_name, last_name, profile_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (profileError) {
    studentError = profileError;
  } else {
    student = studentByProfile;
  }

  // Fallback: Try to find student by email (for admin-registered students)
  if (!student && user.email) {
    const { data: studentByEmail, error: emailError } = await supabase
      .from('students')
      .select('id, program_id, first_name, last_name, profile_id')
      .eq('email', user.email)
      .maybeSingle();

    if (emailError) {
      studentError = emailError;
    } else {
      student = studentByEmail;
    }
  }

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
    .eq('term_id', termId)
    .in('status', ['active', 'pending']);

  if (existingError) return { error: existingError.message };

  const existingByCourse = new Map((existing ?? []).map((e) => [e.course_id as string, e]));
  const desiredSet = new Set(normalized);

  const toAdd = normalized.filter((id) => !existingByCourse.has(id));

  const attemptedRemoval = (existing ?? [])
    .filter((e) => !desiredSet.has(e.course_id as string))
    .map((e) => e.course_id as string);

  if (attemptedRemoval.length > 0) {
    return {
      error: 'You cannot deregister units yourself. Please contact the college administration.',
    };
  }

  if (toAdd.length === 0) {
    return { error: 'You are already registered for all selected units.' };
  }

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from('enrollments').insert(
      toAdd.map((courseId) => ({
        student_id: student.id,
        term_id: termId,
        course_id: courseId,
        status: 'active',
      }))
    );

    if (insertError) {
      // Check if it's a duplicate key error
      if (insertError.code === '23505') {
        return { error: 'You are already registered for one or more of these units.' };
      }
      return { error: insertError.message };
    }
  }

  const unbilledEnrollments = await getUnbilledEnrollmentsForCourses(
    supabase,
    student.id,
    termId,
    normalized
  );

  let feePaymentId: string | null = null;
  let totalFee = 0;

  if (unbilledEnrollments.length > 0) {
    const invoiceResult = await createFeeInvoiceForEnrollments(supabase, {
      studentId: student.id,
      termId,
      enrollments: unbilledEnrollments,
    });

    if (invoiceResult && 'error' in invoiceResult) return { error: invoiceResult.error };
    if (invoiceResult && 'feePaymentId' in invoiceResult) {
      feePaymentId = invoiceResult.feePaymentId;
      totalFee = invoiceResult.totalFee;
    }
  }

  revalidatePath('/student');
  revalidatePath('/student/enroll');
  revalidatePath('/student/fees');

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
