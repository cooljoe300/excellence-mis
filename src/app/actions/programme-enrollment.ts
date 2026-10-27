'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';
import { describeDatabaseError } from '@/lib/db-errors';
import {
  getActiveCurriculaForProgramIds,
  type CurriculumWithUnits,
} from '@/lib/curriculum';
import type {
  Intake,
  Program,
  ProgrammeChangeHistory,
  ProgrammeChangePreview,
  ProgrammeChangeResult,
  ProgrammeCurriculum,
} from '@/lib/types';

type ManagerAuthResult =
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createClient>> };

async function requireManager(): Promise<ManagerAuthResult> {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin' && role !== 'staff') {
    return { error: 'You are not authorised to change student programmes.' };
  }

  const supabase = await createClient();
  return { supabase };
}

export interface ProgrammeEnrollmentStudent {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  student_number: string;
  email: string;
  phone: string | null;
  status: string;
  enrollment_date: string;
  program_id: string | null;
  curriculum_id: string | null;
  current_semester: number;
  study_mode: string | null;
  academic_year: string | null;
  intake_id: string | null;
  program: Program | null;
  curriculum: ProgrammeCurriculum | null;
  intake: Intake | null;
  intakes: Intake[];
}

export interface ProgrammeEnrollmentSearchRow {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  student_number: string;
  email: string;
  status: string;
  program_id: string | null;
  program: { id: string; name: string; code: string } | null;
}

export interface ProgrammeEnrollmentOption {
  program: Program;
  curricula: CurriculumWithUnits[];
  default_curriculum: CurriculumWithUnits | null;
  semesters: number[];
  has_active_units: boolean;
}

export interface ProgrammeEnrollmentContext {
  student: ProgrammeEnrollmentStudent;
  programmes: ProgrammeEnrollmentOption[];
  intakes: Intake[];
}

export async function searchStudentsForEnrollment(query?: string) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  let request = supabase
    .from('students')
    .select(
      'id, first_name, last_name, admission_number, student_number, email, status, program_id, curriculum_id, current_semester, program:programs(id, name, code)'
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

  const students: ProgrammeEnrollmentSearchRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    admission_number: row.admission_number,
    student_number: row.student_number,
    email: row.email,
    status: row.status,
    program_id: row.program_id,
    program: Array.isArray(row.program) ? (row.program[0] ?? null) : (row.program ?? null),
  }));

  return { students };
}

export async function getProgrammeEnrollmentContext(
  studentId: string
): Promise<ProgrammeEnrollmentContext | { error: string }> {
  try {
    return await loadProgrammeEnrollmentContext(studentId);
  } catch (error) {
    return { error: describeDatabaseError(error, 'getProgrammeEnrollmentContext') };
  }
}

async function loadProgrammeEnrollmentContext(
  studentId: string
): Promise<ProgrammeEnrollmentContext | { error: string }> {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const [studentResult, programsResult, intakesResult] = await Promise.all([
    supabase
      .from('students')
      .select(
        `id, first_name, last_name, admission_number, student_number, email, phone, status,
         enrollment_date, program_id, curriculum_id, current_semester, study_mode, academic_year, intake_id,
         program:programs(*),
         curriculum:programme_curricula(id, program_id, name, academic_year, version, is_active, effective_from, effective_to, created_at, updated_at),
         intake:intakes(*),
         intakes:student_intakes(is_primary, intake:intakes(*))`
      )
      .eq('id', studentId)
      .maybeSingle(),
    supabase.from('programs').select('*').eq('is_active', true).order('name'),
    supabase
      .from('intakes')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: false }),
  ]);

  if (studentResult.error) return { error: studentResult.error.message };
  if (!studentResult.data) return { error: 'Student not found.' };
  if (programsResult.error) return { error: programsResult.error.message };
  if (intakesResult.error) return { error: intakesResult.error.message };

  const rawStudent = studentResult.data as any;
  const student: ProgrammeEnrollmentStudent = {
    ...rawStudent,
    program: rawStudent.program ?? null,
    curriculum: rawStudent.curriculum ?? null,
    intake: rawStudent.intake ?? null,
    intakes: (rawStudent.intakes ?? []).map((row: any) => row.intake).filter(Boolean),
  };

  const programs = (programsResult.data ?? []) as Program[];
  const curricula = await getActiveCurriculaForProgramIds(
    supabase,
    programs.map((program) => program.id)
  );

  const curriculaByProgram = new Map<string, CurriculumWithUnits[]>();
  for (const curriculum of curricula) {
    const list = curriculaByProgram.get(curriculum.program_id) ?? [];
    list.push(curriculum);
    curriculaByProgram.set(curriculum.program_id, list);
  }

  const options: ProgrammeEnrollmentOption[] = programs.map((program) => {
    const programCurricula = curriculaByProgram.get(program.id) ?? [];
    const defaultCurriculum = programCurricula[0] ?? null;
    const semesters = Array.from(
      new Set<number>(programCurricula.flatMap((curriculum) => curriculum.semesters))
    ).sort((a, b) => a - b);

    return {
      program,
      curricula: programCurricula,
      default_curriculum: defaultCurriculum,
      semesters,
      has_active_units: Boolean(defaultCurriculum && defaultCurriculum.unit_count > 0),
    };
  });

  return {
    student,
    programmes: options,
    intakes: (intakesResult.data ?? []) as Intake[],
  };
}

export async function previewProgrammeChange(input: {
  studentId: string;
  newProgramId: string;
  newIntakeId?: string | null;
  newStudyMode?: string | null;
  newCurriculumId?: string | null;
}) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  if (!input.studentId) return { error: 'Select a student.' };
  if (!input.newProgramId) return { error: 'Select the new programme.' };

  const { supabase } = auth;

  const { data, error } = await supabase.rpc(
    'preview_student_programme_admission_number',
    {
      p_student_id: input.studentId,
      p_new_program_id: input.newProgramId,
      p_new_intake_id: input.newIntakeId || null,
      p_new_study_mode: input.newStudyMode || null,
      p_new_curriculum_id: input.newCurriculumId || null,
    }
  );

  if (error) return { error: error.message };
  if (!data) return { error: 'The preview could not be generated.' };

  return { preview: data as ProgrammeChangePreview };
}

export async function changeStudentProgramme(input: {
  studentId: string;
  newProgramId: string;
  newIntakeId?: string | null;
  newStudyMode?: string | null;
  newCurriculumId?: string | null;
  newSemester: number;
  reason: string;
}) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  if (!input.studentId) return { error: 'Select a student.' };
  if (!input.newProgramId) return { error: 'Select the new programme.' };
  if (!input.newSemester) return { error: 'Select the semester for the new programme.' };
  if (!input.reason || input.reason.trim().length < 3) {
    return { error: 'Provide a reason for the programme change.' };
  }

  const { supabase } = auth;

  const { data, error } = await supabase.rpc('change_student_programme', {
    p_student_id: input.studentId,
    p_new_program_id: input.newProgramId,
    p_new_intake_id: input.newIntakeId || null,
    p_new_study_mode: input.newStudyMode || null,
    p_new_curriculum_id: input.newCurriculumId || null,
    p_new_semester: input.newSemester,
    p_reason: input.reason.trim(),
  });

  if (error) return { error: error.message };
  if (!data) return { error: 'The programme change did not complete.' };

  const studentId = input.studentId;

  revalidatePath('/dashboard/students');
  revalidatePath(`/dashboard/students/${studentId}`);
  revalidatePath(`/dashboard/students/${studentId}/enrollment`);
  revalidatePath(`/dashboard/students/${studentId}/registration`);
  revalidatePath('/dashboard/students/programme-enrollment');
  revalidatePath('/dashboard/students/unit-registration');
  revalidatePath('/dashboard/enrollments');
  revalidatePath('/dashboard/fees');
  revalidatePath('/student');
  revalidatePath('/student/enroll');
  revalidatePath('/student/fees');

  return { success: true, result: data as ProgrammeChangeResult };
}

export async function getProgrammeChangeHistory(studentId?: string) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  let request = supabase
    .from('programme_change_history')
    .select(
      '*, student:students(id, first_name, last_name, admission_number, student_number)'
    )
    .order('changed_at', { ascending: false })
    .limit(studentId ? 100 : 15);

  if (studentId) request = request.eq('student_id', studentId);

  const { data, error } = await request;
  if (error) return { error: error.message };

  return {
    history: (data ?? []) as (ProgrammeChangeHistory & {
      student?: {
        id: string;
        first_name: string;
        last_name: string;
        admission_number: string | null;
        student_number: string;
      } | null;
    })[],
  };
}
