'use server';

import { createClient } from '@/lib/supabase/server';
import type { DashboardStats } from '@/lib/types';

export interface AdminDashboardStats {
  totalUsers: number;
  admins: number;
  staff: number;
  teachers: number;
  students: number;
}

export interface EnhancedDashboardStats extends DashboardStats {
  newAdmissionsThisMonth: number;
  studentsByProgram: { programName: string; count: number }[];
  studentsByStatus: { status: string; count: number }[];
  feesCollected: number;
  outstandingFees: number;
  studentsWithOutstanding: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  const [
    studentsRes,
    activeStudentsRes,
    programsRes,
    coursesRes,
    enrollmentsRes,
    feesRes,
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('programs').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('fee_payments').select('amount, amount_paid, status'),
  ]);

  const fees = feesRes.data ?? [];
  const pendingFees = fees.filter((f) => f.status === 'pending' || f.status === 'partial').length;
  const overdueFees = fees.filter((f) => f.status === 'overdue').length;
  const totalRevenue = fees.reduce((sum, f) => sum + (f.amount_paid ?? 0), 0);

  return {
    totalStudents: studentsRes.count ?? 0,
    activeStudents: activeStudentsRes.count ?? 0,
    totalPrograms: programsRes.count ?? 0,
    totalCourses: coursesRes.count ?? 0,
    activeEnrollments: enrollmentsRes.count ?? 0,
    pendingFees,
    overdueFees,
    totalRevenue,
  };
}

export async function getEnhancedDashboardStats(): Promise<EnhancedDashboardStats> {
  const supabase = await createClient();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    baseStats,
    newAdmissionsRes,
    programDistributionRes,
    statusDistributionRes,
    feesWithStudentsRes,
  ] = await Promise.all([
    getDashboardStats(),
    supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .gte('enrollment_date', firstDayOfMonth.toISOString()),
    supabase
      .from('students')
      .select('program:programs(name)')
      .not('program_id', 'is', null),
    supabase
      .from('students')
      .select('status'),
    supabase
      .from('fee_payments')
      .select('amount, amount_paid, status, student_id')
  ]);

  // Process program distribution
  const programMap = new Map<string, number>();
  programDistributionRes.data?.forEach((student) => {
    const programName = student.program && typeof student.program === 'object' && 'name' in student.program 
      ? (student.program as { name: string }).name 
      : 'Unassigned';
    programMap.set(programName, (programMap.get(programName) || 0) + 1);
  });

  const studentsByProgram = Array.from(programMap.entries())
    .map(([programName, count]) => ({ programName, count }))
    .sort((a, b) => b.count - a.count);

  // Process status distribution
  const statusMap = new Map<string, number>();
  statusDistributionRes.data?.forEach((student) => {
    statusMap.set(student.status, (statusMap.get(student.status) || 0) + 1);
  });

  const studentsByStatus = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Process financial data
  const fees = feesWithStudentsRes.data ?? [];
  const feesCollected = fees.reduce((sum, f) => sum + (f.amount_paid ?? 0), 0);
  const outstandingFees = fees.reduce((sum, f) => sum + ((f.amount ?? 0) - (f.amount_paid ?? 0)), 0);
  const studentsWithOutstanding = new Set(
    fees.filter(f => (f.amount ?? 0) > (f.amount_paid ?? 0)).map(f => f.student_id)
  ).size;

  return {
    ...baseStats,
    newAdmissionsThisMonth: newAdmissionsRes.count ?? 0,
    studentsByProgram,
    studentsByStatus,
    feesCollected,
    outstandingFees,
    studentsWithOutstanding,
  };
}

export async function getRecentStudents(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('students')
    .select('*, program:programs(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await (supabase.auth as any).getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createClient();

  const [{ count: totalUsers }, { count: admins }, { count: staff }, { count: teachers }, { count: students }] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'staff'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'student'),
    ]);

  return {
    totalUsers: totalUsers ?? 0,
    admins: admins ?? 0,
    staff: staff ?? 0,
    teachers: teachers ?? 0,
    students: students ?? 0,
  };
}
