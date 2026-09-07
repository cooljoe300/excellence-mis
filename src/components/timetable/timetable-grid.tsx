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
  onPreview?: (programId?: string, intakeId?: string, status?: string) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
  onPreview,
}: TimetableGridProps) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Generate time slots from the timeSlots prop
  const TIME_SLOTS = useMemo(() => {
    if (!timeSlots || timeSlots.length === 0) {
      // Fallback to standard time slots if none configured
      return ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
    }
    
    const slots = timeSlots
      .map(ts => `${ts.start_time}-${ts.end_time}`)
      .sort();
    
    return slots;
  }, [timeSlots]);

  // Filter timetables based on selected filters
  const filteredTimetables = useMemo(() => {
    const filtered = timetables.filter((tt) => {
      // Only filter if a value is actually selected (not empty string)
      if (selectedProgram && selectedProgram !== '' && tt.program_id !== selectedProgram) return false;
      if (selectedIntake && selectedIntake !== '' && tt.intake_id !== selectedIntake) return false;
      if (selectedStatus && selectedStatus !== 'all' && tt.status !== selectedStatus) return false;
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
    
    console.log('Filter debugging:', {
      totalTimetables: timetables.length,
      filteredTimetables: filtered.length,
      selectedProgram,
      selectedIntake,
      selectedStatus,
      sampleTimetable: timetables[0]
    });
    
    return filtered;
  }, [timetables, selectedProgram, selectedIntake, selectedStatus, searchQuery]);



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
      // Normalize day to ensure case-insensitive matching
      const normalizedDay = tt.day?.charAt(0).toUpperCase() + tt.day?.slice(1).toLowerCase() || '';
      const matchedDay = DAYS.find(d => d.toLowerCase() === normalizedDay.toLowerCase()) || tt.day;
      
      // Normalize time to ensure matching with time slots
      const startTime = tt.start_time || '';
      const endTime = tt.end_time || '';
      const key = `${matchedDay}-${startTime}-${endTime}`;
      
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
          const fallbackKey = `${matchedDay}-${slotKey}`;
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
              <Select
                id="status"
                name="status"
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                ]}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
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
              {onPreview && (
                <Button variant="secondary" size="sm" onClick={() => onPreview(selectedProgram, selectedIntake, selectedStatus)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Preview Timetable
                </Button>
              )}
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
                  <th className="sticky left-0 bg-slate-50 z-10 px-2 py-2 text-left font-semibold text-slate-700 min-w-[70px] border-r border-slate-200 text-xs">
                    Time
                  </th>
                  {TIME_SLOTS.map((slot) => (
                    <th
                      key={slot}
                      className="px-2 py-2 text-center font-semibold text-slate-700 min-w-[160px] border-r border-slate-200 text-xs"
                    >
                      {slot}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, index) => (
                  <tr key={day} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="sticky left-0 bg-white z-10 px-2 py-2 font-medium text-slate-900 border-r border-slate-200 text-xs" title={day}>
                      {DAY_LABELS[index]}
                    </td>
                    {TIME_SLOTS.length > 0 ? (
                      TIME_SLOTS.map((slot) => {
                        const key = `${day}-${slot}`;
                        const entries = timetableMap[key] || [];
                        
                        return (
                          <td
                            key={slot}
                            className="px-1 py-1 min-w-[160px] border-r border-slate-200 h-28 align-top cursor-pointer hover:bg-slate-100"
                            onClick={() => onCellClick(day, slot)}
                          >
                            {entries.length > 0 ? (
                              <div className="space-y-1">
                                {entries.map((entry) => {
                                  const colorClass = getProgramColor(entry.program?.name || '');
                                  return (
                                    <div
                                      key={entry.id}
                                      className={`p-1.5 rounded border text-[10px] ${colorClass} cursor-pointer hover:opacity-80`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onCellClick(day, slot, entry);
                                      }}
                                    >
                                      <div className="font-semibold text-[10px]">{entry.course?.code}</div>
                                      <div className="truncate text-[9px]">{entry.course?.name}</div>
                                      <div className="truncate text-[9px] text-slate-600">{entry.lecturer?.full_name}</div>
                                      <Badge 
                                        variant={entry.status === 'active' ? 'default' : 'secondary'}
                                        className="text-[8px] mt-0.5"
                                      >
                                        {entry.status?.toUpperCase()}
                                      </Badge>
                                      {entry.meeting_link && (
                                        <div className="text-[8px] text-blue-600 mt-0.5">
                                          📺
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-slate-300">
                                <Plus className="h-3 w-3" />
                              </div>
                            )}
                          </td>
                        );
                      })
                    ) : (
                      <td 
                        colSpan={1} 
                        className="px-1 py-1 border-r border-slate-200 h-28 align-top"
                      >
                        <div className="h-full flex items-center justify-center text-slate-400 italic text-[10px]">
                          No slots
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
