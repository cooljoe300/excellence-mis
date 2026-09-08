import { PageHeader } from '@/components/ui/page-header';
import { getTimetables, getTimeSlots } from '@/app/actions/timetable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User } from 'lucide-react';
import type { Timetable } from '@/lib/types';
import {
  TIMETABLE_DAYS,
  type DisplayTimeSlot,
  entriesForSlot,
  getDisplayTimeSlots,
  isPrimarySlotForEntry,
} from '@/lib/timetable-utils';

function entriesInSlot(timetables: Timetable[], day: string, slot: DisplayTimeSlot) {
  return entriesForSlot(timetables, day, slot).filter((entry) => isPrimarySlotForEntry(entry, slot));
}

export default async function WeeklyTimetablePage() {
  const [timetables, timeSlots] = await Promise.all([getTimetables(), getTimeSlots()]);
  const slots = getDisplayTimeSlots(timeSlots);

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
                  <th className="border border-slate-200 bg-slate-50 p-2 text-left font-medium text-slate-700 w-28">
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
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="border border-slate-200 bg-slate-50 p-2 text-center font-medium text-slate-600">
                      {slot.label}
                    </td>
                    {TIMETABLE_DAYS.map((day) => {
                      const entries = entriesInSlot(timetables, day, slot);
                      return (
                        <td key={`${day}-${slot.id}`} className="border border-slate-200 p-1 h-20 align-top">
                          {entries.length > 0 ? (
                            <div className="flex h-full flex-col gap-1">
                              {entries.map((timetable) => (
                                <div
                                  key={timetable.id}
                                  className="flex min-h-0 flex-1 flex-col justify-between rounded border border-blue-200 bg-blue-50 p-1.5"
                                >
                                  <div className="font-medium text-blue-900 text-[10px] leading-tight">
                                    {timetable.course?.code}
                                  </div>
                                  <div className="truncate text-[9px] text-blue-700">
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
                                  <Badge status={timetable.status} className="px-1 py-0 text-[8px]">
                                    {timetable.status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full rounded bg-slate-50" />
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
