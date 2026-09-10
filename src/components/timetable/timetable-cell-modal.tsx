'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MultiSelect } from '@/components/ui/multi-select';
import { IntakeSelector } from '@/components/ui/intake-selector';
import type { Program, Course, Profile, Room, TimeSlot, Intake, Timetable } from '@/lib/types';
import { TIMETABLE_DAYS, formatClockTime, timeToMinutes, toTimeInputValue } from '@/lib/timetable-utils';

interface TimetableCellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
  onDelete?: () => Promise<{ error?: string; success?: boolean }>;
  day: string;
  timeSlot: string;
  programs: Program[];
  courses: Course[];
  lecturers: Profile[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  intakes: Intake[];
  existingEntry?: Timetable | null;
}

export function TimetableCellModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  day,
  timeSlot,
  programs,
  courses,
  lecturers,
  rooms,
  timeSlots,
  intakes,
  existingEntry,
}: TimetableCellModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [selectedIntakeId, setSelectedIntakeId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('draft');
  const [selectedDay, setSelectedDay] = useState(day);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [selectedClassType, setSelectedClassType] = useState<'regular' | 'shared'>('regular');
  const [selectedSharedClassId, setSelectedSharedClassId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const [slotStart, slotEnd] = timeSlot.includes('-')
      ? [timeSlot.slice(0, timeSlot.indexOf('-')), timeSlot.slice(timeSlot.indexOf('-') + 1)]
      : ['', ''];

    setError(null);
    setLoading(false);
    
    // Handle programme selection - for shared classes, get from programme_assignments
    if (existingEntry?.class_type === 'shared' && existingEntry.programme_assignments) {
      setSelectedProgramIds(existingEntry.programme_assignments.map(pa => pa.programme_id));
    } else {
      setSelectedProgramIds(existingEntry?.program_id ? [existingEntry.program_id] : []);
    }
    
    setSelectedIntakeId(existingEntry?.intake_id || '');
    setSelectedCourseId(existingEntry?.course_id || '');
    setSelectedLecturerId(existingEntry?.lecturer_id || '');
    setSelectedRoomId(existingEntry?.room_id || '');
    setSelectedStatus(existingEntry?.status || 'draft');
    setSelectedDay(existingEntry?.day || day || 'Monday');
    setStartTime(toTimeInputValue(existingEntry?.start_time || slotStart));
    setEndTime(toTimeInputValue(existingEntry?.end_time || slotEnd));
    setSelectedSlotId('');
    setSelectedClassType((existingEntry?.class_type as 'regular' | 'shared') || 'regular');
    setSelectedSharedClassId(existingEntry?.shared_class_id || '');
  }, [isOpen, existingEntry, day, timeSlot]);

  const filteredCourses = selectedProgramIds.length > 0
    ? courses.filter((course) => course.program_id && selectedProgramIds.includes(course.program_id))
    : [];

  function applyTimeSlot(slotId: string) {
    setSelectedSlotId(slotId);
    const selectedSlot = timeSlots.find((slot) => slot.id === slotId);
    if (selectedSlot) {
      setStartTime(toTimeInputValue(selectedSlot.start_time));
      setEndTime(toTimeInputValue(selectedSlot.end_time));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    if (selectedProgramIds.length === 0 || !selectedIntakeId || !selectedCourseId) {
      setError('At least one programme, intake and unit are required.');
      setLoading(false);
      return;
    }
    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      setError('Start time must be earlier than end time.');
      setLoading(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set('day', selectedDay);
    formData.set('start_time', startTime);
    formData.set('end_time', endTime);
    formData.set('status', selectedStatus);
    formData.set('programme_ids', selectedProgramIds.join(','));
    formData.set('intake_id', selectedIntakeId);
    formData.set('course_id', selectedCourseId);
    formData.set('lecturer_id', selectedLecturerId);
    formData.set('room_id', selectedRoomId);
    formData.set('class_type', selectedClassType);
    formData.set('shared_class_id', selectedSharedClassId);
    if (existingEntry?.id) formData.set('id', existingEntry.id);

    const result = await onSave(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5" key={existingEntry?.id || `new-${day}-${timeSlot}`}>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {existingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-600">
            <Badge>{selectedDay || 'Day'}</Badge>
            <Badge>
              {startTime && endTime ? `${formatClockTime(startTime)}–${formatClockTime(endTime)}` : 'Time'}
            </Badge>
            {existingEntry && <Badge status={existingEntry.status}>{existingEntry.status}</Badge>}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Class information</h3>
          <MultiSelect
            name="programme_ids"
            label="Programme(s)"
            required
            value={selectedProgramIds}
            onChange={(value) => {
              setSelectedProgramIds(value);
              setSelectedCourseId('');
            }}
            options={programs.map((program) => ({
              value: program.id,
              label: `${program.code} - ${program.name}`,
            }))}
            placeholder="Search and select programmes..."
          />
          <IntakeSelector
            programmes={programs}
            selectedProgramIds={selectedProgramIds}
            intakes={intakes}
            selectedIntakeId={selectedIntakeId}
            onIntakeChange={setSelectedIntakeId}
          />
          <Select
            id="course_id"
            name="course_id"
            label="Unit"
            required
            disabled={selectedProgramIds.length === 0}
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            options={
              selectedProgramIds.length > 0
                ? [
                    { value: '', label: 'Select unit' },
                    ...filteredCourses.map((course) => ({
                      value: course.id,
                      label: `${course.code} - ${course.name}`,
                    })),
                  ]
                : [{ value: '', label: 'Select programmes first' }]
            }
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Teaching</h3>
          <Select
            id="lecturer_id"
            name="lecturer_id"
            label="Lecturer"
            value={selectedLecturerId}
            onChange={(event) => setSelectedLecturerId(event.target.value)}
            options={[
              { value: '', label: 'Lecturer Not Assigned / To Be Confirmed' },
              ...lecturers.map((lecturer) => ({ value: lecturer.id, label: lecturer.full_name })),
            ]}
          />
          {selectedProgramIds.length > 1 && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-medium">Common / Shared Class</p>
              <p className="mt-1 text-xs">
                This class is shared across {selectedProgramIds.length} programmes. The same lecturer can teach multiple groups at the same time.
              </p>
            </div>
          )}
          <Select
            id="room_id"
            name="room_id"
            label="Room"
            value={selectedRoomId}
            onChange={(event) => setSelectedRoomId(event.target.value)}
            options={[
              { value: '', label: rooms.length ? 'Online / no room' : 'No rooms configured' },
              ...rooms.map((room) => ({
                value: room.id,
                label: room.building ? `${room.name} (${room.building})` : room.name,
              })),
            ]}
          />
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Schedule</h3>
          <Select
            id="day"
            name="day"
            label="Day"
            required
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
            options={TIMETABLE_DAYS.map((item) => ({ value: item, label: item }))}
          />
          <Select
            id="time_slot_id"
            name="time_slot_id"
            label="Configured time slot"
            value={selectedSlotId}
            onChange={(event) => applyTimeSlot(event.target.value)}
            options={[
              { value: '', label: 'Choose a configured slot or set custom times' },
              ...timeSlots.map((slot) => ({
                value: slot.id,
                label: `${slot.name} (${formatClockTime(slot.start_time)}–${formatClockTime(slot.end_time)})`,
              })),
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="start_time" className="text-sm font-medium text-slate-700">
                Start time
              </label>
              <Input
                id="start_time"
                name="start_time"
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="end_time" className="text-sm font-medium text-slate-700">
                End time
              </label>
              <Input
                id="end_time"
                name="end_time"
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Publishing</h3>
          <Select
            id="status"
            name="status"
            label="Status"
            required
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'active', label: 'Active' },
            ]}
          />
          <Input
            id="meeting_link"
            name="meeting_link"
            type="url"
            label="Online class link"
            defaultValue={existingEntry?.meeting_link || ''}
            placeholder="https://zoom.us/j/..."
          />
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            label="Notes (optional)"
            defaultValue={existingEntry?.notes || ''}
            placeholder="Additional notes..."
          />
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
          {existingEntry && onDelete && (
            <Button
              type="button"
              variant="danger"
              disabled={loading}
              onClick={async () => {
                if (!confirm('Delete this timetable entry? This cannot be undone.')) return;
                setLoading(true);
                const result = await onDelete();
                if (result.error) {
                  setError(result.error);
                  setLoading(false);
                }
              }}
            >
              Delete
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} aria-busy={loading}>
            {loading ? 'Saving...' : existingEntry ? 'Update Timetable Entry' : 'Save Timetable Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
