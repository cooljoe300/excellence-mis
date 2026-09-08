'use server';

import { createClient } from '@/lib/supabase/server';
import { getDashboardStats } from '@/app/actions/dashboard';
import { getPrograms } from '@/app/actions/programs';
import { getCourses } from '@/app/actions/courses';
import { getIntakes } from '@/app/actions/intakes';
import type {
  Attendance,
  Course,
  Enrollment,
  FeePayment,
  Program,
  Student,
  Intake,
  DashboardStats,
} from '@/lib/types';

export interface ReportsBundle {
  generatedAt: string;
  stats: DashboardStats;
  byStatus: Record<string, number>;
  byProgram: Record<string, number>;
  feeSummary: Record<string, number>;
  students: Student[];
  programs: Program[];
  courses: Course[];
  fees: FeePayment[];
  enrollments: Enrollment[];
  attendance: Attendance[];
  intakes: Intake[];
}

const STUDENT_SELECT =
  'id, student_number, admission_number, profile_id, first_name, last_name, email, phone, gender, status, program_id, intake_id, enrollment_date, created_at, notes, program:programs(id, name, code), intake:intakes(id, name, code)';

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function asList<T>(data: unknown): T[] {
  return (Array.isArray(data) ? data : []) as unknown as T[];
}

function firstRelation<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function mergeStudent(base: Student | undefined, overlay: Student | undefined): Student | undefined {
  if (!overlay && !base) return undefined;
  if (!overlay) return base;
  if (!base) return overlay;
  return {
    ...base,
    ...overlay,
    email: overlay.email || base.email,
    phone: overlay.phone || base.phone,
    program: overlay.program || base.program,
    intake: overlay.intake || base.intake,
  };
}

async function loadReportStudents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[reports] students', error);
    throw new Error('Unable to load student records.');
  }

  const students = asList<Student>(data).map((student) => ({
    ...student,
    program: firstRelation(student.program),
    intake: firstRelation(student.intake),
  }));
  const profileIds = uniqueIds(students.map((student) => student.profile_id));
  if (profileIds.length === 0) return students;

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, phone')
    .in('id', profileIds);

  if (profileError) {
    console.error('[reports] profiles', profileError);
    return students;
  }

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return students.map((student) => {
    const profile = student.profile_id ? profileMap.get(student.profile_id) : undefined;
    return {
      ...student,
      email: student.email || profile?.email || '',
      phone: student.phone || profile?.phone || null,
    };
  });
}

export async function getReportsBundle(): Promise<ReportsBundle> {
  try {
    const supabase = await createClient();
    const [stats, students, programs, courses, intakes, feesResult, enrollmentsResult, attendanceResult] =
      await Promise.all([
        getDashboardStats(),
        loadReportStudents(),
        getPrograms(),
        getCourses(),
        getIntakes(),
        supabase
          .from('fee_payments')
          .select('*, student:students(*), term:academic_terms(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('enrollments')
          .select('*, student:students(*), course:courses(*), term:academic_terms(*)')
          .order('enrolled_at', { ascending: false }),
        supabase
          .from('attendance')
          .select('*, enrollment:enrollments(*, student:students(*), course:courses(*))')
          .order('date', { ascending: false }),
      ]);

    if (feesResult.error) {
      console.error('[reports] fees', feesResult.error);
      throw new Error('Unable to load fee records.');
    }
    if (enrollmentsResult.error) {
      console.error('[reports] enrollments', enrollmentsResult.error);
      throw new Error('Unable to load enrollment records.');
    }
    if (attendanceResult.error) {
      console.error('[reports] attendance', attendanceResult.error);
      throw new Error('Unable to load attendance records.');
    }

    const studentsById = new Map(students.map((student) => [student.id, student]));

    const fees = asList<FeePayment>(feesResult.data).map((fee) => ({
      ...fee,
      student: mergeStudent(fee.student, studentsById.get(fee.student_id)),
    }));

    const enrollments = asList<Enrollment>(enrollmentsResult.data).map((enrollment) => ({
      ...enrollment,
      student: mergeStudent(enrollment.student, studentsById.get(enrollment.student_id)),
    }));

    const attendance = asList<Attendance>(attendanceResult.data).map((record) => {
      const enrollment = record.enrollment;
      if (!enrollment) return record;
      return {
        ...record,
        enrollment: {
          ...enrollment,
          student: mergeStudent(enrollment.student, studentsById.get(enrollment.student_id)),
        },
      };
    });

    const byStatus = students.reduce(
      (acc, student) => {
        acc[student.status] = (acc[student.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byProgram = students.reduce(
      (acc, student) => {
        const name = student.program?.name ?? 'Unassigned';
        acc[name] = (acc[name] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const feeSummary = fees.reduce(
      (acc, fee) => {
        acc[fee.status] = (acc[fee.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      generatedAt: new Date().toISOString(),
      stats,
      byStatus,
      byProgram,
      feeSummary,
      students,
      programs: programs as Program[],
      courses: courses as Course[],
      fees,
      enrollments,
      attendance,
      intakes: intakes as Intake[],
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unable to load')) {
      throw error;
    }
    console.error('[reports] bundle', error);
    throw new Error('Unable to load reports. Please try again.');
  }
}
