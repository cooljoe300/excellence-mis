import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDashboardStats } from '@/app/actions/dashboard';
import { getStudents } from '@/app/actions/students';
import { getPrograms } from '@/app/actions/programs';
import { getFeePayments } from '@/app/actions/fees';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default async function ReportsPage() {
  const [stats, students, programs, fees] = await Promise.all([
    getDashboardStats(),
    getStudents(),
    getPrograms(),
    getFeePayments(),
  ]);

  const byStatus: Record<string, number> = students.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byProgram: Record<string, number> = students.reduce(
    (acc, s) => {
      const name = (s.program as { name: string } | null)?.name ?? 'Unassigned';
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const feeSummary: Record<string, number> = fees.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Institutional analytics and summary reports"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Students by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge status={status}>{status}</Badge>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
            ))}
            {Object.keys(byStatus).length === 0 && (
              <p className="text-sm text-slate-500">No student data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Students by Program</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(byProgram).map(([program, count]) => (
              <div key={program} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{program}</span>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total revenue collected</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(stats.totalRevenue)}</span>
            </div>
            {Object.entries(feeSummary).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <Badge status={status}>{status}</Badge>
                <span className="font-semibold">{count} records</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Programs Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {programs.map((program) => (
              <div key={program.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900">{program.name}</p>
                  <p className="text-slate-500">{program.code} · {program.duration_months} months</p>
                </div>
                <span className="font-semibold text-slate-700">{formatCurrency(program.tuition_fee)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
