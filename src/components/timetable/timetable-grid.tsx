'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Printer, Pencil, Link } from 'lucide-react';
import type { Timetable, Program, TimeSlot, Intake } from '@/lib/types';
import {
  TIMETABLE_DAYS,
  TIMETABLE_DAY_LABELS,
  cardHeightForDuration,
  entriesForSlot,
  formatTimeRange,
  getDisplayTimeSlots,
  isPrimarySlotForEntry,
} from '@/lib/timetable-utils';
import { getProgrammeColourClasses, getSharedClassColourClasses } from '@/lib/programme-colours';
import { ProgrammeLegend } from './programme-legend';

interface TimetableGridProps {
  timetables: Timetable[];
  programs: Program[];
  timeSlots: TimeSlot[];
  intakes: Intake[];
  onCellClick: (day: string, timeSlot: string, entry?: Timetable) => void;
  onAddEntry: () => void;
  onPreview?: (programId?: string, intakeId?: string, status?: string) => void;
  onPrint?: (programId?: string, intakeId?: string, status?: string) => void;
}

function getEntryColourClasses(entry: Timetable): {
  border: string;
  background: string;
  text: string;
  badge: string;
} {
  // Use shared class colour for shared classes
  if (entry.class_type === 'shared') {
    return getSharedClassColourClasses();
  }

  // Use programme colour for regular classes
  const programmeId = entry.program_id || (entry.programme_assignments?.[0]?.programme_id);
  const programmeName = entry.program?.name || entry.programme_assignments?.[0]?.programme?.name;
  return getProgrammeColourClasses(programmeId, programmeName);
}

export function TimetableGrid({
  timetables,
  programs,
  timeSlots,
  intakes,
  onCellClick,
  onAddEntry,
  onPreview,
  onPrint,
}: TimetableGridProps) {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedIntake, setSelectedIntake] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displaySlots = useMemo(() => getDisplayTimeSlots(timeSlots), [timeSlots]);

  const filteredTimetables = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return timetables.filter((tt) => {
      if (selectedProgram && tt.program_id !== selectedProgram) return false;
      if (selectedIntake && tt.intake_id !== selectedIntake) return false;
      if (selectedStatus !== 'all' && tt.status !== selectedStatus) return false;
      if (!query) return true;
      return Boolean(
        tt.course?.code?.toLowerCase().includes(query) ||
          tt.course?.name?.toLowerCase().includes(query) ||
          tt.lecturer?.full_name?.toLowerCase().includes(query) ||
          tt.room?.name?.toLowerCase().includes(query) ||
          tt.intake?.name?.toLowerCase().includes(query)
      );
    });
  }, [timetables, selectedProgram, selectedIntake, selectedStatus, searchQuery]);

  const filters = { programId: selectedProgram, intakeId: selectedIntake, status: selectedStatus };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <Select
                id="filter_intake"
                options={[
                  { value: '', label: 'All intakes' },
                  ...intakes.map((intake) => ({ value: intake.id, label: intake.name })),
                ]}
                value={selectedIntake}
                onChange={(event) => setSelectedIntake(event.target.value)}
                aria-label="Filter by intake"
              />
              <Select
                id="filter_program"
                options={[
                  { value: '', label: 'All programmes' },
                  ...programs.map((program) => ({
                    value: program.id,
                    label: `${program.code} - ${program.name}`,
                  })),
                ]}
                value={selectedProgram}
                onChange={(event) => setSelectedProgram(event.target.value)}
                aria-label="Filter by programme"
              />
              <Select
                id="filter_status"
                options={[
                  { value: 'all', label: 'All status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Active' },
                ]}
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                aria-label="Filter by status"
              />
              <Input
                placeholder="Search units, lecturers or rooms..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-56"
                aria-label="Search units, lecturers or rooms"
              />
            </div>
            
            {/* Programme Legend */}
            <ProgrammeLegend
              programmes={programs}
              timetables={filteredTimetables}
              showCompact
            />
            <div className="flex flex-wrap gap-2">
              {onPreview && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPreview(filters.programId, filters.intakeId, filters.status)}
                >
                  Preview Timetable
                </Button>
              )}
              {onPrint && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onPrint(filters.programId, filters.intakeId, filters.status)}
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              )}
              <Button size="sm" onClick={onAddEntry}>
                <Plus className="h-4 w-4" />
                Add Timetable Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="sticky left-0 z-10 w-[80px] min-w-[80px] max-w-[90px] border-r border-slate-200 bg-slate-50 px-2 py-2 text-left text-xs font-semibold text-slate-700">
                    Day
                  </th>
                  {displaySlots.map((slot) => (
                    <th
                      key={slot.id}
                      className="border-r border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-700"
                    >
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIMETABLE_DAYS.map((day) => (
                  <tr key={day} className="border-b border-slate-100">
                    <td
                      className="sticky left-0 z-10 w-[80px] min-w-[80px] max-w-[90px] border-r border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900"
                      title={day}
                    >
                      {TIMETABLE_DAY_LABELS[day]}
                    </td>
                    {displaySlots.map((slot) => {
                      const entries = entriesForSlot(filteredTimetables, day, slot);
                      const slotValue = `${slot.start}-${slot.end}`;
                      return (
                        <td
                          key={`${day}-${slot.id}`}
                          className="h-24 min-w-[150px] cursor-pointer border-r border-slate-200 px-1 py-1 align-top hover:bg-slate-50"
                          onClick={() => onCellClick(day, slotValue)}
                        >
                          {entries.length > 0 ? (
                            <div className="space-y-2">
                              {entries.map((entry, index) => {
                                const primary = isPrimarySlotForEntry(entry, slot);
                                const colourClasses = getEntryColourClasses(entry);
                                const isShared = entry.class_type === 'shared';
                                const previousEntry = entries[index - 1];
                                const previousProgrammeId = previousEntry?.program_id || previousEntry?.programme_assignments?.[0]?.programme_id;
                                const currentProgrammeId = entry.program_id || entry.programme_assignments?.[0]?.programme_id;
                                const differentProgramme = previousProgrammeId && currentProgrammeId !== previousProgrammeId;
                                
                                return (
                                  <div key={entry.id} className="relative">
                                    {/* Programme separator line */}
                                    {differentProgramme && (
                                      <div 
                                        className="my-1 border-t border-slate-200"
                                        style={{ height: '1px' }}
                                      />
                                    )}
                                    
                                    <article
                                      className="relative rounded border border-slate-200 border-l-4 p-1.5 text-left"
                                      style={{
                                        borderLeftColor: colourClasses.border,
                                        backgroundColor: colourClasses.background,
                                        minHeight: primary ? cardHeightForDuration(entry.start_time, entry.end_time) : undefined,
                                      }}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        onCellClick(day, slotValue, entry);
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className="absolute right-1 top-1 rounded p-0.5 text-slate-500 hover:bg-white hover:text-slate-800"
                                        aria-label={`Edit ${entry.course?.code || 'timetable entry'}`}
                                        title="Edit timetable entry"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          onCellClick(day, slotValue, entry);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      
                                      {/* Programme indicator */}
                                      <div className="flex items-center gap-1 mb-1">
                                        {isShared ? (
                                          <div className="flex items-center gap-1">
                                            <Link className="h-3 w-3" style={{ color: colourClasses.text }} />
                                            <span className="text-[9px] font-semibold" style={{ color: colourClasses.text }}>
                                              SHARED CLASS
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-[9px] font-semibold" style={{ color: colourClasses.text }}>
                                            {entry.program?.code || entry.programme_assignments?.[0]?.programme?.code || 'PROGRAMME'}
                                          </span>
                                        )}
                                      </div>

                                    <p className="pr-5 text-[11px] font-bold leading-tight text-slate-900">
                                      {entry.course?.code || 'Unit'}
                                    </p>
                                    {primary && (
                                      <>
                                        <p className="mt-0.5 text-[10px] leading-snug text-slate-700">
                                          {entry.course?.name}
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-600">
                                          Lecturer: {entry.lecturer?.full_name || 'To Be Confirmed'}
                                        </p>
                                        <p className="text-[10px] text-slate-600">
                                          Room: {entry.room?.name || 'Online'}
                                        </p>
                                        <p className="mt-1 text-[10px] font-medium text-slate-800">
                                          {formatTimeRange(entry.start_time, entry.end_time)}
                                        </p>
                                        <Badge
                                          status={entry.status}
                                          className="mt-1 text-[9px] uppercase tracking-wide"
                                        >
                                          {entry.status}
                                        </Badge>
                                        
                                        {/* Shared class programme indicators */}
                                        {isShared && entry.programme_assignments && entry.programme_assignments.length > 0 && (
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {entry.programme_assignments.slice(0, 3).map((assignment) => {
                                              const progColour = getProgrammeColourClasses(assignment.programme_id, assignment.programme?.name);
                                              return (
                                                <span
                                                  key={assignment.programme_id}
                                                  className="text-[8px] px-1.5 py-0.5 rounded-full"
                                                  style={{
                                                    backgroundColor: progColour.background,
                                                    color: progColour.text,
                                                    border: `1px solid ${progColour.border}`,
                                                  }}
                                                >
                                                  {assignment.programme?.code || 'PROG'}
                                                </span>
                                              );
                                            })}
                                            {entry.programme_assignments.length > 3 && (
                                              <span className="text-[8px] text-slate-500">
                                                +{entry.programme_assignments.length - 3}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                    {!primary && (
                                      <p className="text-[9px] text-slate-500">continues</p>
                                    )}
                                  </article>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[72px] items-center justify-center text-slate-300">
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">Add class on {day} {slot.label}</span>
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

      {filteredTimetables.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-600">
            {timetables.length === 0
              ? 'No timetable entries have been saved yet. Use Add Timetable Entry to create one.'
              : 'No timetable entries match the current filters or search.'}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
