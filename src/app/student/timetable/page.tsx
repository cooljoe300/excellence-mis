import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/page-header';
import { getStudentTimetable } from '@/app/actions/timetable';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Download,
  Printer,
  BookOpen,
  ExternalLink,
} from 'lucide-react';

export default async function StudentTimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { student, timetables } = await getStudentTimetable();

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayClasses = timetables.filter(t => t.day === today);

  return (
    <div>
      <PageHeader
        title="My Timetable"
        description="View your class schedule based on enrolled units"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="secondary" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        }
      />

      {student && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-blue-700" />
            <div>
              <p className="font-medium text-blue-900">
                {student.first_name} {student.last_name}
              </p>
              <p className="text-sm text-blue-700">
                {student.student_number} • {student.program?.name || 'No program'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Today's Classes ({today})</h2>
        {todayClasses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">No classes scheduled for today</p>
            </CardContent>
          </Card>
        ) : (
          <DataTable>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Course</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Lecturer</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Room</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {todayClasses.map((timetable) => (
                    <tr key={timetable.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timetable.start_time} - {timetable.end_time}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{timetable.course?.code}</p>
                          <p className="text-xs text-slate-500">{timetable.course?.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {timetable.lecturer?.full_name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {timetable.room?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="capitalize">
                          {timetable.teaching_mode}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataTable>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {timetables.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-400" />
              <p className="mt-2 text-sm text-slate-600">
                No timetable entries found. Enroll in units to see your schedule.
              </p>
            </div>
          ) : (
            <DataTable>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Day</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Time</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Course</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Lecturer</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Room</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {timetables.map((timetable) => (
                      <tr key={timetable.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{timetable.day}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {timetable.start_time} - {timetable.end_time}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">{timetable.course?.code}</p>
                            <p className="text-xs text-slate-500">{timetable.course?.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{timetable.lecturer?.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">{timetable.room?.name}</td>
                        <td className="px-4 py-3">
                          <Badge className="capitalize">
                            {timetable.teaching_mode}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DataTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
