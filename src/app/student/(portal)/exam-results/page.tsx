import { redirect } from 'next/navigation';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getMyEnrollmentsWithFees } from '@/app/actions/student-enrollment';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataRow } from '@/components/ui/data-row';
import { formatDate } from '@/lib/utils';
import { Award, TrendingUp, AlertCircle } from 'lucide-react';

export default async function ExamResultsPage() {
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  const enrollmentData = await getMyEnrollmentsWithFees();
  const enrollments = enrollmentData?.enrollments ?? [];

  const gradedEnrollments = enrollments.filter((e) => e.grade && e.status === 'completed');
  
  const averageScore = gradedEnrollments.length > 0
    ? gradedEnrollments.reduce((sum, e) => sum + (e.score ?? 0), 0) / gradedEnrollments.length
    : 0;

  const gradeDistribution = gradedEnrollments.reduce((acc, e) => {
    const grade = e.grade || 'N/A';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getGradeColor = (grade: string): string => {
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper === 'A' || gradeUpper === 'A+') return 'bg-emerald-100 text-emerald-800';
    if (gradeUpper === 'B' || gradeUpper === 'B+') return 'bg-blue-100 text-blue-800';
    if (gradeUpper === 'C' || gradeUpper === 'C+') return 'bg-amber-100 text-amber-800';
    if (gradeUpper === 'D') return 'bg-orange-100 text-orange-800';
    if (gradeUpper === 'F' || gradeUpper === 'E') return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div>
      <PageHeader
        title="Exam Results"
        description="View your examination grades and academic performance"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-4 w-4 text-blue-700" />
              Graded Units
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{gradedEnrollments.length}</p>
            <p className="text-sm text-slate-500">Units with grades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-blue-700" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{averageScore.toFixed(1)}%</p>
            <p className="text-sm text-slate-500">Overall performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-blue-700" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {enrollments.length - gradedEnrollments.length}
            </p>
            <p className="text-sm text-slate-500">Units awaiting results</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grade Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(gradeDistribution).length === 0 ? (
            <p className="text-sm text-slate-600">No grades available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(gradeDistribution).map(([grade, count]) => (
                <span key={grade} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${getGradeColor(grade)}`}>
                  {grade}: {count}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detailed Results</CardTitle>
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
                      <div className="text-right">
                        {enrollment.grade ? (
                          <>
                            <p className="text-sm text-slate-500">Grade</p>
                            <Badge className={`${getGradeColor(enrollment.grade)} text-lg px-3 py-1`}>
                              {enrollment.grade}
                            </Badge>
                            {enrollment.score && (
                              <p className="text-sm text-slate-500 mt-1">{enrollment.score}%</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">Pending</p>
                        )}
                      </div>
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
