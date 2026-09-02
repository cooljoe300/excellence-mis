import { getEnhancedDashboardStats, getProfile, getRecentStudents } from '@/app/actions/dashboard';
import { getAdminPendingActions } from '@/app/actions/pending-actions';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PendingActionsCard } from '@/components/pending-actions/pending-actions-card';
import { PendingActionsModal } from '@/components/pending-actions/pending-actions-modal';
import { PendingActionsBadge } from '@/components/pending-actions/pending-actions-badge';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { 
  Users, 
  UserPlus, 
  Wallet, 
  AlertCircle, 
  Bell, 
  BookOpen, 
  GraduationCap, 
  ClipboardList,
  Clock,
  FileText,
  UserPlus as UserPlusIcon,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return formatDate(dateString);
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendPositive = true 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: any; 
  trend?: string; 
  trendPositive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          {trend && (
            <p className={`mt-2 text-xs font-medium ${trendPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
      </div>
    </div>
  );
}

function HorizontalBarChart({ data }: { data: { label: string; value: number; total: number }[] }) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500">{item.value}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div 
                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = 0;
  
  const segments = data.map((item) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const segment = { ...item, percentage, angle, startAngle: currentAngle };
    currentAngle += angle;
    return segment;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 36 36" className="h-full w-full transform -rotate-90">
          {segments.map((segment, index) => (
            <circle
              key={index}
              cx="18"
              cy="18"
              r="15.9"
              fill="transparent"
              stroke={segment.color}
              strokeWidth="3"
              strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
              strokeDashoffset={`-${segments.slice(0, index).reduce((sum, s) => sum + s.percentage, 0)}`}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-slate-900">{total}</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-slate-600">{segment.label}</span>
            <span className="font-medium text-slate-900">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, recentStudents, profile, pendingActions] = await Promise.all([
    getEnhancedDashboardStats(),
    getRecentStudents(8),
    getProfile(),
    getAdminPendingActions(),
  ]);

  const greeting = getGreeting();
  const userName = profile?.full_name || 'Admin';
  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Prepare data for charts
  const programChartData = stats.studentsByProgram.slice(0, 5).map(p => ({
    label: p.programName,
    value: p.count,
    total: stats.totalStudents
  }));

  const statusColors: Record<string, string> = {
    active: '#10b981',
    inactive: '#6b7280',
    graduated: '#3b82f6',
    suspended: '#f59e0b',
    withdrawn: '#ef4444'
  };

  const statusChartData = stats.studentsByStatus.map(s => ({
    label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    color: statusColors[s.status] || '#6b7280'
  }));

  // Calculate attention items
  const attentionItems = [
    {
      title: 'Pending Admissions',
      count: stats.newAdmissionsThisMonth,
      priority: 'medium' as const,
      icon: UserPlus
    },
    {
      title: 'Outstanding Balances',
      count: stats.studentsWithOutstanding,
      priority: 'high' as const,
      icon: AlertCircle
    },
    {
      title: 'Pending Fees',
      count: stats.pendingFees,
      priority: 'medium' as const,
      icon: Clock
    }
  ].filter(item => item.count > 0);

  const quickActions = [
    { label: 'Add Student', href: '/dashboard/students/new', icon: UserPlusIcon },
    { label: 'Record Payment', href: '/dashboard/payments', icon: CreditCard },
    { label: 'Add Program', href: '/dashboard/programs', icon: GraduationCap },
    { label: 'Add Course', href: '/dashboard/courses', icon: BookOpen },
    { label: 'Generate Report', href: '/dashboard/reports', icon: FileText },
  ];

  return (
    <DashboardClient pendingActions={pendingActions}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting}, {userName}
            </h1>
            <p className="text-slate-600">
              Here's what's happening at Excellence Online College today.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-500">{currentDate}</div>
            <PendingActionsBadge />
          </div>
        </div>

        {/* Pending Actions Card - shown automatically by DashboardClient */}
        
        {/* Primary KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard 
            title="Total Students" 
            value={stats.totalStudents} 
            subtitle={`${stats.activeStudents} active`}
            icon={Users}
            trend={`+${Math.round((stats.activeStudents / Math.max(stats.totalStudents, 1)) * 100)}% active`}
          />
          <KPICard 
            title="New Admissions" 
            value={stats.newAdmissionsThisMonth} 
            subtitle="This month"
            icon={UserPlus}
          />
          <KPICard 
            title="Fees Collected" 
            value={formatCurrency(stats.feesCollected)} 
            icon={Wallet}
            trend="KES"
          />
          <KPICard 
            title="Outstanding Fees" 
            value={formatCurrency(stats.outstandingFees)} 
            subtitle={`${stats.studentsWithOutstanding} students`}
            icon={AlertCircle}
            trendPositive={false}
          />
        </div>

      {/* Student Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Students by Program</h2>
          {programChartData.length > 0 ? (
            <HorizontalBarChart data={programChartData} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              No program data available
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Student Status</h2>
          {statusChartData.length > 0 ? (
            <DonutChart data={statusChartData} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              No status data available
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button variant="secondary" className="w-full justify-start gap-2">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Requires Attention */}
      {attentionItems.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Requires Attention</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {attentionItems.map((item) => (
              <div 
                key={item.title}
                className={`rounded-lg border p-4 ${
                  item.priority === 'high' 
                    ? 'border-amber-200 bg-amber-50' 
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`h-5 w-5 ${
                    item.priority === 'high' ? 'text-amber-600' : 'text-slate-600'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h2>
        {recentStudents.length > 0 ? (
          <div className="space-y-4">
            {recentStudents.map((student) => (
              <div key={student.id} className="flex items-start gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                <div className="rounded-full bg-blue-50 p-2">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    New student registered
                    {student.program && typeof student.program === 'object' && 'name' in student.program && (
                      <span className="ml-2">
                        in {(student.program as { name: string }).name}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-sm text-slate-500 whitespace-nowrap">
                  {getRelativeTime(student.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            No recent activity
          </div>
        )}
      </div>

      {/* Academic Overview */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Academic Overview</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Programs</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalPrograms}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Courses</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.totalCourses}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Enrollments</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.activeEnrollments}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Active Students</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.activeStudents}</p>
          </div>
        </div>
      </div>
    </div>
    </DashboardClient>
  );
}