import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { getTimetablesByFilter } from '@/app/actions/timetable';
import { Calendar, User, BookOpen } from 'lucide-react';

export default async function StudentTimetablePage() {
  const supabase = await createClient();
  const { data: { user } } = await (supabase.auth as any).getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-600">Please log in to view your timetable.</p>
      </div>
    );
  }

  // Get student record
  const { data: student } = await supabase
    .from('students')
    .select('*, program:programs(*), intake:intakes(*)')
    .eq('profile_id', user.id)
    .single();

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-600">Student record not found. Please contact administration.</p>
      </div>
    );
  }

  // Get active timetables for student's programme and intake
  const timetables = await getTimetablesByFilter({
    programId: student.program_id,
    intakeId: student.intake_id,
    status: 'active',
  });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Group timetables by day and time
  const timetableMap: Record<string, any[]> = {};
  DAYS.forEach((day) => {
    timetableMap[day] = [];
  });

  timetables.forEach((tt) => {
    if (timetableMap[tt.day]) {
      timetableMap[tt.day].push(tt);
    }
  });

  // Sort each day's entries by time
  Object.keys(timetableMap).forEach((day) => {
    timetableMap[day].sort((a, b) => {
      return a.start_time.localeCompare(b.start_time);
    });
  });

  return (
    <div>
      <PageHeader
        title="My Timetable"
        description="View your class schedule"
      />

      <div className="mb-6 space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">
                  {student.first_name} {student.last_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-slate-500" />
                <Badge variant="secondary">
                  {student.program?.code} - {student.program?.name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <Badge variant="secondary">
                  {student.intake?.name}
                </Badge>
              </div>
              {timetables.length > 0 && (
                <Badge variant="outline">
                  {timetables[0]?.academic_year}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {timetables.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No timetable published yet
            </h3>
            <p className="text-slate-600">
              Your timetable has not been published yet. Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {DAYS.map((day) => {
            const dayEntries = timetableMap[day];
            if (dayEntries.length === 0) return null;

            return (
              <Card key={day}>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{day}</h3>
                  <div className="space-y-3">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="default">{entry.course?.code}</Badge>
                              <span className="text-sm text-slate-600">
                                {entry.start_time} - {entry.end_time}
                              </span>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-1">
                              {entry.course?.name}
                            </h4>
                            <div className="text-sm text-slate-600">
                              <p>Lecturer: {entry.lecturer?.full_name}</p>
                              {entry.meeting_link && (
                                <a
                                  href={entry.meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  📺 Join Online Class
                                </a>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            ACTIVE
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
