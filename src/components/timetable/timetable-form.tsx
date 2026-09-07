'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Program, Course, Profile, TimeSlot, Intake } from '@/lib/types';

interface TimetableFormProps {
  programs: Program[];
  courses: Course[];
  lecturers: Profile[];
  timeSlots: TimeSlot[];
  intakes: Intake[];
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean; data?: any }>;
}

export function TimetableForm({
  programs,
  courses,
  lecturers,
  timeSlots,
  intakes,
  action,
}: TimetableFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedIntakeId, setSelectedIntakeId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  function handleTimeSlotChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slotId = e.target.value;
    setSelectedTimeSlotId(slotId);
    
    const selectedSlot = timeSlots.find(slot => slot.id === slotId);
    if (selectedSlot) {
      setStartTime(selectedSlot.start_time);
      setEndTime(selectedSlot.end_time);
    } else {
      setStartTime('');
      setEndTime('');
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setConflicts([]);

    const formData = new FormData(e.currentTarget);
    const result = await action(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/dashboard/timetable/list');
    router.refresh();
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const teachingModes = ['physical', 'online', 'hybrid'];
  const statuses = ['draft', 'active'];

  // Filter courses based on selected program
  const filteredCourses = selectedProgramId
    ? courses.filter(course => course.program_id === selectedProgramId)
    : courses;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="intake_id" className="text-sm font-medium text-slate-700">
          Intake
        </label>
        <Select
          id="intake_id"
          name="intake_id"
          options={[{ value: '', label: 'Select intake' }, ...intakes.map(i => ({ value: i.id, label: i.name }))]}
          value={selectedIntakeId}
          onChange={(e) => setSelectedIntakeId(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="academic_year" className="text-sm font-medium text-slate-700">
          Academic Year
        </label>
        <Input
          id="academic_year"
          name="academic_year"
          type="text"
          defaultValue="2026/2027"
          placeholder="2026/2027"
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
          options={[{ value: '', label: 'Select programme' }, ...programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))]}
          value={selectedProgramId}
          onChange={(e) => {
            setSelectedProgramId(e.target.value);
            setSelectedCourseId(''); // Clear unit when programme changes
          }}
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
              ? [{ value: '', label: 'Select unit' }, ...filteredCourses.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))]
              : [{ value: '', label: 'Select a programme first' }]
          }
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
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
          options={[{ value: '', label: 'Select lecturer' }, ...lecturers.map(l => ({ value: l.id, label: l.full_name }))]}
          value={selectedLecturerId}
          onChange={(e) => setSelectedLecturerId(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="space-y-2">
          <label htmlFor="day" className="text-sm font-medium text-slate-700">
            Day
          </label>
          <Select
            id="day"
            name="day"
            options={[{ value: '', label: 'Select day' }, ...days.map(d => ({ value: d, label: d }))]}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="time_slot_id" className="text-sm font-medium text-slate-700">
            Time Slot
          </label>
          <Select
            id="time_slot_id"
            name="time_slot_id"
            options={[{ value: '', label: 'Select time slot' }, ...timeSlots.map(ts => ({ value: ts.id, label: `${ts.name} (${ts.start_time} - ${ts.end_time})` }))]}
            onChange={handleTimeSlotChange}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="start_time" className="text-sm font-medium text-slate-700">
            Start Time
          </label>
          <Input 
            id="start_time" 
            name="start_time" 
            type="time" 
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required 
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="end_time" className="text-sm font-medium text-slate-700">
            End Time
          </label>
          <Input 
            id="end_time" 
            name="end_time" 
            type="time" 
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required 
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="meeting_link" className="text-sm font-medium text-slate-700">
          Online Class Link
        </label>
        <Input
          id="meeting_link"
          name="meeting_link"
          type="url"
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
          defaultValue="draft"
          options={statuses.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes (optional)
        </label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Additional notes..." />
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Timetable Entry'}
        </Button>
      </div>
    </form>
  );
}
