import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CurriculumUnit,
  CurriculumUnitOption,
  ProgrammeCurriculum,
} from '@/lib/types';

type Db = SupabaseClient<any, 'public', any>;

export interface CurriculumWithUnits extends ProgrammeCurriculum {
  units: CurriculumUnit[];
  semesters: number[];
  unit_count: number;
}

export interface StudentCurriculumRecord {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string | null;
  student_number: string;
  program_id: string | null;
  curriculum_id: string | null;
  current_semester: number;
  study_mode: string | null;
  academic_year: string | null;
  intake_id: string | null;
  status: string;
  program?: { id: string; name: string; code: string } | null;
  intake?: {
    id: string;
    name: string;
    code: string;
    academic_year: string | null;
  } | null;
}

export interface StudentCurriculumContext {
  student: StudentCurriculumRecord;
  curriculum: CurriculumWithUnits | null;
  semesters: number[];
}

const CURRICULUM_UNITS_SELECT = `
  id,
  curriculum_id,
  program_id,
  name,
  academic_year,
  version,
  is_active,
  effective_from,
  effective_to,
  created_by,
  created_at,
  updated_at,
  units:curriculum_units(
    id,
    curriculum_id,
    course_id,
    semester,
    is_active,
    sort_order,
    course:courses(id, code, name, credits, unit_fee, is_active)
  )
`;

function sortUnits(units: CurriculumUnit[]): CurriculumUnit[] {
  return [...units].sort((a, b) => {
    if (a.semester !== b.semester) return a.semester - b.semester;
    return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
  });
}

function mapCurriculum(row: any): CurriculumWithUnits {
  const units = sortUnits(
    (row.units ?? []).filter(
      (unit: any) => unit.is_active && unit.course && unit.course.is_active !== false
    )
  );

  return {
    ...(row as ProgrammeCurriculum),
    units,
    semesters: Array.from(new Set<number>(units.map((u) => Number(u.semester)))).sort(
      (a, b) => a - b
    ),
    unit_count: units.length,
  };
}

/**
 * Load curricula (with their active units) for the supplied programmes.
 * Uses only configuration data: no programme names, codes or unit lists are
 * hard-coded.
 */
export async function getCurriculaForProgramIds(
  supabase: Db,
  programIds: string[],
  activeOnly = true
): Promise<CurriculumWithUnits[]> {
  if (programIds.length === 0) return [];

  let query = supabase
    .from('programme_curricula')
    .select(CURRICULUM_UNITS_SELECT)
    .in('program_id', Array.from(new Set(programIds)));

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query
    .order('effective_from', { ascending: false, nullsFirst: false })
    .order('academic_year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCurriculum);
}

export async function getActiveCurriculaForProgramIds(
  supabase: Db,
  programIds: string[]
): Promise<CurriculumWithUnits[]> {
  return getCurriculaForProgramIds(supabase, programIds, true);
}

export async function getProgrammeCurricula(
  supabase: Db,
  programId: string,
  activeOnly = true
): Promise<CurriculumWithUnits[]> {
  let query = supabase
    .from('programme_curricula')
    .select(CURRICULUM_UNITS_SELECT)
    .eq('program_id', programId);

  if (activeOnly) query = query.eq('is_active', true);

  const { data, error } = await query
    .order('effective_from', { ascending: false, nullsFirst: false })
    .order('academic_year', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCurriculum);
}

/**
 * Resolve the active curriculum a programme should default to. The newest
 * effective curriculum wins; this is a configuration lookup, not a hard-coded
 * mapping.
 */
export async function resolveDefaultCurriculum(
  supabase: Db,
  programId: string
): Promise<CurriculumWithUnits | null> {
  const curricula = await getProgrammeCurricula(supabase, programId, true);
  return curricula[0] ?? null;
}

export async function getCurriculumById(
  supabase: Db,
  curriculumId: string
): Promise<CurriculumWithUnits | null> {
  const { data, error } = await supabase
    .from('programme_curricula')
    .select(CURRICULUM_UNITS_SELECT)
    .eq('id', curriculumId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCurriculum(data) : null;
}

/**
 * Load the student's pinned curriculum and semester list. If the student has
 * no pinned curriculum, the programme's active default is resolved but the
 * student row is not modified here.
 */
export async function resolveStudentCurriculum(
  supabase: Db,
  studentId: string
): Promise<StudentCurriculumContext | null> {
  const { data, error } = await supabase
    .from('students')
    .select(
      `id, first_name, last_name, admission_number, student_number, status,
       program_id, curriculum_id, current_semester, study_mode, academic_year, intake_id,
       program:programs(id, name, code),
       intake:intakes(id, name, code, academic_year)`
    )
    .eq('id', studentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const student = data as unknown as StudentCurriculumRecord;

  let curriculum: CurriculumWithUnits | null = null;

  if (student.curriculum_id) {
    curriculum = await getCurriculumById(supabase, student.curriculum_id);

    // If the pinned curriculum no longer exists (or was removed), fall back to
    // the programme's current active curriculum.
    if (!curriculum && student.program_id) {
      curriculum = await resolveDefaultCurriculum(supabase, student.program_id);
    }
  } else if (student.program_id) {
    curriculum = await resolveDefaultCurriculum(supabase, student.program_id);
  }

  return {
    student,
    curriculum,
    semesters: curriculum?.semesters ?? [],
  };
}

function mapUnitOption(unit: any): CurriculumUnitOption {
  return {
    id: unit.course.id as string,
    curriculum_unit_id: unit.id as string,
    code: unit.course.code as string,
    name: unit.course.name as string,
    credits: Number(unit.course.credits ?? 0),
    unit_fee: Number(unit.course.unit_fee ?? 0),
    semester: Number(unit.semester),
    sort_order: unit.sort_order ?? null,
    is_active: Boolean(unit.is_active),
  };
}

/**
 * Units for a curriculum, optionally restricted to one semester.
 */
export async function getCurriculumUnitOptions(
  supabase: Db,
  curriculumId: string,
  semester?: number
): Promise<CurriculumUnitOption[]> {
  let query = supabase
    .from('curriculum_units')
    .select(
      'id, curriculum_id, course_id, semester, is_active, sort_order, course:courses(id, code, name, credits, unit_fee, is_active)'
    )
    .eq('curriculum_id', curriculumId)
    .eq('is_active', true);

  if (semester != null) query = query.eq('semester', semester);

  const { data, error } = await query
    .order('semester')
    .order('sort_order', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .filter((unit: any) => unit.course && unit.course.is_active !== false)
    .map(mapUnitOption);
}

/**
 * Returns the subset of courseIds that are not active units of the supplied
 * curriculum/semester.
 */
export async function findInvalidCurriculumUnits(
  supabase: Db,
  curriculumId: string,
  semester: number,
  courseIds: string[]
): Promise<string[]> {
  if (courseIds.length === 0) return [];

  const units = await getCurriculumUnitOptions(supabase, curriculumId, semester);
  const valid = new Set(units.map((unit) => unit.id));
  return courseIds.filter((id) => !valid.has(id));
}

/**
 * Course ids that belong to a curriculum (optionally a specific semester).
 * Used to scope removals so units from other semesters / previous programmes
 * are preserved.
 */
export async function getCurriculumCourseIds(
  supabase: Db,
  curriculumId: string,
  semester?: number
): Promise<string[]> {
  const units = await getCurriculumUnitOptions(supabase, curriculumId, semester);
  return units.map((unit) => unit.id);
}
