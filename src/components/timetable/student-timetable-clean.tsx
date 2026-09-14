'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw, AlertCircle } from 'lucide-react';
import type { NormalizedTimetableEntry } from '@/app/actions/student-timetable-new';
import type { TimeSlot } from '@/lib/types';

interface StudentTimetableCleanProps {
  data: {
    student: {
      first_name: string;
      last_name: string;
      student_number?: string;
      admission_number?: string;
    };
    programme: {
      name: string;
    } | null;
    intake: {
      name: string;
    } | null;
    timetables: NormalizedTimetableEntry[];
    timeSlots: TimeSlot[];
  } | { error: string };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function StudentTimetableClean({ data }: StudentTimetableCleanProps) {
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Error state
  if ('error' in data) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Unable to Load Timetable
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              {data.error}
            </p>
            <Button onClick={handleRefresh} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { student, programme, intake, timetables, timeSlots } = data;

  // Empty state
  if (timetables.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {student.first_name} {student.last_name}
                </h2>
                <p className="text-sm text-slate-600">
                  {student.student_number || student.admission_number || 'N/A'} · {programme?.name || 'Not assigned'}
                </p>
              </div>
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Timetable Available
            </h3>
            <p className="text-sm text-slate-600">
              There are currently no timetable entries for your registered units.
              Please contact administration if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group timetables by day
  const timetablesByDay = DAYS.reduce((acc, day) => {
    acc[day] = timetables.filter(tt => tt.day === day);
    return acc;
  }, {} as Record<string, NormalizedTimetableEntry[]>);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {student.first_name} {student.last_name}
              </h2>
              <p className="text-sm text-slate-600">
                {student.student_number || student.admission_number || 'N/A'} · {programme?.name || 'Not assigned'}
                {intake && ` · ${intake.name}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleRefresh} variant="secondary" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => window.print()} variant="secondary" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 w-24">
                    Time
                  </th>
                  {DAYS.map(day => (
                    <th key={day} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-600">
                      {day.slice(0, 3)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, slotIndex) => (
                  <tr key={slot.id} className="border-b border-slate-100">
                    <td className="px-4 py-2 text-xs text-slate-600 whitespace-nowrap">
                      {slot.start_time} – {slot.end_time}
                    </td>
                    {DAYS.map(day => {
                      const dayTimetables = timetablesByDay[day] || [];
                      const slotTimetables = dayTimetables.filter(
                        tt => tt.startTime === slot.start_time && tt.endTime === slot.end_time
                      );
                      
                      return (
                        <td key={`${day}-${slotIndex}`} className="px-2 py-2 align-top">
                          {slotTimetables.map(tt => (
                            <div
                              key={tt.id}
                              className="mb-1 rounded bg-blue-50 border border-blue-200 p-2 text-xs"
                            >
                              <div className="font-semibold text-blue-900 mb-1">
                                {tt.unit.code}
                              </div>
                              <div className="text-blue-700 mb-1">
                                {tt.unit.name}
                              </div>
                              <div className="text-blue-600">
                                {tt.lecturer?.name || 'Lecturer to be confirmed'}
                              </div>
                              {tt.room && (
                                <div className="text-blue-600">
                                  {tt.room.name}
                                </div>
                              )}
                            </div>
                          ))}
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
