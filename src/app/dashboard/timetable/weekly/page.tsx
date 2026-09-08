import { PageHeader } from '@/components/ui/page-header';
import { getTimetables } from '@/app/actions/timetable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User } from 'lucide-react';
import { TIMETABLE_DAYS, getTimetableAxis, hourMarks, minutesToClock } from '@/lib/timetable-utils';

const axis = getTimetableAxis();
const hours = [...hourMarks(axis).map((mark) => mark.label), minutesToClock(axis.end)];

export default async function WeeklyTimetablePage() {
  const timetables = await getTimetables();

  // Group timetables by day and time
  const timetableGrid: Record<string, Record<string, any>> = {};
  
  timetables.forEach((tt) => {
    if (!timetableGrid[tt.day]) {
      timetableGrid[tt.day] = {};
    }
    const hour = tt.start_time.substring(0, 5);
    timetableGrid[tt.day][hour] = tt;
  });

  return (
    <div>
      <PageHeader
        title="Weekly Timetable"
        description="View the complete weekly schedule"
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border border-slate-200 bg-slate-50 p-2 text-left font-medium text-slate-700 w-16">
                    Time
                  </th>
                  {TIMETABLE_DAYS.map((day) => (
                    <th key={day} className="border border-slate-200 bg-slate-50 p-2 text-center font-medium text-slate-700 w-32">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map((hour) => (
                  <tr key={hour}>
                    <td className="border border-slate-200 bg-slate-50 p-2 text-center font-medium text-slate-600">
                      {hour}
                    </td>
                    {days.map((day) => {
                      const timetable = timetableGrid[day]?.[hour];
                      return (
                        <td key={`${day}-${hour}`} className="border border-slate-200 p-1 h-20 align-top">
                          {timetable ? (
                            <div className="h-full rounded bg-blue-50 border border-blue-200 p-1.5 flex flex-col justify-between">
                              <div className="font-medium text-blue-900 text-[10px] leading-tight">
                                {timetable.course?.code}
                              </div>
                              <div className="text-[9px] text-blue-700 truncate">
                                {timetable.course?.name}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-blue-600">
                                <User className="h-2.5 w-2.5" />
                                {timetable.lecturer?.full_name?.split(' ')[0]}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-blue-600">
                                <MapPin className="h-2.5 w-2.5" />
                                {timetable.room?.name}
                              </div>
                              <Badge status={timetable.status} className="text-[8px] px-1 py-0">
                                {timetable.status}
                              </Badge>
                            </div>
                          ) : (
                            <div className="h-full bg-slate-50 rounded" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
