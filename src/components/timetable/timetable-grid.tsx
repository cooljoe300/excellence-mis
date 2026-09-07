'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Plus,
  Download,
  Printer,
  Upload,
  FileText,
  Archive,
  RotateCcw,
  RotateCw,
  Search,
  Filter,
} from 'lucide-react';
import type { Timetable, Program, Room, TimeSlot, Intake } from '@/lib/types';

interface TimetableGridProps {
  timetables: Timetable[];
  programs: Program[];
  timeSlots: TimeSlot[];
  intakes: Intake[];
  onCellClick: (day: string, timeSlot: string, entry?: Timetable) => void;
  onTimetableUpdate: (timetable: Timetable) => void;
  onTimetableDelete: (id: string) => void;
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

export function TimetableGrid({
  timetables,
  programs,
  timeSlots,
  intakes,
  onCellClick,
  onTimetableUpdate,
  onTimetableDelete,
}: TimetableGridProps) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate time slots from the timeSlots prop
  const TIME_SLOTS = useMemo(() => {
    return timeSlots
      .filter(ts => ts.is_active && ts.is_visible !== false)
      .map(ts => `${ts.start_time}-${ts.end_time}`)
      .sort();
  }, [timeSlots]);

  // Filter timetables based on selected filters
  const filteredTimetables = useMemo(() => {
    return timetables.filter((tt) => {
      if (selectedProgram && tt.program_id !== selectedProgram) return false;
      if (selectedIntake && tt.intake_id !== selectedIntake) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tt.course?.code?.toLowerCase().includes(query) ||
          tt.course?.name?.toLowerCase().includes(query) ||
          tt.lecturer?.full_name?.toLowerCase().includes(query) ||
          tt.intake?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [timetables, selectedProgram, selectedIntake, searchQuery]);

  // Create a map of timetable entries by day and time slot
  const timetableMap = useMemo(() => {
    const map: Record<string, Timetable[]> = {};
    DAYS.forEach((day) => {
      TIME_SLOTS.forEach((slot) => {
        const key = `${day}-${slot}`;
        map[key] = [];
      });
    });

    filteredTimetables.forEach((tt) => {
      // Normalize time to ensure matching with time slots
      const startTime = tt.start_time || '';
      const endTime = tt.end_time || '';
      const key = `${tt.day}-${startTime}-${endTime}`;
      
      // Try to match with exact key first
      if (map[key]) {
        map[key].push(tt);
      } else {
        // Try to match by time slot range
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
  }, [filteredTimetables, TIME_SLOTS]);

  function handleExportExcel() {
    // TODO: Implement Excel export
    console.log('Export Excel');
  }

  function handleExportPDF() {
    // TODO: Implement PDF export
    console.log('Export PDF');
  }

  function handlePrint() {
    window.print();
  }

  function handleImportExcel() {
    // TODO: Implement Excel import
    console.log('Import Excel');
  }

  function handleAutoGenerate() {
    // TODO: Implement auto-generation
    console.log('Auto Generate');
  }

  // Display empty state when no entries match filters
  const showEmptyState = filteredTimetables.length === 0 && (selectedProgram || selectedIntake);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                id="intake_id"
                name="intake_id"
                options={[
                  { value: '', label: 'Intake' },
                  ...intakes.map((i) => ({ value: i.id, label: i.name })),
                ]}
                value={selectedIntake}
                onChange={(e) => setSelectedIntake(e.target.value)}
              />
              <Select
                id="program_id"
                name="program_id"
                options={[
                  { value: '', label: 'Programme' },
                  ...programs.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` })),
                ]}
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
              />
              <Input
                placeholder="Search units or lecturers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="secondary" size="sm" onClick={handleImportExcel}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAutoGenerate}>
                <Calendar className="h-4 w-4 mr-2" />
                Auto Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 bg-slate-50 z-10 px-4 py-3 text-left font-semibold text-slate-700 min-w-[100px] border-r border-slate-200">
                    Day / Time
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot}
                      className="px-3 py-3 text-center font-semibold text-slate-700 min-w-[100px] border-r border-slate-200"
                    >
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="border-b border-slate-100 hover:bg-slate-50">
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
                            className="px-2 py-2 min-w-[100px] border-r border-slate-200 h-24 align-top cursor-pointer hover:bg-slate-100"
                            onClick={() => onCellClick(day, slot)}
                          >
                            {entries.length > 0 ? (
                              <div className="space-y-1">
                                {entries.map((entry) => {
                                  const colorClass = getProgramColor(entry.program?.name || '');
                                  return (
                                    <div
                                      key={entry.id}
                                      className={`p-2 rounded border text-xs ${colorClass} cursor-pointer hover:opacity-80`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCellClick(day, slot, entry);
                                      }}
                                    >
                                      <div className="font-semibold">{entry.course?.code}</div>
                                      <div className="truncate">{entry.course?.name}</div>
                                      <div className="truncate text-xs text-slate-500">{entry.program?.name}</div>
                                      <div className="truncate text-xs text-slate-400">{entry.intake?.name}</div>
                                      <div className="truncate">{entry.lecturer?.full_name}</div>
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
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td 
                        colSpan={1} 
                        className="px-2 py-2 border-r border-slate-200 h-24 align-top"
                      >
                        <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                          No visible time slots configured
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
      
      {showEmptyState && (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-slate-600">
              No timetable entries found for the selected programme and intake.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
