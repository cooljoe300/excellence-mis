import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatCardCurrency } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/page-header';
import { getDashboardStats, getRecentStudents } from '@/app/actions/dashboard';
import { formatDate } from '@/lib/utils';
import { Users, UserCheck, GraduationCap, BookOpen, ClipboardList, AlertCircle, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const [stats, recentStudents] = await Promise.all([
    getDashboardStats(),
    getRecentStudents(),
  ]);

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
          <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
            No students yet.{' '}
            <Link href="/dashboard/students/new" className="text-blue-700 hover:underline">
              Add your first student
            </Link>
          </div>
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
