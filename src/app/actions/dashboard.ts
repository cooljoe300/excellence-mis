'use server';

import { createClient } from '@/lib/supabase/server';
import type { DashboardStats } from '@/lib/types';

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
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}
