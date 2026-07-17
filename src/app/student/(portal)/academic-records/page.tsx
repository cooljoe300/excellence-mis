import { redirect } from 'next/navigation';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getMyEnrollmentsWithFees } from '@/app/actions/student-enrollment';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataRow } from '@/components/ui/data-row';
import { formatDate } from '@/lib/utils';
import { BookOpen, Calendar, Award } from 'lucide-react';

export default async function AcademicRecordsPage() {
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  const enrollmentData = await getMyEnrollmentsWithFees();
  const enrollments = enrollmentData?.enrollments ?? [];

  const completedCredits = enrollments
    .filter((e) => e.status === 'completed')
    .reduce((sum, e) => sum + (e.course?.credits ?? 0), 0);

  const totalCredits = enrollments.reduce((sum, e) => sum + (e.course?.credits ?? 0), 0);

  const progressPercentage = totalCredits > 0 ? Math.round((completedCredits / totalCredits) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Academic Records"
        description="View your enrollment history and academic progress"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-blue-700" />
              Total Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{enrollments.length}</p>
            <p className="text-sm text-slate-500">Units registered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-blue-700" />
              Credits Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{completedCredits}</p>
            <p className="text-sm text-slate-500">of {totalCredits} total credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-blue-700" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{progressPercentage}%</p>
            <p className="text-sm text-slate-500">Program completion</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment History</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-600">
              You have not enrolled in any units yet.{' '}
              <a href="/student/enroll" className="text-blue-700 hover:underline">
                Register units now
              </a>
            </p>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => {
                const course = enrollment.course as { code: string; name: string; credits: number } | null;
                const term = enrollment.term as { name: string } | null;
                return (
                  <div
                    key={enrollment.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{course?.code}</h3>
                          <Badge status={enrollment.status as any}>{enrollment.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{course?.name}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>{course?.credits} credits</span>
                          <span>•</span>
                          <span>{term?.name || 'No term'}</span>
                          <span>•</span>
                          <span>Enrolled: {formatDate(enrollment.enrolled_at)}</span>
                        </div>
                      </div>
                      {enrollment.grade && (
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Grade</p>
                          <p className="text-lg font-bold text-slate-900">{enrollment.grade}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
