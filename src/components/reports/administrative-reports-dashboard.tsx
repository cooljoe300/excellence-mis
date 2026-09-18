'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Briefcase, Users, GraduationCap, BookOpen, AlertTriangle, FileText, ArrowRight, TrendingUp, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReportsBundle } from '@/app/actions/reports';

interface AdministrativeReportsDashboardProps {
  data: ReportsBundle;
}

export function AdministrativeReportsDashboard({ data }: AdministrativeReportsDashboardProps) {
  const router = useRouter();

  // Calculate KPIs
  const totalPrograms = data.programs.length;
  const totalCourses = data.courses.length;
  const totalStudents = data.students.length;
  const graduatedStudents = data.students.filter(s => s.status === 'graduated').length;
  const withdrawnStudents = data.students.filter(s => s.status === 'withdrawn').length;
  
  // Data quality metrics
  const studentsWithoutPrograms = data.students.filter(s => !s.program_id).length;
  const studentsWithoutIntake = data.students.filter(s => !s.intake_id).length;
  const studentsWithoutPhone = data.students.filter(s => !s.phone).length;
  const studentsWithoutEmail = data.students.filter(s => !s.email).length;

  // Calculate students by programme
  const studentsByProgram = data.students.reduce((acc, student) => {
    if (student.program) {
      const programName = student.program.name || 'Unknown';
      acc[programName] = (acc[programName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate students by intake
  const studentsByIntake = data.students.reduce((acc, student) => {
    if (student.intake) {
      const intakeName = student.intake.name || 'Unknown';
      acc[intakeName] = (acc[intakeName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Calculate students by status
  const studentsByStatus = data.students.reduce((acc, student) => {
    const status = student.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const administrativeReports = [
    {
      key: 'executive-summary',
      title: 'Executive Summary',
      description: 'College-wide snapshot of students, programmes and finance',
      count: totalStudents,
      icon: BarChart3,
    },
    {
      key: 'admission-statistics',
      title: 'Admission Statistics',
      description: 'Admission counts by programme and status',
      count: totalStudents,
      icon: TrendingUp,
    },
    {
      key: 'intake-statistics',
      title: 'Intake Statistics',
      description: 'Student counts by intake',
      count: Object.keys(studentsByIntake).length,
      icon: Calendar,
    },
    {
      key: 'programs',
      title: 'Programme Statistics',
      description: 'Programme register and tuition',
      count: totalPrograms,
      icon: Briefcase,
    },
    {
      key: 'courses',
      title: 'Unit Register',
      description: 'Units and fees by programme',
      count: totalCourses,
      icon: BookOpen,
    },
    {
      key: 'graduated-students',
      title: 'Graduated Students',
      description: 'Graduated students with contact details',
      count: graduatedStudents,
      icon: GraduationCap,
    },
    {
      key: 'withdrawn-students',
      title: 'Withdrawn Students',
      description: 'Withdrawn students with contact details',
      count: withdrawnStudents,
      icon: Users,
    },
    {
      key: 'data-quality-students-without-programs',
      title: 'Students Without Programmes',
      description: 'Data quality: missing programme assignment',
      count: studentsWithoutPrograms,
      icon: AlertTriangle,
    },
    {
      key: 'data-quality-students-without-intake',
      title: 'Students Without Intake',
      description: 'Data quality: missing intake assignment',
      count: studentsWithoutIntake,
      icon: AlertTriangle,
    },
    {
      key: 'data-quality-students-without-phone',
      title: 'Students Without Phone',
      description: 'Data quality: missing phone on student profile',
      count: studentsWithoutPhone,
      icon: AlertTriangle,
    },
    {
      key: 'data-quality-students-without-email',
      title: 'Students Without Email',
      description: 'Data quality: missing email on student profile',
      count: studentsWithoutEmail,
      icon: AlertTriangle,
    },
  ];

  const navigateToReport = (reportKey: string) => {
    router.push(`/dashboard/reports?category=administrative-reports&report=${reportKey}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Administrative Reports</h1>
        <p className="text-slate-600">Executive summary, admission statistics, programme statistics and data quality reports</p>
      </div>

      {/* Overview KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalPrograms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Units/Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{totalCourses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Graduated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{graduatedStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{studentsWithoutPrograms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Intake</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{studentsWithoutIntake}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{studentsWithoutPhone}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{studentsWithoutEmail}</div>
          </CardContent>
        </Card>
      </div>

      {/* Programme Distribution */}
      {Object.keys(studentsByProgram).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Programme Distribution</CardTitle>
            <CardDescription>Student distribution across programmes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(studentsByProgram).map(([program, count]) => (
                <div key={program} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{program}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full" 
                        style={{ width: `${(count / totalStudents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-16 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Intake Distribution */}
      {Object.keys(studentsByIntake).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Intake Distribution</CardTitle>
            <CardDescription>Student distribution across intakes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(studentsByIntake).map(([intake, count]) => (
                <div key={intake} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{intake}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-600 rounded-full" 
                        style={{ width: `${(count / totalStudents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-900 w-16 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Student Status Distribution</CardTitle>
          <CardDescription>Current status of all students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(studentsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-slate-700 capitalize">{status}</span>
                <div className="flex items-center gap-3">
                  <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full" 
                      style={{ width: `${(count / totalStudents) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-900 w-16 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Administrative Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {administrativeReports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.key} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {report.count}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardTitle className="text-base">{report.title}</CardTitle>
                  <CardDescription className="mb-4 text-sm">{report.description}</CardDescription>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => navigateToReport(report.key)}
                      className="flex-1"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
