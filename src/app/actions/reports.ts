'use server';

import { getDashboardStats } from '@/app/actions/dashboard';
import { getStudents } from '@/app/actions/students';
import { getPrograms } from '@/app/actions/programs';
import { getCourses } from '@/app/actions/courses';
import { getFeePayments } from '@/app/actions/fees';
import { getEnrollments } from '@/app/actions/enrollments';
import { getAttendance } from '@/app/actions/attendance';
import type {
  Attendance,
  Course,
  Enrollment,
  FeePayment,
  Program,
  Student,
} from '@/lib/types';
import type { DashboardStats } from '@/lib/types';

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
}

export async function getReportsBundle(): Promise<ReportsBundle> {
  const [stats, students, programs, courses, fees, enrollments, attendance] = await Promise.all([
    getDashboardStats(),
    getStudents(),
    getPrograms(),
    getCourses(),
    getFeePayments(),
    getEnrollments(),
    getAttendance(),
  ]);

  const byStatus = students.reduce(
    (acc, student) => {
      acc[student.status] = (acc[student.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byProgram = students.reduce(
    (acc, student) => {
      const name = (student.program as { name: string } | null)?.name ?? 'Unassigned';
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
    students: students as Student[],
    programs: programs as Program[],
    courses: courses as Course[],
    fees: fees as FeePayment[],
    enrollments: enrollments as Enrollment[],
    attendance: attendance as Attendance[],
  };
}
