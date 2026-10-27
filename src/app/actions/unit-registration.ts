'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';
import { describeDatabaseError } from '@/lib/db-errors';
import { getCurrentAcademicTermId, setStudentEnrollmentsForTerm } from '@/app/actions/enrollments';
import {
  findInvalidCurriculumUnits,
  getCurriculumCourseIds,
  getCurriculumUnitOptions,
  resolveStudentCurriculum,
  type CurriculumWithUnits,
} from '@/lib/curriculum';
import type { AcademicTerm, CurriculumUnitOption } from '@/lib/types';

type ManagerAuthResult =
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createClient>> };

async function requireManager(): Promise<ManagerAuthResult> {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin' && role !== 'staff') {
    return { error: 'You are not authorised to register student units.' };
  }

  const supabase = await createClient();
  return { supabase };
}

export interface UnitRegistrationStudentSummary {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  student_number: string;
  status: string;
  program_id: string | null;
  curriculum_id: string | null;
  current_semester: number;
  program?: { id: string; name: string; code: string } | null;
  curriculum?: { id: string; name: string; academic_year: string } | null;
}

export interface PreservedEnrollmentUnit {
  enrollment_id: string;
  course_id: string;
  code: string;
  name: string;
  credits: number;
  unit_fee: number;
  status: string;
  semester: number | null;
}

export interface UnitRegistrationContext {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    admission_number: string | null;
    student_number: string;
    status: string;
    program_id: string | null;
    program_name: string | null;
    program_code: string | null;
    intake_id: string | null;
    intake_name: string | null;
    curriculum_id: string;
    current_semester: number;
    study_mode: string | null;
    academic_year: string | null;
  };
  curriculum: {
    id: string;
    name: string;
    academic_year: string;
    version: string;
  };
  semester: number;
  requested_semester: number;
  semester_adjusted: boolean;
  semesters: number[];
  units: CurriculumUnitOption[];
  selected_course_ids: string[];
  deregistered_course_ids: string[];
  preserved_units: PreservedEnrollmentUnit[];
  other_semester_units: PreservedEnrollmentUnit[];
  termId: string | null;
  term: AcademicTerm | null;
  terms: AcademicTerm[];
  notice: string | null;
}

export async function searchStudentsForUnitRegistration(query?: string) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  let request = supabase
    .from('students')
    .select(
      `id, first_name, last_name, admission_number, student_number, status,
       program_id, curriculum_id, current_semester,
       program:programs(id, name, code),
       curriculum:programme_curricula(id, name, academic_year)`
    )
    .order('created_at', { ascending: false })
    .limit(25);

  const term = query?.trim();
  if (term) {
    request = request.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,admission_number.ilike.%${term}%,student_number.ilike.%${term}%`
    );
  }

  const { data, error } = await request;
  if (error) return { error: error.message };

  return {
    students: (data ?? []) as unknown as UnitRegistrationStudentSummary[],
  };
}

export async function getUnitRegistrationContext(
  studentId: string,
  options?: { semester?: number; termId?: string }
): Promise<UnitRegistrationContext | { error: string }> {
  try {
    return await loadUnitRegistrationContext(studentId, options);
  } catch (error) {
    return { error: describeDatabaseError(error, 'getUnitRegistrationContext') };
  }
}

async function loadUnitRegistrationContext(
  studentId: string,
  options?: { semester?: number; termId?: string }
): Promise<UnitRegistrationContext | { error: string }> {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const context = await resolveStudentCurriculum(supabase, studentId);
  if (!context) return { error: 'Student not found.' };

  const { student } = context;
  const curriculum: CurriculumWithUnits | null = context.curriculum;

  if (!curriculum) {
    return {
      error:
        'No curriculum is configured for this student’s programme. Configure the programme curriculum and units first.',
    };
  }

  if (!student.curriculum_id) {
    // Pin the resolved default curriculum so future unit registration and
    // programme history stay consistent.
    const { error: pinError } = await supabase
      .from('students')
      .update({ curriculum_id: curriculum.id })
      .eq('id', studentId);
    if (pinError) return { error: pinError.message };
  }

  const semesters = curriculum.semesters;
  if (semesters.length === 0) {
    return {
      error: `Curriculum “${curriculum.name}” has no active units. Add units to the curriculum first.`,
    };
  }

  const requestedSemester = Number(options?.semester ?? student.current_semester ?? 1);
  const semesterAdjusted = !semesters.includes(requestedSemester);
  const semester = semesterAdjusted ? semesters[0] : requestedSemester;

  const [units, termsResult, currentTermId] = await Promise.all([
    getCurriculumUnitOptions(supabase, curriculum.id, semester),
    supabase.from('academic_terms').select('*').order('start_date', { ascending: false }),
    getCurrentAcademicTermId(),
  ]);

  if (termsResult.error) return { error: termsResult.error.message };

  const terms = (termsResult.data ?? []) as AcademicTerm[];
  const termId = options?.termId || currentTermId || null;
  const term = terms.find((item) => item.id === termId) ?? null;

  let enrollments: any[] = [];
  if (termId) {
    const { data: enrollmentRows, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(
        'id, course_id, status, course:courses(id, code, name, credits, unit_fee)'
      )
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .in('status', ['active', 'pending', 'deregistered']);

    if (enrollmentError) return { error: enrollmentError.message };
    enrollments = enrollmentRows ?? [];
  }

  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const allCurriculumCourseIds = new Set(curriculum.units.map((unit) => unit.course_id));
  const courseSemesterMap = new Map(
    curriculum.units.map((unit) => [unit.course_id as string, Number(unit.semester)])
  );

  const selectedCourseIds: string[] = [];
  const deregisteredCourseIds: string[] = [];
  const preservedUnits: PreservedEnrollmentUnit[] = [];
  const otherSemesterUnits: PreservedEnrollmentUnit[] = [];

  for (const enrollment of enrollments) {
    const course = enrollment.course;
    if (!course) continue;

    const mapped: PreservedEnrollmentUnit = {
      enrollment_id: enrollment.id,
      course_id: enrollment.course_id,
      code: course.code,
      name: course.name,
      credits: Number(course.credits ?? 0),
      unit_fee: Number(course.unit_fee ?? 0),
      status: enrollment.status,
      semester: courseSemesterMap.get(enrollment.course_id as string) ?? null,
    };

    if (enrollment.status === 'deregistered') {
      if (unitsById.has(enrollment.course_id as string)) {
        deregisteredCourseIds.push(enrollment.course_id);
      }
      continue;
    }

    if (unitsById.has(enrollment.course_id as string)) {
      selectedCourseIds.push(enrollment.course_id as string);
      continue;
    }

    if (allCurriculumCourseIds.has(enrollment.course_id as string)) {
      otherSemesterUnits.push(mapped);
    } else {
      preservedUnits.push(mapped);
    }
  }

  const notices: string[] = [];
  if (semesterAdjusted) {
    notices.push(
      `Semester ${requestedSemester} has no units in this curriculum, so semester ${semester} is shown.`
    );
  }
  if (!termId) {
    notices.push('No current academic term is set. Select a term before saving units.');
  }
  if (preservedUnits.length > 0) {
    notices.push(
      'Units from a previous programme are preserved and are not part of the current curriculum.'
    );
  }

  return {
    student: {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      admission_number: student.admission_number,
      student_number: student.student_number,
      status: student.status,
      program_id: student.program_id,
      program_name: student.program?.name ?? null,
      program_code: student.program?.code ?? null,
      intake_id: student.intake_id,
      intake_name: student.intake?.name ?? null,
      curriculum_id: curriculum.id,
      current_semester: student.current_semester,
      study_mode: student.study_mode,
      academic_year: student.academic_year,
    },
    curriculum: {
      id: curriculum.id,
      name: curriculum.name,
      academic_year: curriculum.academic_year,
      version: curriculum.version,
    },
    semester,
    requested_semester: requestedSemester,
    semester_adjusted: semesterAdjusted,
    semesters,
    units,
    selected_course_ids: selectedCourseIds,
    deregistered_course_ids: deregisteredCourseIds,
    preserved_units: preservedUnits,
    other_semester_units: otherSemesterUnits,
    termId,
    term,
    terms,
    notice: notices.length > 0 ? notices.join(' ') : null,
  };
}

export async function saveUnitRegistration(input: {
  studentId: string;
  termId: string;
  semester: number;
  courseIds: string[];
}) {
  try {
    return await applyUnitRegistration(input);
  } catch (error) {
    return { error: describeDatabaseError(error, 'saveUnitRegistration') };
  }
}

async function applyUnitRegistration(input: {
  studentId: string;
  termId: string;
  semester: number;
  courseIds: string[];
}) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  if (!input.studentId) return { error: 'Select a student.' };
  if (!input.termId) return { error: 'Select an academic term.' };

  const semester = Number(input.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 20) {
    return { error: 'Select a valid semester.' };
  }

  const context = await resolveStudentCurriculum(supabase, input.studentId);
  if (!context) return { error: 'Student not found.' };
  if (!context.curriculum) {
    return {
      error:
        'No curriculum is configured for this student’s programme. Configure the curriculum and units first.',
    };
  }

  const curriculum = context.curriculum;

  if (!curriculum.semesters.includes(semester)) {
    return {
      error: `Semester ${semester} has no units in curriculum “${curriculum.name}”.`,
    };
  }

  const courseIds = Array.from(
    new Set((input.courseIds ?? []).filter(Boolean).map(String))
  );

  const invalid = await findInvalidCurriculumUnits(
    supabase,
    curriculum.id,
    semester,
    courseIds
  );

  if (invalid.length > 0) {
    const invalidLabels = invalid
      .map((id) => curriculum.units.find((unit) => unit.course_id === id))
      .filter(Boolean)
      .map((unit) => `${unit!.course?.code ?? unit!.course_id}`);

    return {
      error: `These units are not in semester ${semester} of the student’s curriculum: ${invalidLabels.join(', ') || invalid.join(', ')}.`,
    };
  }

  const removalCourseIds = await getCurriculumCourseIds(
    supabase,
    curriculum.id,
    semester
  );

  const result = await setStudentEnrollmentsForTerm(
    input.studentId,
    input.termId,
    courseIds,
    { removalCourseIds }
  );

  if ('error' in result) {
    return { error: result.error };
  }

  if (!context.student.curriculum_id) {
    await supabase
      .from('students')
      .update({ curriculum_id: curriculum.id })
      .eq('id', input.studentId);
  }

  if (context.student.current_semester !== semester) {
    await supabase
      .from('students')
      .update({ current_semester: semester })
      .eq('id', input.studentId);
  }

  revalidatePath(`/dashboard/students/${input.studentId}`);
  revalidatePath(`/dashboard/students/${input.studentId}/enrollment`);
  revalidatePath(`/dashboard/students/${input.studentId}/registration`);
  revalidatePath('/dashboard/students/unit-registration');
  revalidatePath('/dashboard/students');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student');
  revalidatePath('/student/enroll');
  revalidatePath('/student/fees');

  return {
    success: true,
    unitsRemoved: result.unitsRemoved,
    feePaymentId: result.feePaymentId,
  };
}
