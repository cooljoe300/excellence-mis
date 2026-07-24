import { PageHeader, EmptyState } from '@/components/ui/page-header';
import { StatCard, StatCardCurrency } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/page-header';
import { getAdminDashboardStats, getDashboardStats, getProfile, getRecentStudents } from '@/app/actions/dashboard';
import { formatDate } from '@/lib/utils';
import {
  Users,
  UserCheck,
  GraduationCap,
  BookOpen,
  ClipboardList,
  AlertCircle,
  CreditCard,
  Shield,
  UserCog,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const [stats, recentStudents, profile] = await Promise.all([
    getDashboardStats(),
    getRecentStudents(),
    getProfile(),
  ]);

  const isAdmin = profile?.role === 'superadmin' || profile?.role === 'admin';
  const adminStats = isAdmin ? await getAdminDashboardStats() : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of Excellence Online College student management"
        action={
          <Link href="/dashboard/students/new">
            <Button>+ Add Student</Button>
          </Link>
        }
      />

      {isAdmin && adminStats && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-slate-900">Super Admin</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                You have full access to manage users and all system data.
              </p>
            </div>
            <Link href="/dashboard/settings">
              <Button variant="secondary" size="sm">
                <UserCog className="h-4 w-4" />
                Admin settings
              </Button>
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total Users" value={adminStats.totalUsers} icon={UsersRound} />
            <StatCard title="Admins" value={adminStats.admins} icon={Shield} />
            <StatCard title="Staff" value={adminStats.staff} icon={Users} />
            <StatCard title="Teachers" value={adminStats.teachers} icon={GraduationCap} />
            <StatCard title="Students" value={adminStats.students} icon={Users} />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} subtitle={`${stats.activeStudents} active`} />
        <StatCard title="Programs" value={stats.totalPrograms} icon={GraduationCap} />
        <StatCard title="Courses" value={stats.totalCourses} icon={BookOpen} />
        <StatCard title="Active Enrollments" value={stats.activeEnrollments} icon={ClipboardList} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCardCurrency title="Total Revenue" amount={stats.totalRevenue} icon={CreditCard} />
        <StatCard title="Pending Fees" value={stats.pendingFees} icon={AlertCircle} />
        <StatCard title="Overdue Fees" value={stats.overdueFees} icon={UserCheck} />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recently Added Students</h2>
        {recentStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No students yet"
            description="Get started by registering your first student in the system."
            action={
              <Link href="/dashboard/students/new">
                <Button>+ Add Student</Button>
              </Link>
            }
          />
        ) : (
          <DataTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Student #</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Program</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs">{student.student_number}</td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/students/${student.id}`} className="font-medium text-blue-700 hover:underline">
                        {student.first_name} {student.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {(student.program as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={student.status}>{student.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(student.enrollment_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}
      </div>
    </div>
  );
}
