'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';
import { logAudit } from '@/lib/audit-logger';
import { describeDatabaseError } from '@/lib/db-errors';
import {
  getCurriculaForProgramIds,
  getCurriculumUnitOptions,
  resolveDefaultCurriculum,
} from '@/lib/curriculum';

type ManagerAuthResult =
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string | undefined };

async function requireManager(): Promise<ManagerAuthResult> {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin' && role !== 'staff') {
    return { error: 'You are not authorised to manage curriculum configuration.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();

  return { supabase, userId: user?.id as string | undefined };
}

function refreshCurriculumPaths() {
  revalidatePath('/dashboard/curriculum');
  revalidatePath('/dashboard/programs');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/students/programme-enrollment');
  revalidatePath('/dashboard/students/unit-registration');
}

export async function getCurriculumConfiguration() {
  try {
    return await loadCurriculumConfiguration();
  } catch (error) {
    return { error: describeDatabaseError(error, 'getCurriculumConfiguration') };
  }
}

async function loadCurriculumConfiguration() {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const [programsResult, coursesResult] = await Promise.all([
    supabase
      .from('programs')
      .select('id, name, code, admission_prefix, admission_number_format, admission_sequence_start, program_type, study_modes, campus, is_active')
      .order('name'),
    supabase
      .from('courses')
      .select('id, program_id, code, name, credits, unit_fee, is_active')
      .order('code'),
  ]);

  if (programsResult.error) return { error: programsResult.error.message };
  if (coursesResult.error) return { error: coursesResult.error.message };

  const programs = programsResult.data ?? [];
  const curricula = await getCurriculaForProgramIds(
    supabase,
    programs.map((p) => p.id as string),
    false
  );

  return {
    programs,
    curricula,
    courses: coursesResult.data ?? [],
  };
}

/**
 * Units for the programme's default (newest active) curriculum. Used when an
 * administrator registers a new student before a curriculum is pinned, and by
 * any screen that only knows the programme id. No programme codes or unit
 * lists are hard-coded.
 */
export async function getDefaultCurriculumUnits(
  programId: string,
  semester?: number
) {
  try {
    return await loadDefaultCurriculumUnits(programId, semester);
  } catch (error) {
    return { error: describeDatabaseError(error, 'getDefaultCurriculumUnits') };
  }
}

async function loadDefaultCurriculumUnits(
  programId: string,
  semester?: number
) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  if (!programId) return { error: 'Select a programme first.' };

  const curriculum = await resolveDefaultCurriculum(supabase, programId);
  if (!curriculum) {
    return {
      error:
        'No curriculum is configured for this programme. Configure the programme curriculum and units first.',
    };
  }
  if (curriculum.semesters.length === 0) {
    return {
      error: `Curriculum “${curriculum.name}” has no active units. Add units to the curriculum first.`,
    };
  }

  const requested = Number(semester);
  const resolvedSemester =
    Number.isFinite(requested) && curriculum.semesters.includes(requested)
      ? requested
      : curriculum.semesters[0];

  const units = await getCurriculumUnitOptions(supabase, curriculum.id, resolvedSemester);

  return {
    curriculum: {
      id: curriculum.id,
      name: curriculum.name,
      academic_year: curriculum.academic_year,
      version: curriculum.version,
    },
    semester: resolvedSemester,
    semesters: curriculum.semesters,
    units,
  };
}

export async function createCurriculum(input: {
  program_id: string;
  name: string;
  academic_year: string;
  version?: string;
  effective_from?: string | null;
  effective_to?: string | null;
  is_active?: boolean;
}) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase, userId } = auth;
  const programId = input.program_id?.trim();
  const name = input.name?.trim();
  const academicYear = input.academic_year?.trim();
  const version = input.version?.trim() || 'v1';

  if (!programId) return { error: 'Select a programme for this curriculum.' };
  if (!name) return { error: 'Enter a curriculum name.' };
  if (!academicYear) return { error: 'Enter the academic year (e.g. 2026/2027).' };

  const { data, error } = await supabase
    .from('programme_curricula')
    .insert({
      program_id: programId,
      name,
      academic_year: academicYear,
      version,
      is_active: input.is_active ?? true,
      effective_from: input.effective_from || null,
      effective_to: input.effective_to || null,
      created_by: userId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return {
        error:
          'A curriculum with this academic year and version already exists for the programme.',
      };
    }
    return { error: error.message };
  }

  await logAudit({
    action: 'create',
    module: 'curriculum',
    entityType: 'programme_curriculum',
    entityId: data.id,
    entityName: `${name} (${academicYear} ${version})`,
    details: 'Curriculum created',
    newValue: data,
  });

  refreshCurriculumPaths();
  return { success: true, curriculum: data };
}

export async function updateCurriculum(
  id: string,
  input: {
    name?: string;
    academic_year?: string;
    version?: string;
    effective_from?: string | null;
    effective_to?: string | null;
    is_active?: boolean;
  }
) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const { data: existing, error: existingError } = await supabase
    .from('programme_curricula')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Curriculum not found.' };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name !== undefined) {
    if (!input.name.trim()) return { error: 'Curriculum name cannot be empty.' };
    patch.name = input.name.trim();
  }
  if (input.academic_year !== undefined) {
    if (!input.academic_year.trim()) return { error: 'Academic year cannot be empty.' };
    patch.academic_year = input.academic_year.trim();
  }
  if (input.version !== undefined) {
    patch.version = input.version.trim() || 'v1';
  }
  if (input.effective_from !== undefined) patch.effective_from = input.effective_from || null;
  if (input.effective_to !== undefined) patch.effective_to = input.effective_to || null;
  if (input.is_active !== undefined) patch.is_active = input.is_active;

  const { data, error } = await supabase
    .from('programme_curricula')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return {
        error:
          'Another curriculum for this programme already uses that academic year and version.',
      };
    }
    return { error: error.message };
  }

  await logAudit({
    action: 'update',
    module: 'curriculum',
    entityType: 'programme_curriculum',
    entityId: id,
    entityName: data.name,
    details: 'Curriculum updated',
    previousValue: existing,
    newValue: data,
  });

  refreshCurriculumPaths();
  return { success: true, curriculum: data };
}

export async function deleteCurriculum(id: string) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const { data: existing, error: existingError } = await supabase
    .from('programme_curricula')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Curriculum not found.' };

  const { count, error: countError } = await supabase
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('curriculum_id', id);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return {
      error: `${count} student${count === 1 ? ' is' : 's are'} pinned to this curriculum. Deactivate it instead, or move those students first.`,
    };
  }

  const { error } = await supabase.from('programme_curricula').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit({
    action: 'delete',
    module: 'curriculum',
    entityType: 'programme_curriculum',
    entityId: id,
    entityName: existing.name,
    details: 'Curriculum deleted',
    previousValue: existing,
  });

  refreshCurriculumPaths();
  return { success: true };
}

export async function addCurriculumUnit(input: {
  curriculum_id: string;
  course_id: string;
  semester: number;
  sort_order?: number | null;
}) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  if (!input.curriculum_id) return { error: 'Select a curriculum.' };
  if (!input.course_id) return { error: 'Select a unit.' };
  const semester = Number(input.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > 20) {
    return { error: 'Semester must be a whole number between 1 and 20.' };
  }

  const { data: curriculum, error: curriculumError } = await supabase
    .from('programme_curricula')
    .select('id, program_id, name')
    .eq('id', input.curriculum_id)
    .maybeSingle();

  if (curriculumError) return { error: curriculumError.message };
  if (!curriculum) return { error: 'Curriculum not found.' };

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, program_id, code, name')
    .eq('id', input.course_id)
    .maybeSingle();

  if (courseError) return { error: courseError.message };
  if (!course) return { error: 'Unit not found.' };
  if (course.program_id && course.program_id !== curriculum.program_id) {
    return { error: 'That unit belongs to a different programme.' };
  }

  const { data, error } = await supabase
    .from('curriculum_units')
    .insert({
      curriculum_id: input.curriculum_id,
      course_id: input.course_id,
      semester,
      sort_order: input.sort_order ?? null,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { error: 'That unit is already part of this curriculum.' };
    }
    return { error: error.message };
  }

  await logAudit({
    action: 'create',
    module: 'curriculum',
    entityType: 'curriculum_unit',
    entityId: data.id,
    entityName: `${course.code}: ${course.name}`,
    details: `Unit added to ${curriculum.name} (semester ${semester})`,
    newValue: data,
  });

  refreshCurriculumPaths();
  return { success: true, unit: data };
}

export async function updateCurriculumUnit(
  id: string,
  input: {
    semester?: number;
    is_active?: boolean;
    sort_order?: number | null;
  }
) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const { data: existing, error: existingError } = await supabase
    .from('curriculum_units')
    .select('*, course:courses(code, name)')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Curriculum unit not found.' };

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.semester !== undefined) {
    const semester = Number(input.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 20) {
      return { error: 'Semester must be a whole number between 1 and 20.' };
    }
    patch.semester = semester;
  }
  if (input.is_active !== undefined) patch.is_active = input.is_active;
  if (input.sort_order !== undefined) patch.sort_order = input.sort_order;

  const { data, error } = await supabase
    .from('curriculum_units')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return { error: error.message };

  await logAudit({
    action: 'update',
    module: 'curriculum',
    entityType: 'curriculum_unit',
    entityId: id,
    entityName: existing.course
      ? `${(existing.course as any).code}: ${(existing.course as any).name}`
      : id,
    details: 'Curriculum unit updated',
    previousValue: existing,
    newValue: data,
  });

  refreshCurriculumPaths();
  return { success: true, unit: data };
}

export async function deleteCurriculumUnit(id: string) {
  const auth = await requireManager();
  if ('error' in auth) return auth;

  const { supabase } = auth;

  const { data: existing, error: existingError } = await supabase
    .from('curriculum_units')
    .select('*, course:courses(code, name)')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return { error: existingError.message };
  if (!existing) return { error: 'Curriculum unit not found.' };

  const { error } = await supabase.from('curriculum_units').delete().eq('id', id);
  if (error) return { error: error.message };

  await logAudit({
    action: 'delete',
    module: 'curriculum',
    entityType: 'curriculum_unit',
    entityId: id,
    entityName: existing.course
      ? `${(existing.course as any).code}: ${(existing.course as any).name}`
      : id,
    details: 'Unit removed from curriculum (existing enrollments are preserved)',
    previousValue: existing,
  });

  refreshCurriculumPaths();
  return { success: true };
}
