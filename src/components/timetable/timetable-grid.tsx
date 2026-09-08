'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, Printer } from 'lucide-react';
import type { Timetable, Program, TimeSlot, Intake } from '@/lib/types';
import { getDisplayTimeSlots } from '@/lib/timetable-utils';
import { ProgrammeLegend } from './programme-legend';
import { TimetableWeekTable } from './timetable-day-track';

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
      <Card className="no-print">
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
                  Print Timetable
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
            <TimetableWeekTable
              slots={displaySlots}
              entries={filteredTimetables}
              variant="editor"
              onSlotClick={(selectedDay, timeSlot) => onCellClick(selectedDay, timeSlot)}
              onEntryClick={(selectedDay, timeSlot, entry) =>
                onCellClick(selectedDay, timeSlot, entry)
              }
            />
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
