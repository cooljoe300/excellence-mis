'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Program, Course, Profile, Room, TimeSlot, Intake, AcademicTerm } from '@/lib/types';

interface TimetableCellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<{ error?: string; success?: boolean }>;
  day: string;
  timeSlot: string;
  programs: Program[];
  courses: Course[];
  lecturers: Profile[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  intakes: Intake[];
  terms: AcademicTerm[];
  existingEntry?: any;
}

export function TimetableCellModal({
  isOpen,
  onClose,
  onSave,
  day,
  timeSlot,
  programs,
  courses,
  lecturers,
  rooms,
  timeSlots,
  intakes,
  terms,
  existingEntry,
}: TimetableCellModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    existingEntry?.program_id || ''
  );
  const [selectedIntakeId, setSelectedIntakeId] = useState<string>(
    existingEntry?.intake_id || ''
  );

  // When editing, sync the values with the existing entry
  useEffect(() => {
    if (existingEntry?.program_id) {
      setSelectedProgramId(existingEntry.program_id);
    }
    if (existingEntry?.intake_id) {
      setSelectedIntakeId(existingEntry.intake_id);
    }
  }, [existingEntry]);

  const [startTime, endTime] = timeSlot.split('-');

  // Filter courses based on selected program
  const filteredCourses = selectedProgramId
    ? courses.filter((course) => course.program_id === selectedProgramId)
    : courses;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setConflicts([]);

    const formData = new FormData(e.currentTarget);
    formData.set('day', day);
    formData.set('start_time', startTime);
    formData.set('end_time', endTime);

    const result = await onSave(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const teachingModes = ['physical', 'online', 'hybrid'];
  const statuses = ['draft', 'active'];

  return (
    <Modal open={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {existingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
            <Badge>{day}</Badge>
            <Badge>{timeSlot}</Badge>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-sm text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {conflicts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-orange-900 mb-2">Conflicts detected:</p>
                <ul className="text-sm text-orange-700 list-disc list-inside space-y-1">
                  {conflicts.map((conflict, idx) => (
                    <li key={idx}>{conflict}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <label htmlFor="intake_id" className="text-sm font-medium text-slate-700">
              Intake
            </label>
            <Select
              id="intake_id"
              name="intake_id"
              options={[
                { value: '', label: 'Select intake' },
                ...intakes.map((i) => ({ value: i.id, label: i.name })),
              ]}
              value={selectedIntakeId}
              onChange={(e) => setSelectedIntakeId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="program_id" className="text-sm font-medium text-slate-700">
              Programme
            </label>
            <Select
              id="program_id"
              name="program_id"
              options={[
                { value: '', label: 'Select programme' },
                ...programs.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` })),
              ]}
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="course_id" className="text-sm font-medium text-slate-700">
              Unit
            </label>
            <Select
              id="course_id"
              name="course_id"
              options={
                selectedProgramId
                  ? [
                      { value: '', label: 'Select unit' },
                      ...filteredCourses.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })),
                    ]
                  : [{ value: '', label: 'Select a programme first' }]
              }
              value={existingEntry?.course_id || ''}
              disabled={!selectedProgramId}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="lecturer_id" className="text-sm font-medium text-slate-700">
              Lecturer
            </label>
            <Select
              id="lecturer_id"
              name="lecturer_id"
              options={[
                { value: '', label: 'Select lecturer' },
                ...lecturers.map((l) => ({ value: l.id, label: l.full_name })),
              ]}
              value={existingEntry?.lecturer_id || ''}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="meeting_link" className="text-sm font-medium text-slate-700">
              Online Class Link
            </label>
            <Input
              id="meeting_link"
              name="meeting_link"
              type="url"
              defaultValue={existingEntry?.meeting_link || ''}
              placeholder="https://zoom.us/j/..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium text-slate-700">
              Status
            </label>
            <Select
              id="status"
              name="status"
              value={existingEntry?.status || 'draft'}
              options={statuses.map((s) => ({
                value: s,
                label: s.charAt(0).toUpperCase() + s.slice(1),
              }))}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Notes (optional)
            </label>
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={existingEntry?.notes || ''}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Timetable Entry'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
