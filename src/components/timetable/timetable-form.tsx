'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Program, Course, Profile, Room, TimeSlot, Intake, AcademicTerm } from '@/lib/types';

interface TimetableFormProps {
  programs: Program[];
  courses: Course[];
  lecturers: Profile[];
  rooms: Room[];
  timeSlots: TimeSlot[];
  intakes: Intake[];
  terms: AcademicTerm[];
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean; data?: any }>;
}

export function TimetableForm({
  programs,
  courses,
  lecturers,
  rooms,
  timeSlots,
  intakes,
  terms,
  action,
}: TimetableFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');

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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="academic_year" className="text-sm font-medium text-slate-700">
            Academic Year
          </label>
          <Input
            id="academic_year"
            name="academic_year"
            placeholder="2026/2027"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="semester" className="text-sm font-medium text-slate-700">
            Semester
          </label>
          <Input
            id="semester"
            name="semester"
            placeholder="Semester 1"
            required
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="program_id" className="text-sm font-medium text-slate-700">
            Programme
          </label>
          <Select
            id="program_id"
            name="program_id"
            options={[{ value: '', label: 'Select programme' }, ...programs.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))]}
            required
            onChange={(e) => setSelectedProgramId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="department" className="text-sm font-medium text-slate-700">
            Department
          </label>
          <Input id="department" name="department" placeholder="Business" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="campus" className="text-sm font-medium text-slate-700">
            Campus
          </label>
          <Input id="campus" name="campus" defaultValue="Main Campus" />
        </div>

        <div className="space-y-2">
          <label htmlFor="intake_id" className="text-sm font-medium text-slate-700">
            Intake
          </label>
          <Select
            id="intake_id"
            name="intake_id"
            options={[{ value: '', label: 'Select intake' }, ...intakes.map(i => ({ value: i.id, label: i.name }))]}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="class_section" className="text-sm font-medium text-slate-700">
            Class/Section
          </label>
          <Input id="class_section" name="class_section" placeholder="Y1" />
        </div>

        <div className="space-y-2">
          <label htmlFor="course_id" className="text-sm font-medium text-slate-700">
            Unit Code
          </label>
          <Select
            id="course_id"
            name="course_id"
            options={[{ value: '', label: 'Select unit' }, ...filteredCourses.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))]}
            required
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="lecturer_id" className="text-sm font-medium text-slate-700">
            Lecturer
          </label>
          <Select
            id="lecturer_id"
            name="lecturer_id"
            options={[{ value: '', label: 'Select lecturer' }, ...lecturers.map(l => ({ value: l.id, label: l.full_name }))]}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="room_id" className="text-sm font-medium text-slate-700">
            Room
          </label>
          <Select
            id="room_id"
            name="room_id"
            options={[{ value: '', label: 'Select room' }, ...rooms.map(r => ({ value: r.id, label: `${r.name} (${r.building || 'No building'})` }))]}
            required
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
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
          <label htmlFor="start_time" className="text-sm font-medium text-slate-700">
            Start Time
          </label>
          <Input id="start_time" name="start_time" type="time" required />
        </div>

        <div className="space-y-2">
          <label htmlFor="end_time" className="text-sm font-medium text-slate-700">
            End Time
          </label>
          <Input id="end_time" name="end_time" type="time" required />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="duration" className="text-sm font-medium text-slate-700">
            Duration (hours)
          </label>
          <Input id="duration" name="duration" type="number" min="1" placeholder="2" />
        </div>

        <div className="space-y-2">
          <label htmlFor="max_students" className="text-sm font-medium text-slate-700">
            Maximum Students
          </label>
          <Input id="max_students" name="max_students" type="number" min="1" placeholder="50" />
        </div>

        <div className="space-y-2">
          <label htmlFor="teaching_mode" className="text-sm font-medium text-slate-700">
            Teaching Mode
          </label>
          <Select
            id="teaching_mode"
            name="teaching_mode"
            defaultValue="physical"
            options={teachingModes.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="meeting_link" className="text-sm font-medium text-slate-700">
          Meeting Link (optional)
        </label>
        <Input
          id="meeting_link"
          name="meeting_link"
          type="url"
          placeholder="https://zoom.us/j/..."
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
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
