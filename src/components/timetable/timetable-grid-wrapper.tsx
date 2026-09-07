'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimetableGrid } from '@/components/timetable/timetable-grid';
import { TimetableCellModal } from '@/components/timetable/timetable-cell-modal';
import { TimetablePreview } from '@/components/timetable/timetable-preview';
import {
  createTimetable,
  updateTimetable,
  deleteTimetable,
  getTimetables,
  getTimetablesByFilter,
} from '@/app/actions/timetable';
import type { Timetable, Program, Course, Profile, Room, TimeSlot, Intake } from '@/lib/types';

interface TimetableGridWrapperProps {
  timetables: Timetable[];
  programs: Program[];
  timeSlots: TimeSlot[];
  courses: Course[];
  lecturers: Profile[];
  intakes: Intake[];
  rooms: Room[];
}

export function TimetableGridWrapper({
  timetables,
  programs,
  timeSlots,
  courses,
  lecturers,
  intakes,
  rooms,
}: TimetableGridWrapperProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [existingEntry, setExistingEntry] = useState<Timetable | null>(null);
  const [localTimetables, setLocalTimetables] = useState(timetables);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewTimetables, setPreviewTimetables] = useState<Timetable[]>([]);
  const [selectedProgramForPreview, setSelectedProgramForPreview] = useState('');
  const [selectedIntakeForPreview, setSelectedIntakeForPreview] = useState('');

  useEffect(() => {
    setLocalTimetables(timetables);
  }, [timetables]);

  function openModal(day: string, timeSlot: string, entry?: Timetable) {
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
    router.refresh();
  }

  function upsertLocal(entry: Timetable) {
    setLocalTimetables((previous) => {
      const without = previous.filter((item) => item.id !== entry.id);
      return [...without, entry];
    });
  }

  async function handleSave(formData: FormData) {
    const result = existingEntry?.id
      ? await updateTimetable(existingEntry.id, formData)
      : await createTimetable(formData);

    if (!result.success || result.error) {
      return result;
    }

    if (result.data) {
      upsertLocal(result.data as Timetable);
    }
    setSuccessMessage(existingEntry?.id ? 'Timetable entry updated.' : 'Timetable entry saved.');
    setTimeout(() => setSuccessMessage(null), 3000);
    setIsModalOpen(false);
    await refreshTimetables();
    return result;
  }

  async function handleDelete() {
    if (!existingEntry?.id) return { error: 'No entry to delete' };
    const result = await deleteTimetable(existingEntry.id);
    if (result.success) {
      setLocalTimetables((previous) => previous.filter((item) => item.id !== existingEntry.id));
      setIsModalOpen(false);
      await refreshTimetables();
    }
    return result;
  }

  async function openPreview(programId?: string, intakeId?: string, status?: string, print = false) {
    const filtered = await getTimetablesByFilter({
      programId: programId || undefined,
      intakeId: intakeId || undefined,
      status: status === 'all' ? undefined : status,
    });
    setPreviewTimetables(filtered);
    setSelectedProgramForPreview(programId || '');
    setSelectedIntakeForPreview(intakeId || '');
    setIsPreviewOpen(true);
    if (print) {
      setTimeout(() => window.print(), 250);
    }
  }

  return (
    <>
      {successMessage && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}
      {isLoading && <div className="py-2 text-sm text-slate-600">Refreshing timetable…</div>}
      <TimetableGrid
        timetables={localTimetables}
        programs={programs}
        timeSlots={timeSlots}
        intakes={intakes}
        onCellClick={openModal}
        onAddEntry={() => openModal('Monday', '')}
        onPreview={(programId, intakeId, status) => openPreview(programId, intakeId, status)}
        onPrint={(programId, intakeId, status) => openPreview(programId, intakeId, status, true)}
      />
      <TimetableCellModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={existingEntry ? handleDelete : undefined}
        day={selectedDay}
        timeSlot={selectedTimeSlot}
        programs={programs}
        courses={courses}
        lecturers={lecturers}
        rooms={rooms}
        timeSlots={timeSlots}
        intakes={intakes}
        existingEntry={existingEntry}
      />
      <TimetablePreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        timetables={previewTimetables}
        program={programs.find((program) => program.id === selectedProgramForPreview)}
        intake={intakes.find((intake) => intake.id === selectedIntakeForPreview)}
        academicYear={previewTimetables[0]?.academic_year}
        timeSlots={timeSlots}
        isDraft={previewTimetables.some((entry) => entry.status === 'draft')}
      />
    </>
  );
}
