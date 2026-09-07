'use client';

import { useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Printer, Download } from 'lucide-react';
import type { Timetable, Program, Intake, TimeSlot } from '@/lib/types';

interface TimetablePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  timetables: Timetable[];
  program?: Program;
  intake?: Intake;
  academicYear?: string;
  timeSlots: TimeSlot[];
  isDraft?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Color coding by department/program
const PROGRAM_COLORS: Record<string, string> = {
  'Business': 'bg-blue-100 border-blue-300 text-blue-900',
  'ICT': 'bg-green-100 border-green-300 text-green-900',
  'Education': 'bg-purple-100 border-purple-300 text-purple-900',
  'Health Sciences': 'bg-orange-100 border-orange-300 text-orange-900',
  'Engineering': 'bg-red-100 border-red-300 text-red-900',
  'default': 'bg-slate-100 border-slate-300 text-slate-900',
};

function getProgramColor(programName: string): string {
  for (const [key, value] of Object.entries(PROGRAM_COLORS)) {
    if (programName.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return PROGRAM_COLORS.default;
}

export function TimetablePreview({
  isOpen,
  onClose,
  timetables,
  program,
  intake,
  academicYear,
  timeSlots,
  isDraft = false,
}: TimetablePreviewProps) {
  // Generate time slots from the timeSlots prop
  const TIME_SLOTS = useMemo(() => {
    return timeSlots
      .filter(ts => ts.is_active && ts.is_visible !== false)
      .map(ts => `${ts.start_time}-${ts.end_time}`)
      .sort();
  }, [timeSlots]);

  // Create a map of timetable entries by day and time slot
  const timetableMap = useMemo(() => {
    const map: Record<string, Timetable[]> = {};
    DAYS.forEach((day) => {
      TIME_SLOTS.forEach((slot) => {
        const key = `${day}-${slot}`;
        map[key] = [];
      });
    });

    timetables.forEach((tt) => {
      const startTime = tt.start_time || '';
      const endTime = tt.end_time || '';
      const key = `${tt.day}-${startTime}-${endTime}`;
      
      if (map[key]) {
        map[key].push(tt);
      } else {
        const slotKey = TIME_SLOTS.find(slot => {
          const [slotStart, slotEnd] = slot.split('-');
          return startTime === slotStart && endTime === slotEnd;
        });
        
        if (slotKey) {
          const fallbackKey = `${tt.day}-${slotKey}`;
          if (map[fallbackKey]) {
            map[fallbackKey].push(tt);
          }
        }
      }
    });

    return map;
  }, [timetables, TIME_SLOTS]);

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    // TODO: Implement PDF download
    console.log('Download PDF');
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {isDraft ? 'Draft ' : ''}Timetable Preview
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
              {program && <Badge variant="secondary">{program.code} - {program.name}</Badge>}
              {intake && <Badge variant="secondary">{intake.name}</Badge>}
              {academicYear && <Badge variant="secondary">{academicYear}</Badge>}
              {isDraft && <Badge variant="outline">DRAFT</Badge>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left font-semibold text-slate-700 min-w-[100px] border-r border-slate-200">
                      Day / Time
                    </th>
                    {TIME_SLOTS.map((slot) => (
                      <th
                        key={slot}
                        className="px-3 py-3 text-center font-semibold text-slate-700 min-w-[120px] border-r border-slate-200"
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <tr key={day} className="border-b border-slate-100">
                      <td className="sticky left-0 bg-white z-10 px-4 py-3 font-medium text-slate-900 border-r border-slate-200">
                        {day}
                      </td>
                      {TIME_SLOTS.length > 0 ? (
                        TIME_SLOTS.map((slot) => {
                          const key = `${day}-${slot}`;
                          const entries = timetableMap[key] || [];
                          
                          return (
                            <td
                              key={slot}
                              className="px-2 py-2 min-w-[120px] border-r border-slate-200 h-32 align-top"
                            >
                              {entries.length > 0 ? (
                                <div className="space-y-1">
                                  {entries.map((entry) => {
                                    const colorClass = getProgramColor(entry.program?.name || '');
                                    return (
                                      <div
                                        key={entry.id}
                                        className={`p-2 rounded border text-xs ${colorClass}`}
                                      >
                                        <div className="font-semibold">{entry.course?.code}</div>
                                        <div className="truncate">{entry.course?.name}</div>
                                        <div className="truncate text-xs text-slate-500">{entry.lecturer?.full_name}</div>
                                        {entry.meeting_link && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            📺 Online Class
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center text-slate-300">
                                  —
                                </div>
                              )}
                            </td>
                          );
                        })
                      ) : (
                        <td 
                          colSpan={1} 
                          className="px-2 py-2 border-r border-slate-200 h-32 align-top"
                        >
                          <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                            No time slots configured
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
}
