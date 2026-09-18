'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, BookOpen, Briefcase, Users, CalendarCheck, GraduationCap, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReportsBundle } from '@/app/actions/reports';

interface AcademicReportsDashboardProps {
  data: ReportsBundle;
}

export function AcademicReportsDashboard({ data }: AcademicReportsDashboardProps) {
  const router = useRouter();

  // Calculate KPIs
  const totalEnrollments = data.enrollments.length;
  const activeEnrollments = data.enrollments.filter(e => e.status === 'active').length;
  const totalPrograms = data.programs.length;
  const totalCourses = data.courses.length;
  const totalAttendance = data.attendance.length;
  const studentsWithEnrollments = new Set(data.enrollments.map(e => e.student_id)).size;

  // Calculate enrollments by programme
  const enrollmentsByProgram = data.enrollments.reduce((acc, enrollment) => {
    if (enrollment.student && enrollment.student.program) {
      const programName = enrollment.student.program.name || 'Unknown';
      acc[programName] = (acc[programName] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const academicReports = [
    {
      key: 'enrollments',
      title: 'Enrollments',
      description: 'Student unit enrollments with contact details',
      count: totalEnrollments,
      icon: ClipboardList,
    },
    {
      key: 'program-enrollment',
      title: 'Programme Enrollment',
      description: 'Active and total students by programme',
      count: totalPrograms,
      icon: Briefcase,
    },
    {
      key: 'unit-enrollments',
      title: 'Unit / Subject Enrollment',
      description: 'Every unit enrollment with student contacts',
      count: totalEnrollments,
      icon: BookOpen,
    },
    {
      key: 'student-academic-records',
      title: 'Student Academic Records',
      description: 'Enrollment and grade records with student contacts',
      count: totalEnrollments,
      icon: GraduationCap,
    },
    {
      key: 'attendance',
      title: 'Attendance',
      description: 'Attendance register with student phone and email',
      count: totalAttendance,
      icon: CalendarCheck,
    },
  ];

  const navigateToReport = (reportKey: string) => {
    router.push(`/dashboard/reports?category=academic-reports&report=${reportKey}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Academic Reports</h1>
        <p className="text-slate-600">Enrollments, programme enrollment, unit enrollment, academic records and attendance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeEnrollments}</div>
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
            <div className="text-3xl font-bold text-purple-600">{totalCourses}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Students With Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{studentsWithEnrollments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalAttendance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollments by Programme */}
      {Object.keys(enrollmentsByProgram).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enrollments by Programme</CardTitle>
            <CardDescription>Distribution of enrollments across programmes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(enrollmentsByProgram).map(([program, count]) => (
                <div key={program} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{program}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full" 
                        style={{ width: `${(count / totalEnrollments) * 100}%` }}
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

      {/* Academic Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {academicReports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.key} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-green-50 text-green-600">
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
