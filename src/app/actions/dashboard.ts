'use server';

import { createClient } from '@/lib/supabase/server';
import type { AcademicTerm, DashboardStats, StudentStatus } from '@/lib/types';
import { getFeeBalance } from '@/lib/utils';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';

type Supabase = Awaited<ReturnType<typeof createClient>>;

function unwrapCount(res: { count: number | null; error: { message: string } | null }) {
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
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

// ---------------------------------------------------------------------------
// Period filter (academic term / semester)
// ---------------------------------------------------------------------------

export interface DashboardPeriod {
  term: AcademicTerm | null;
  /** ISO date range covered by the selected term, or the current calendar month when no term is selected. */
  start: string;
  end: string;
  /** Equivalent-length range immediately preceding `start`, used for trend comparisons. */
  previousStart: string;
  previousEnd: string;
}

export async function getDashboardTerms(): Promise<AcademicTerm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('academic_terms')
    .select('*')
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AcademicTerm[];
}

export async function resolveDashboardPeriod(termId?: string): Promise<DashboardPeriod> {
  let term: AcademicTerm | null = null;
  if (termId) {
    const supabase = await createClient();
    const { data } = await supabase.from('academic_terms').select('*').eq('id', termId).maybeSingle();
    term = (data as AcademicTerm | null) ?? null;
  }

  const now = new Date();
  const start = term ? startOfDay(new Date(term.start_date)) : startOfMonth(now);
  const end = term ? startOfDay(new Date(term.end_date)) : endOfMonth(now);
  const lengthDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const previousEnd = subDays(start, 1);
  const previousStart = subDays(start, lengthDays);

  return {
    term,
    start: start.toISOString(),
    end: addDays(end, 1).toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: addDays(previousEnd, 1).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------------

const STUDENT_STATUSES: StudentStatus[] = ['active', 'inactive', 'graduated', 'suspended', 'withdrawn'];

export interface StudentMetrics {
  total: number;
  active: number;
  byStatus: { status: StudentStatus; count: number }[];
  byProgram: { id: string | null; name: string; code: string | null; count: number }[];
  newInPeriod: number;
  newInPreviousPeriod: number;
  newChangePct: number | null;
  /** Students registered in the last 30 days vs. the 30 days before. */
  growthPct: number | null;
}

async function countStudentsBetween(supabase: Supabase, start: string, end: string) {
  return unwrapCount(
    await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start)
      .lt('created_at', end)
  );
}

export async function getStudentMetrics(period: DashboardPeriod): Promise<StudentMetrics> {
  const supabase = await createClient();
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30).toISOString();
  const sixtyDaysAgo = subDays(now, 60).toISOString();

  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('id, name, code')
    .order('name');
  if (programsError) throw new Error(programsError.message);

  const [statusCounts, programCounts, unassigned, newInPeriod, newInPreviousPeriod, last30, prior30] =
    await Promise.all([
      Promise.all(
        STUDENT_STATUSES.map(async (status) =>
          unwrapCount(
            await supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', status)
          )
        )
      ),
      Promise.all(
        (programs ?? []).map(async (p) =>
          unwrapCount(
            await supabase.from('students').select('id', { count: 'exact', head: true }).eq('program_id', p.id)
          )
        )
      ),
      unwrapCount(
        await supabase.from('students').select('id', { count: 'exact', head: true }).is('program_id', null)
      ),
      countStudentsBetween(supabase, period.start, period.end),
      countStudentsBetween(supabase, period.previousStart, period.previousEnd),
      countStudentsBetween(supabase, thirtyDaysAgo, now.toISOString()),
      countStudentsBetween(supabase, sixtyDaysAgo, thirtyDaysAgo),
    ]);

  const byStatus = STUDENT_STATUSES.map((status, i) => ({ status, count: statusCounts[i] }));
  const total = statusCounts.reduce((a, b) => a + b, 0);

  const byProgram: StudentMetrics['byProgram'] = (programs ?? [])
    .map((p, i) => ({ id: p.id as string | null, name: p.name as string, code: p.code as string | null, count: programCounts[i] }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count);
  if (unassigned > 0) byProgram.push({ id: null, name: 'Unassigned', code: null, count: unassigned });

  return {
    total,
    active: byStatus.find((s) => s.status === 'active')?.count ?? 0,
    byStatus,
    byProgram,
    newInPeriod,
    newInPreviousPeriod,
    newChangePct: percentChange(newInPeriod, newInPreviousPeriod),
    growthPct: percentChange(last30, prior30),
  };
}

// ---------------------------------------------------------------------------
// Enrollment trend
// ---------------------------------------------------------------------------

export type TrendRange = '7d' | '30d' | '6m' | '1y';

export type TrendPoint = {
  label: string;
  newStudents: number;
  active: number;
  inactive: number;
};

const ACTIVE_LIKE: StudentStatus[] = ['active', 'graduated'];

export async function getStudentTrend(range: TrendRange): Promise<TrendPoint[]> {
  const supabase = await createClient();
  const now = new Date();

  let buckets: { start: Date; end: Date; label: string }[];
  if (range === '7d' || range === '30d') {
    const days = range === '7d' ? 7 : 30;
    const first = startOfDay(subDays(now, days - 1));
    buckets = Array.from({ length: days }, (_, i) => {
      const start = addDays(first, i);
      return { start, end: addDays(start, 1), label: format(start, 'd MMM') };
    });
  } else if (range === '6m') {
    const first = startOfWeek(subMonths(now, 6), { weekStartsOn: 1 });
    buckets = [];
    for (let s = first; s <= now; s = addDays(s, 7)) {
      buckets.push({ start: s, end: addDays(s, 7), label: format(s, 'd MMM') });
    }
  } else {
    const first = startOfMonth(subMonths(now, 11));
    buckets = Array.from({ length: 12 }, (_, i) => {
      const start = addMonths(first, i);
      return { start, end: addMonths(start, 1), label: format(start, 'MMM yy') };
    });
  }

  const rangeStart = buckets[0].start.toISOString();
  const { data, error } = await supabase
    .from('students')
    .select('created_at, status')
    .gte('created_at', rangeStart)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const points: TrendPoint[] = buckets.map((b) => ({ label: b.label, newStudents: 0, active: 0, inactive: 0 }));
  for (const row of data ?? []) {
    const t = new Date(row.created_at as string);
    const idx = buckets.findIndex((b) => t >= b.start && t < b.end);
    if (idx < 0) continue;
    points[idx].newStudents += 1;
    if (ACTIVE_LIKE.includes(row.status as StudentStatus)) points[idx].active += 1;
    else points[idx].inactive += 1;
  }
  return points;
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export interface FinanceMetrics {
  collected: number;
  outstanding: number;
  invoiced: number;
  studentsWithBalance: number;
  overdueInvoices: number;
  collectedChangePct: number | null;
  /** Monthly collected vs outstanding for the selected period (last 6 months when no term is selected). */
  series: { label: string; collected: number; outstanding: number }[];
}

export async function getFinanceMetrics(period: DashboardPeriod): Promise<FinanceMetrics> {
  const supabase = await createClient();

  let query = supabase
    .from('fee_payments')
    .select('student_id, amount, amount_paid, status, paid_date, created_at, term_id');
  if (period.term) query = query.eq('term_id', period.term.id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const fees = data ?? [];
  const balanceStudents = new Set<string>();
  let collected = 0;
  let outstanding = 0;
  let invoiced = 0;
  let overdueInvoices = 0;

  for (const fee of fees) {
    const paid = Number(fee.amount_paid ?? 0);
    collected += paid;
    invoiced += Number(fee.amount ?? 0);
    if (fee.status === 'overdue') overdueInvoices += 1;
    if (fee.status === 'waived') continue;
    const balance = getFeeBalance({ amount: Number(fee.amount), amount_paid: paid });
    if (balance > 0) {
      outstanding += balance;
      balanceStudents.add(fee.student_id as string);
    }
  }

  const paidAt = (fee: (typeof fees)[number]) => new Date((fee.paid_date ?? fee.created_at) as string);
  const inRange = (d: Date, start: string, end: string) => d >= new Date(start) && d < new Date(end);
  const collectedInPeriod = fees
    .filter((f) => Number(f.amount_paid) > 0 && inRange(paidAt(f), period.start, period.end))
    .reduce((s, f) => s + Number(f.amount_paid), 0);
  const collectedInPrevious = fees
    .filter((f) => Number(f.amount_paid) > 0 && inRange(paidAt(f), period.previousStart, period.previousEnd))
    .reduce((s, f) => s + Number(f.amount_paid), 0);

  const seriesStart = period.term ? startOfMonth(new Date(period.start)) : startOfMonth(subMonths(new Date(), 5));
  const seriesEnd = period.term ? startOfMonth(new Date(period.end)) : startOfMonth(new Date());
  const series: FinanceMetrics['series'] = [];
  for (let m = seriesStart; m <= seriesEnd && series.length < 24; m = addMonths(m, 1)) {
    const next = addMonths(m, 1);
    let c = 0;
    let o = 0;
    for (const fee of fees) {
      const created = new Date(fee.created_at as string);
      if (Number(fee.amount_paid) > 0 && paidAt(fee) >= m && paidAt(fee) < next) c += Number(fee.amount_paid);
      if (fee.status !== 'waived' && created >= m && created < next) {
        o += getFeeBalance({ amount: Number(fee.amount), amount_paid: Number(fee.amount_paid ?? 0) });
      }
    }
    series.push({ label: format(m, 'MMM yy'), collected: c, outstanding: o });
  }

  return {
    collected,
    outstanding,
    invoiced,
    studentsWithBalance: balanceStudents.size,
    overdueInvoices,
    collectedChangePct: percentChange(collectedInPeriod, collectedInPrevious),
    series,
  };
}

// ---------------------------------------------------------------------------
// Academic
// ---------------------------------------------------------------------------

export interface AcademicMetrics {
  programs: number;
  courses: number;
  enrollments: number;
  moodle: { configured: boolean; synced: number; failed: number; notSynced: number } | null;
}

export async function getAcademicMetrics(period: DashboardPeriod): Promise<AcademicMetrics> {
  const supabase = await createClient();

  let enrollmentsQuery = supabase
    .from('enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');
  if (period.term) enrollmentsQuery = enrollmentsQuery.eq('term_id', period.term.id);

  const [programs, courses, enrollments, synced, failed, notSynced] = await Promise.all([
    unwrapCount(await supabase.from('programs').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    unwrapCount(await supabase.from('courses').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    unwrapCount(await enrollmentsQuery),
    unwrapCount(
      await supabase.from('students').select('id', { count: 'exact', head: true }).eq('lms_sync_status', 'synced')
    ),
    unwrapCount(
      await supabase.from('students').select('id', { count: 'exact', head: true }).eq('lms_sync_status', 'failed')
    ),
    unwrapCount(
      await supabase.from('students').select('id', { count: 'exact', head: true }).eq('lms_sync_status', 'not_synced')
    ),
  ]);

  const configured = Boolean(process.env.MOODLE_URL && process.env.MOODLE_WS_TOKEN);

  return {
    programs,
    courses,
    enrollments,
    moodle: configured || synced + failed > 0 ? { configured, synced, failed, notSynced } : null,
  };
}

// ---------------------------------------------------------------------------
// Attention
// ---------------------------------------------------------------------------

export type AttentionPriority = 'critical' | 'high' | 'medium';

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  count: number;
  priority: AttentionPriority;
  href: string;
}

export async function getAttentionItems(): Promise<AttentionItem[]> {
  const supabase = await createClient();

  const safeCount = async (
    q: PromiseLike<{ count: number | null; error: { message: string } | null }>
  ) => {
    const res = await q;
    return res.error ? 0 : res.count ?? 0;
  };

  const [pendingPayments, pendingDeregistrations, overdueFees, incompleteProfiles, lmsFailed, lmsNotSynced] =
    await Promise.all([
      safeCount(
        supabase.from('fee_payment_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending')
      ),
      safeCount(
        supabase
          .from('student_deregistration_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending')
      ),
      safeCount(supabase.from('fee_payments').select('id', { count: 'exact', head: true }).eq('status', 'overdue')),
      safeCount(
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .or('program_id.is.null,phone.is.null,date_of_birth.is.null')
      ),
      safeCount(
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('lms_sync_status', 'failed')
      ),
      safeCount(
        supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('lms_sync_status', 'not_synced')
          .eq('status', 'active')
      ),
    ]);

  const items: AttentionItem[] = [
    {
      id: 'lms-failed',
      title: 'Failed LMS imports',
      description: 'Students whose Moodle account creation failed',
      count: lmsFailed,
      priority: 'critical',
      href: '/dashboard/students',
    },
    {
      id: 'overdue-fees',
      title: 'Overdue invoices',
      description: 'Fee invoices past their due date',
      count: overdueFees,
      priority: 'critical',
      href: '/dashboard/fees',
    },
    {
      id: 'pending-payments',
      title: 'Payments awaiting approval',
      description: 'Student payment submissions to review',
      count: pendingPayments,
      priority: 'high',
      href: '/dashboard/fees',
    },
    {
      id: 'pending-deregistrations',
      title: 'Deregistration requests',
      description: 'Pending unit or withdrawal requests',
      count: pendingDeregistrations,
      priority: 'high',
      href: '/dashboard/enrollments',
    },
    {
      id: 'incomplete-profiles',
      title: 'Incomplete student profiles',
      description: 'Active students missing program, phone or date of birth',
      count: incompleteProfiles,
      priority: 'medium',
      href: '/dashboard/students',
    },
    {
      id: 'lms-not-synced',
      title: 'Not yet imported to LMS',
      description: 'Active students without a Moodle account',
      count: lmsNotSynced,
      priority: 'medium',
      href: '/dashboard/students',
    },
  ];

  const order: Record<AttentionPriority, number> = { critical: 0, high: 1, medium: 2 };
  return items.filter((i) => i.count > 0).sort((a, b) => order[a.priority] - order[b.priority]);
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

export type ActivityType = 'student' | 'payment' | 'payment_pending' | 'enrollment' | 'deregistration' | 'invoice';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: string;
  description: string;
  at: string;
  href: string;
}

type StudentRef = { id: string; first_name: string; last_name: string } | null;
const studentName = (s: StudentRef) => (s ? `${s.first_name} ${s.last_name}`.trim() : 'Unknown student');

export async function getRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const supabase = await createClient();
  const perSource = limit;

  const [studentsRes, paymentsRes, submissionsRes, enrollmentsRes, deregRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, first_name, last_name, created_at, registration_source, program:programs(name)')
      .order('created_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('fee_payments')
      .select('id, amount, amount_paid, paid_date, updated_at, created_at, student:students(id, first_name, last_name)')
      .order('updated_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('fee_payment_submissions')
      .select('id, amount, status, created_at, reviewed_at, student:students(id, first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('enrollments')
      .select('id, enrolled_at, student:students(id, first_name, last_name), course:courses(name)')
      .order('enrolled_at', { ascending: false })
      .limit(perSource),
    supabase
      .from('student_deregistration_requests')
      .select('id, request_type, status, created_at, student:students(id, first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(perSource),
  ]);

  const items: ActivityItem[] = [];
  const money = (n: number) => `KES ${Math.round(n).toLocaleString('en-KE')}`;

  for (const s of studentsRes.data ?? []) {
    const program = (s.program as unknown as { name: string } | null)?.name;
    items.push({
      id: `student-${s.id}`,
      type: 'student',
      actor: studentName(s as StudentRef),
      description: `${s.registration_source === 'self_registered' ? 'Self-registered' : 'Registered'}${program ? ` · ${program}` : ''}`,
      at: s.created_at as string,
      href: `/dashboard/students/${s.id}`,
    });
  }

  for (const f of paymentsRes.data ?? []) {
    const student = f.student as unknown as StudentRef;
    const paid = Number(f.amount_paid ?? 0);
    if (paid > 0) {
      items.push({
        id: `payment-${f.id}`,
        type: 'payment',
        actor: studentName(student),
        description: `Payment of ${money(paid)} received`,
        at: (f.paid_date ? new Date(f.paid_date as string).toISOString() : (f.updated_at as string)) ?? (f.created_at as string),
        href: `/dashboard/fees/receipt/${f.id}`,
      });
    } else {
      items.push({
        id: `invoice-${f.id}`,
        type: 'invoice',
        actor: studentName(student),
        description: `Invoice of ${money(Number(f.amount))} issued`,
        at: f.created_at as string,
        href: `/dashboard/fees/invoice/${f.id}`,
      });
    }
  }

  for (const sub of submissionsRes.data ?? []) {
    const student = sub.student as unknown as StudentRef;
    if (sub.status === 'pending') {
      items.push({
        id: `submission-${sub.id}`,
        type: 'payment_pending',
        actor: studentName(student),
        description: `Submitted ${money(Number(sub.amount))} for approval`,
        at: sub.created_at as string,
        href: '/dashboard/fees',
      });
    }
  }

  for (const e of enrollmentsRes.data ?? []) {
    const course = (e.course as unknown as { name: string } | null)?.name;
    const student = e.student as unknown as StudentRef;
    items.push({
      id: `enrollment-${e.id}`,
      type: 'enrollment',
      actor: studentName(student),
      description: `Enrolled in ${course ?? 'a course'}`,
      at: e.enrolled_at as string,
      href: student ? `/dashboard/students/${student.id}/enrollment` : '/dashboard/enrollments',
    });
  }

  for (const d of deregRes.data ?? []) {
    const student = d.student as unknown as StudentRef;
    items.push({
      id: `dereg-${d.id}`,
      type: 'deregistration',
      actor: studentName(student),
      description: `${d.request_type === 'full_withdrawal' ? 'Withdrawal' : 'Unit deregistration'} request ${d.status}`,
      at: d.created_at as string,
      href: '/dashboard/enrollments',
    });
  }

  return items
    .filter((i) => Boolean(i.at))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
