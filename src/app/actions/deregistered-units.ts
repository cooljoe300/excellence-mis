'use server';

import { createClient } from '@/lib/supabase/server';
import { getPrograms } from '@/app/actions/programs';
import { getIntakes } from '@/app/actions/intakes';
import { getAcademicTerms } from '@/app/actions/academic-terms';

export interface DeregisteredUnit {
  enrollment_id: string;
  student_id: string;
  student_number: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  student_status: string;
  intake_id: string;
  intake_name: string;
  intake_code: string;
  program_id: string;
  program_name: string;
  program_code: string;
  course_id: string;
  course_code: string;
  course_name: string;
  course_credits: number;
  instructor_id: string;
  instructor_name: string;
  term_id: string;
  term_name: string;
  term_code: string;
  enrolled_at: string;
  deregistered_at: string;
  deregistered_by: string;
  deregistered_by_name: string;
  deregistration_reason: string;
  status: string;
  grade: string;
  score: number;
}

export async function getDeregisteredUnits(params: {
  search?: string;
  programId?: string;
  intakeId?: string;
  termId?: string;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}) {
  const supabase = await createClient();
  const {
    search,
    programId,
    intakeId,
    termId,
    courseId,
    dateFrom,
    dateTo,
    limit = 100,
    offset = 0,
  } = params;

  const { data, error } = await supabase.rpc('get_deregistered_units', {
    p_search: search || null,
    p_program_id: programId || null,
    p_intake_id: intakeId || null,
    p_term_id: termId || null,
    p_course_id: courseId || null,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('Error fetching deregistered units:', error);
    return [];
  }

  return (data || []) as DeregisteredUnit[];
}

export async function countDeregisteredUnits(params: {
  search?: string;
  programId?: string;
  intakeId?: string;
  termId?: string;
  courseId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const supabase = await createClient();
  const {
    search,
    programId,
    intakeId,
    termId,
    courseId,
    dateFrom,
    dateTo,
  } = params;

  const { data, error } = await supabase.rpc('count_deregistered_units', {
    p_search: search || null,
    p_program_id: programId || null,
    p_intake_id: intakeId || null,
    p_term_id: termId || null,
    p_course_id: courseId || null,
    p_date_from: dateFrom || null,
    p_date_to: dateTo || null,
  });

  if (error) {
    console.error('Error counting deregistered units:', error);
    return 0;
  }

  return (data || 0) as number;
}

export async function getDeregisteredUnitsPageData() {
  const [programs, intakes, terms] = await Promise.all([
    getPrograms(),
    getIntakes(),
    getAcademicTerms(),
  ]);

  const courses = await getAllCourses();

  return {
    programs,
    intakes,
    terms,
    courses,
  };
}

async function getAllCourses() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, code, name, program_id')
    .eq('is_active', true)
    .order('code');

  if (error) {
    console.error('Error fetching courses:', error);
    return [];
  }

  return data || [];
}