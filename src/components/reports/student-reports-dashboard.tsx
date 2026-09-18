'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, UserPlus, GraduationCap, Briefcase, Calendar, Phone, Mail, AlertCircle, ArrowRight, FileText, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReportsBundle } from '@/app/actions/reports';

interface StudentReportsDashboardProps {
  data: ReportsBundle;
}

export function StudentReportsDashboard({ data }: StudentReportsDashboardProps) {
  const router = useRouter();

  // Calculate KPIs
  const totalStudents = data.students.length;
  const activeStudents = data.students.filter(s => s.status === 'active').length;
  const inactiveStudents = data.students.filter(s => s.status === 'inactive').length;
  const graduatedStudents = data.students.filter(s => s.status === 'graduated').length;
  const withdrawnStudents = data.students.filter(s => s.status === 'withdrawn').length;
  
  // Calculate data quality metrics
  const studentsWithPrograms = data.students.filter(s => s.program_id).length;
  const studentsWithoutPrograms = data.students.filter(s => !s.program_id).length;
  const studentsWithIntake = data.students.filter(s => s.intake_id).length;
  const studentsWithoutIntake = data.students.filter(s => !s.intake_id).length;
  const studentsWithPhone = data.students.filter(s => s.phone).length;
  const studentsWithoutPhone = data.students.filter(s => !s.phone).length;
  const studentsWithEmail = data.students.filter(s => s.email).length;
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

  const studentReports = [
    {
      key: 'student-register',
      title: 'All Students',
      description: 'Complete list of all students currently recorded in the MIS',
      count: totalStudents,
      icon: Users,
    },
    {
      key: 'active-students',
      title: 'Active Students',
      description: 'Currently active students and their contact information',
      count: activeStudents,
      icon: UserCheck,
    },
    {
      key: 'inactive-students',
      title: 'Inactive Students',
      description: 'Inactive student records with phone and email',
      count: inactiveStudents,
      icon: UserX,
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
      icon: UserX,
    },
    {
      key: 'students-by-program',
      title: 'Students by Programme',
      description: 'Student listing filtered by programme',
      count: totalStudents,
      icon: Briefcase,
    },
    {
      key: 'students-by-intake',
      title: 'Students by Intake',
      description: 'Student listing filtered by intake',
      count: totalStudents,
      icon: Calendar,
    },
    {
      key: 'students-by-status',
      title: 'Student Status',
      description: 'Students grouped by status with contacts',
      count: totalStudents,
      icon: Users,
    },
    {
      key: 'student-contact-list',
      title: 'Student Contact List',
      description: 'Phone and email directory from student profiles',
      count: studentsWithPhone,
      icon: Phone,
    },
    {
      key: 'incomplete-profiles',
      title: 'Incomplete Profiles',
      description: 'Students missing programme, intake, phone or email',
      count: studentsWithoutPrograms + studentsWithoutIntake + studentsWithoutPhone + studentsWithoutEmail,
      icon: AlertCircle,
    },
  ];

  const navigateToReport = (reportKey: string) => {
    router.push(`/dashboard/reports?category=student-reports&report=${reportKey}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Student Reports</h1>
        <p className="text-slate-600">Student population, admissions, programme, intake, status and profile information</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">All Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{totalStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Inactive Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{inactiveStudents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">New Admissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{totalStudents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Quality KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">With Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentsWithPrograms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Programmes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{studentsWithoutPrograms}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">With Intake</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentsWithIntake}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Intake</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{studentsWithoutIntake}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">With Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentsWithPhone}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Phone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{studentsWithoutPhone}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">With Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{studentsWithEmail}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Without Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{studentsWithoutEmail}</div>
          </CardContent>
        </Card>
      </div>

      {/* Students by Programme */}
      {Object.keys(studentsByProgram).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students by Programme</CardTitle>
            <CardDescription>Distribution of students across programmes</CardDescription>
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

      {/* Students by Intake */}
      {Object.keys(studentsByIntake).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students by Intake</CardTitle>
            <CardDescription>Distribution of students across intakes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(studentsByIntake).map(([intake, count]) => (
                <div key={intake} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{intake}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full" 
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

      {/* Student Reports List */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Available Reports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {studentReports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.key} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
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
