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
import type { Timetable, Program, Room, TimeSlot } from '@/lib/types';

interface TimetableGridProps {
  timetables: Timetable[];
  programs: Program[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  onCellClick: (day: string, timeSlot: string) => void;
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
  rooms,
  timeSlots,
  onCellClick,
  onTimetableUpdate,
  onTimetableDelete,
}: TimetableGridProps) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  // Generate time slots from the timeSlots prop
  const TIME_SLOTS = useMemo(() => {
    return timeSlots
      .filter(ts => ts.is_active)
      .map(ts => `${ts.start_time}-${ts.end_time}`)
      .sort();
  }, [timeSlots]);

  // Filter timetables based on selected filters
  const filteredTimetables = useMemo(() => {
    return timetables.filter((tt) => {
      if (selectedProgram && tt.program_id !== selectedProgram) return false;
      if (selectedDepartment && tt.department !== selectedDepartment) return false;
      if (selectedCampus && tt.campus !== selectedCampus) return false;
      if (selectedAcademicYear && tt.academic_year !== selectedAcademicYear) return false;
      if (selectedSemester && tt.semester !== selectedSemester) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tt.course?.code?.toLowerCase().includes(query) ||
          tt.course?.name?.toLowerCase().includes(query) ||
          tt.lecturer?.full_name?.toLowerCase().includes(query) ||
          tt.room?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [timetables, selectedProgram, selectedDepartment, selectedCampus, searchQuery, selectedAcademicYear, selectedSemester]);

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
      const key = `${tt.day}-${tt.start_time}-${tt.end_time}`;
      if (map[key]) {
        map[key].push(tt);
      }
    });

    return map;
  }, [filteredTimetables]);

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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                id="academic_year"
                name="academic_year"
                options={[
                  { value: '', label: 'Academic Year' },
                  { value: '2026/2027', label: '2026/2027' },
                  { value: '2025/2026', label: '2025/2026' },
                ]}
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
              />
              <Select
                id="semester"
                name="semester"
                options={[
                  { value: '', label: 'Semester' },
                  { value: 'Semester 1', label: 'Semester 1' },
                  { value: 'Semester 2', label: 'Semester 2' },
                ]}
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              />
              <Select
                id="campus"
                name="campus"
                options={[
                  { value: '', label: 'Campus' },
                  { value: 'Main Campus', label: 'Main Campus' },
                  { value: 'Town Campus', label: 'Town Campus' },
                ]}
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
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
                placeholder="Search..."
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
                    {TIME_SLOTS.map((slot) => {
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
                                    className={`p-2 rounded border text-xs ${colorClass}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // TODO: Open edit modal
                                    }}
                                  >
                                    <div className="font-semibold">{entry.course?.code}</div>
                                    <div className="truncate">{entry.course?.name}</div>
                                    <div className="truncate">{entry.lecturer?.full_name}</div>
                                    <div className="truncate">{entry.room?.name}</div>
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
