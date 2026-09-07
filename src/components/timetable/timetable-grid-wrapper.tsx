'use client';

import { useState } from 'react';
import { TimetableGrid } from '@/components/timetable/timetable-grid';
import { TimetableCellModal } from '@/components/timetable/timetable-cell-modal';
import { createTimetable } from '@/app/actions/timetable';
import type { Timetable, Program, Course, Profile, Room, TimeSlot, Intake, AcademicTerm } from '@/lib/types';

interface TimetableGridWrapperProps {
  timetables: Timetable[];
  programs: Program[];
  timeSlots: TimeSlot[];
  courses: Course[];
  lecturers: Profile[];
  intakes: Intake[];
}

export function TimetableGridWrapper({
  timetables,
  programs,
  timeSlots,
  courses,
  lecturers,
  intakes,
}: TimetableGridWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [localTimetables, setLocalTimetables] = useState(timetables);

  function handleCellClick(day: string, timeSlot: string) {
    setSelectedDay(day);
    setSelectedTimeSlot(timeSlot);
    setExistingEntry(null);
    setIsModalOpen(true);
  }

  async function handleSave(formData: FormData) {
    const result = await createTimetable(formData);
    if (result.success) {
      // Refresh the page to show updated data
      window.location.reload();
    }
    return result;
  }

  function handleTimetableUpdate(updatedTimetable: Timetable) {
    setLocalTimetables((prev) =>
      prev.map((tt) => (tt.id === updatedTimetable.id ? updatedTimetable : tt))
    );
  }

  function handleTimetableDelete(id: string) {
    setLocalTimetables((prev) => prev.filter((tt) => tt.id !== id));
  }

  return (
    <>
      <TimetableGrid
        timetables={localTimetables}
        programs={programs}
        timeSlots={timeSlots}
        onCellClick={handleCellClick}
        onTimetableUpdate={handleTimetableUpdate}
        onTimetableDelete={handleTimetableDelete}
      />
      <TimetableCellModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        day={selectedDay}
        timeSlot={selectedTimeSlot}
        programs={programs}
        courses={courses}
        lecturers={lecturers}
        rooms={[]}
        timeSlots={timeSlots}
        intakes={intakes}
        terms={[]}
        existingEntry={existingEntry}
      />
    </>
  );
}
