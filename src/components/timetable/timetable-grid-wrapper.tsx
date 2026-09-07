'use client';

import { useState } from 'react';
import { TimetableGrid } from '@/components/timetable/timetable-grid';
import { TimetableCellModal } from '@/components/timetable/timetable-cell-modal';
import { TimetablePreview } from '@/components/timetable/timetable-preview';
import { createTimetable, updateTimetable, deleteTimetable, publishTimetable, unpublishTimetable, getTimetables, getTimetablesByFilter } from '@/app/actions/timetable';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [existingEntry, setExistingEntry] = useState<any>(null);
  const [localTimetables, setLocalTimetables] = useState(timetables);
  const [isLoading, setIsLoading] = useState(false);
  const [previewTimetables, setPreviewTimetables] = useState<Timetable[]>([]);
  const [selectedProgramForPreview, setSelectedProgramForPreview] = useState<string>('');
  const [selectedIntakeForPreview, setSelectedIntakeForPreview] = useState<string>('');
  const [selectedStatusForPreview, setSelectedStatusForPreview] = useState<string>('all');

  function handleCellClick(day: string, timeSlot: string, entry?: Timetable) {
    setSelectedDay(day);
    setSelectedTimeSlot(timeSlot);
    setExistingEntry(entry || null);
    setIsModalOpen(true);
  }

  async function refreshTimetables() {
    setIsLoading(true);
    const updatedTimetables = await getTimetables();
    setLocalTimetables(updatedTimetables);
    setIsLoading(false);
  }

  async function handleSave(formData: FormData) {
    let result;
    if (existingEntry?.id) {
      result = await updateTimetable(existingEntry.id, formData);
    } else {
      result = await createTimetable(formData);
    }
    
    if (result.success) {
      await refreshTimetables();
      setIsModalOpen(false);
    }
    return result;
  }

  async function handleDelete() {
    if (existingEntry?.id) {
      return await handleTimetableDelete(existingEntry.id);
    }
    return { error: 'No entry to delete' };
  }

  async function handlePublish() {
    if (existingEntry?.id) {
      const result = await publishTimetable(existingEntry.id);
      if (result.success) {
        await refreshTimetables();
        setIsModalOpen(false);
      }
      return result;
    }
    return { error: 'No entry to publish' };
  }

  async function handleUnpublish() {
    if (existingEntry?.id) {
      const result = await unpublishTimetable(existingEntry.id);
      if (result.success) {
        await refreshTimetables();
        setIsModalOpen(false);
      }
      return result;
    }
    return { error: 'No entry to unpublish' };
  }

  async function handlePreview(programId?: string, intakeId?: string, status?: string) {
    // Fetch filtered timetables for preview
    const filtered = await getTimetablesByFilter({
      programId: programId || undefined,
      intakeId: intakeId || undefined,
      status: status === 'all' ? undefined : status,
    });

    setPreviewTimetables(filtered);
    setSelectedProgramForPreview(programId || '');
    setSelectedIntakeForPreview(intakeId || '');
    setSelectedStatusForPreview(status || 'all');
    setIsPreviewOpen(true);
  }

  async function handleTimetableDelete(id: string) {
    const result = await deleteTimetable(id);
    if (result.success) {
      await refreshTimetables();
    }
    return result;
  }

  function handleTimetableUpdate(updatedTimetable: Timetable) {
    setLocalTimetables((prev) =>
      prev.map((tt) => (tt.id === updatedTimetable.id ? updatedTimetable : tt))
    );
  }

  return (
    <>
      {isLoading && (
        <div className="text-center py-4 text-slate-600">
          Loading timetable...
        </div>
      )}
      <TimetableGrid
        timetables={localTimetables}
        programs={programs}
        timeSlots={timeSlots}
        intakes={intakes}
        onCellClick={handleCellClick}
        onTimetableUpdate={handleTimetableUpdate}
        onTimetableDelete={handleTimetableDelete}
        onPreview={handlePreview}
      />
      <TimetableCellModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={existingEntry ? handleDelete : undefined}
        onPublish={existingEntry ? handlePublish : undefined}
        onUnpublish={existingEntry ? handleUnpublish : undefined}
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
      <TimetablePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        timetables={previewTimetables}
        program={programs.find(p => p.id === selectedProgramForPreview)}
        intake={intakes.find(i => i.id === selectedIntakeForPreview)}
        academicYear={previewTimetables[0]?.academic_year}
        timeSlots={timeSlots}
        isDraft={previewTimetables.some(t => t.status === 'draft')}
      />
    </>
  );
}
