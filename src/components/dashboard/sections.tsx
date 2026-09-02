import { cache } from 'react';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Inbox,
  PieChart,
  Receipt,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import {
  getAcademicMetrics,
  getAttentionItems,
  getFinanceMetrics,
  getRecentActivity,
  getStudentMetrics,
  getStudentTrend,
  type ActivityType,
  type AttentionPriority,
  type DashboardPeriod,
} from '@/app/actions/dashboard';
import { DonutChart, HorizontalBars } from '@/components/dashboard/charts';
import { FinanceChart } from '@/components/dashboard/finance-chart';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { Section, SectionEmpty } from '@/components/dashboard/section';
import { StudentTrend } from '@/components/dashboard/student-trend';
import { cn, formatCurrency } from '@/lib/utils';

const num = (n: number) => n.toLocaleString('en-KE');

// Deduplicated per request: the KPI row and the detail sections share the same metrics.
const studentMetrics = cache(getStudentMetrics);
const financeMetrics = cache(getFinanceMetrics);

function periodLabel(period: DashboardPeriod) {
  return period.term ? period.term.name : 'this month';
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export async function KpiSection({ period }: { period: DashboardPeriod }) {
  const [students, finance] = await Promise.allSettled([studentMetrics(period), financeMetrics(period)]);
  const s = students.status === 'fulfilled' ? students.value : null;
  const f = finance.status === 'fulfilled' ? finance.value : null;
  if (!s && !f) throw new Error('KPI queries failed');

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {s && (
        <>
          <KpiCard
            title="Students"
            value={num(s.total)}
            icon={Users}
            changePct={s.growthPct}
            changeLabel={`${num(s.active)} active · last 30 days`}
            href="/dashboard/students"
          />
          <KpiCard
            title="New Admissions"
            value={num(s.newInPeriod)}
            icon={UserPlus}
            changePct={s.newChangePct}
            changeLabel={period.term ? `Registered in ${period.term.name}` : 'This month vs. last month'}
            href="/dashboard/students"
          />
        </>
      )}
      {f && (
        <>
          <KpiCard
            title="Fees Collected"
            value={formatCurrency(f.collected)}
            icon={Wallet}
            changePct={f.collectedChangePct}
            changeLabel={period.term ? `Payments in ${period.term.name}` : 'This month vs. last month'}
            href="/dashboard/fees"
          />
          <KpiCard
            title="Outstanding Fees"
            value={formatCurrency(f.outstanding)}
            icon={AlertCircle}
            supporting={
              f.studentsWithBalance === 0
                ? 'No student balances'
                : `${num(f.studentsWithBalance)} student${f.studentsWithBalance === 1 ? '' : 's'} with balances`
            }
            tone={f.outstanding > 0 ? 'warning' : 'default'}
            href="/dashboard/fees"
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Student trend (initial data server-side, range switching client-side)
// ---------------------------------------------------------------------------

export async function StudentTrendSection() {
  const data = await getStudentTrend('30d');
  return <StudentTrend initialRange="30d" initialData={data} />;
}

// ---------------------------------------------------------------------------
// Distribution
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  active: '#059669',
  inactive: '#94a3b8',
  graduated: '#003380',
  suspended: '#d97706',
  withdrawn: '#dc2626',
};

export async function DistributionSection({ period }: { period: DashboardPeriod }) {
  const s = await studentMetrics(period);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Students by Program" description="All registered students grouped by program">
        {s.byProgram.length === 0 ? (
          <SectionEmpty icon={GraduationCap} title="No program data" description="Students will appear here once they are assigned to a program." />
        ) : (
          <HorizontalBars items={s.byProgram.map((p) => ({ label: p.name, value: p.count, hint: p.code ?? undefined }))} />
        )}
      </Section>

      <Section title="Student Status" description="Current status of all registered students">
        {s.total === 0 ? (
          <SectionEmpty icon={PieChart} title="No students yet" description="Register your first student to see status distribution." />
        ) : (
          <DonutChart
            centerLabel="Total students"
            ariaLabel="Students by status"
            segments={s.byStatus
              .filter((x) => x.count > 0)
              .map((x) => ({
                label: x.status.charAt(0).toUpperCase() + x.status.slice(1),
                value: x.count,
                color: STATUS_COLORS[x.status] ?? '#64748b',
              }))}
          />
        )}
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finance
// ---------------------------------------------------------------------------

export async function FinanceSection({ period }: { period: DashboardPeriod }) {
  const f = await financeMetrics(period);
  const hasData = f.series.some((p) => p.collected > 0 || p.outstanding > 0);
  const rate = f.invoiced > 0 ? Math.round((f.collected / f.invoiced) * 100) : null;

  return (
    <Section
      title="Financial Overview"
      description={
        period.term
          ? `Monthly collections and balances for ${period.term.name}`
          : 'Monthly collections and new balances over the last 6 months'
      }
      action={
        rate !== null && (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
            {rate}% collection rate
          </span>
        )
      }
    >
      {!hasData ? (
        <SectionEmpty
          icon={Wallet}
          title="No fee data"
          description={`No invoices or payments have been recorded for ${periodLabel(period) === 'this month' ? 'this period' : period.term?.name}.`}
        />
      ) : (
        <FinanceChart data={f.series} />
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Academic
// ---------------------------------------------------------------------------

export async function AcademicSection({ period }: { period: DashboardPeriod }) {
  const a = await getAcademicMetrics(period);

  const items: { label: string; value: string; icon: LucideIcon; href: string; hint?: string }[] = [
    { label: 'Active programs', value: num(a.programs), icon: GraduationCap, href: '/dashboard/programs' },
    { label: 'Active courses', value: num(a.courses), icon: BookOpen, href: '/dashboard/courses' },
    {
      label: 'Course enrollments',
      value: num(a.enrollments),
      icon: ClipboardList,
      href: '/dashboard/enrollments',
      hint: period.term ? period.term.name : 'Active',
    },
  ];

  return (
    <Section title="Academic Overview" bodyClassName="p-0">
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.label}>
            <Link href={item.href} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light text-primary" aria-hidden>
                <item.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-700">{item.label}</span>
                {item.hint && <span className="block text-xs text-muted">{item.hint}</span>}
              </span>
              <span className="text-lg font-semibold tabular-nums text-slate-900">{item.value}</span>
            </Link>
          </li>
        ))}
        {a.moodle && (
          <li className="flex items-center gap-3 px-5 py-3.5">
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                a.moodle.configured ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
              )}
              aria-hidden
            >
              <Activity className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-700">Moodle LMS</span>
              <span className="block text-xs text-muted">
                {a.moodle.configured ? 'Connected' : 'Not configured'} · {num(a.moodle.synced)} synced
                {a.moodle.failed > 0 && <span className="text-red-600"> · {num(a.moodle.failed)} failed</span>}
              </span>
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                a.moodle.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              )}
            >
              {a.moodle.configured ? 'Online' : 'Offline'}
            </span>
          </li>
        )}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Add Student', href: '/dashboard/students/new', icon: UserPlus },
  { label: 'Record Payment', href: '/dashboard/fees', icon: CreditCard },
  { label: 'Enrollments', href: '/dashboard/enrollments', icon: ClipboardList },
  { label: 'Add Program', href: '/dashboard/programs', icon: GraduationCap },
  { label: 'Add Course', href: '/dashboard/courses', icon: BookOpen },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
];

export function QuickActions() {
  return (
    <Section title="Quick Actions" bodyClassName="p-3">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {QUICK_ACTIONS.map((a) => (
          <li key={a.href + a.label}>
            <Link
              href={a.href}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-primary/30 hover:bg-primary-light hover:text-primary"
            >
              <a.icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{a.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Attention
// ---------------------------------------------------------------------------

const PRIORITY_STYLES: Record<AttentionPriority, { badge: string; dot: string; label: string }> = {
  critical: { badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500', label: 'Critical' },
  high: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500', label: 'High' },
  medium: { badge: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-500', label: 'Medium' },
};

export async function AttentionSection() {
  const items = await getAttentionItems();

  return (
    <Section
      title="Requires Attention"
      description={items.length ? `${items.length} item${items.length === 1 ? '' : 's'} need administrator action` : undefined}
      bodyClassName="p-0"
    >
      {items.length === 0 ? (
        <SectionEmpty
          icon={CheckCircle2}
          tone="positive"
          title="You're all caught up"
          description="No pending approvals, overdue invoices or incomplete records right now."
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const style = PRIORITY_STYLES[item.priority];
            return (
              <li key={item.id}>
                <Link href={item.href} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', style.dot)} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{item.title}</span>
                    <span className="block truncate text-xs text-muted">{item.description}</span>
                  </span>
                  <span className={cn('hidden rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset sm:inline', style.badge)}>
                    {style.label}
                  </span>
                  <span className="min-w-[2ch] text-right text-base font-semibold tabular-nums text-slate-900">{num(item.count)}</span>
                  <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

const ACTIVITY_ICONS: Record<ActivityType, { icon: LucideIcon; className: string }> = {
  student: { icon: UserPlus, className: 'bg-primary-light text-primary' },
  payment: { icon: Wallet, className: 'bg-emerald-50 text-emerald-600' },
  payment_pending: { icon: Receipt, className: 'bg-amber-50 text-amber-600' },
  invoice: { icon: FileText, className: 'bg-slate-100 text-slate-600' },
  enrollment: { icon: ClipboardList, className: 'bg-indigo-50 text-indigo-600' },
  deregistration: { icon: UserMinus, className: 'bg-red-50 text-red-600' },
};

export async function ActivitySection() {
  const items = await getRecentActivity(10);

  return (
    <Section title="Recent Activity" bodyClassName="p-0">
      {items.length === 0 ? (
        <SectionEmpty icon={Inbox} title="No recent activity" description="Registrations, payments and enrollments will show up here as they happen." />
      ) : (
        <ol className="divide-y divide-slate-100">
          {items.map((item) => {
            const meta = ACTIVITY_ICONS[item.type];
            return (
              <li key={item.id}>
                <Link href={item.href} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50">
                  <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.className)} aria-hidden>
                    <meta.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900">{item.actor}</span>
                    <span className="block truncate text-xs text-slate-600">{item.description}</span>
                  </span>
                  <time dateTime={item.at} className="shrink-0 whitespace-nowrap text-xs text-muted" suppressHydrationWarning>
                    {formatDistanceToNowStrict(new Date(item.at), { addSuffix: true })}
                  </time>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
