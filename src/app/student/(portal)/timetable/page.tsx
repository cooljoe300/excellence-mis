import { redirect } from 'next/navigation';
import { getMyStudentRecord } from '@/app/actions/student-self';
import { getMyEnrollmentsWithFees } from '@/app/actions/student-enrollment';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, BookOpen } from 'lucide-react';

export default async function TimetablePage() {
  const student = await getMyStudentRecord();
  if (!student) redirect('/student/register');

  const enrollmentData = await getMyEnrollmentsWithFees();
  const enrollments = enrollmentData?.enrollments ?? [];

  // Group enrollments by day of week (simulated - in real implementation, this would come from schedule data)
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = ['08:00 - 10:00', '10:00 - 12:00', '14:00 - 16:00', '16:00 - 18:00'];

  return (
    <div>
      <PageHeader
        title="Class Timetable"
        description="View your weekly class schedule"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-700" />
            Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-600 mb-4">
                You have not enrolled in any units yet.
              </p>
              <a
                href="/student/enroll"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Register units now
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">Time</th>
                    {days.map((day) => (
                      <th key={day} className="text-center py-3 px-4 font-semibold text-slate-900">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot) => (
                    <tr key={slot} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {slot}
                        </div>
                      </td>
                      {days.map((day) => {
                        // In a real implementation, this would match actual schedule data
                        const hasClass = Math.random() > 0.7;
                        const randomEnrollment = hasClass
                          ? enrollments[Math.floor(Math.random() * enrollments.length)]
                          : null;
                        const course = randomEnrollment?.course as { code: string; name: string } | null;

                        return (
                          <td key={`${slot}-${day}`} className="py-3 px-2 text-center">
                            {course ? (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <p className="font-semibold text-blue-900 text-xs">{course.code}</p>
                                <p className="text-blue-700 text-[10px] line-clamp-1">{course.name}</p>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {enrollments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Enrolled Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enrollments.map((enrollment) => {
                const course = enrollment.course as { code: string; name: string } | null;
                const term = enrollment.term as { name: string } | null;
                return (
                  <div
                    key={enrollment.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{course?.code}</p>
                      <p className="text-sm text-slate-600">{course?.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{term?.name || 'No term'}</p>
                    </div>
                    <Badge status={enrollment.status as any}>{enrollment.status}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
