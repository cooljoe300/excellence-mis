'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createStudent, updateStudent } from '@/app/actions/students';
import {
  getCurrentAcademicTermId,
  getProgramCourses,
  getStudentCourseIdsForTerm,
  setStudentEnrollmentsForTerm,
} from '@/app/actions/enrollments';
import type { Program, Student } from '@/lib/types';
import { UserPlus, Info } from 'lucide-react';

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function StudentForm({
  programs,
  student,
}: {
  programs: Program[];
  student?: Student;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [programId, setProgramId] = useState(student?.program_id ?? '');
  const [termId, setTermId] = useState<string | null>(null);
  const [availableCourses, setAvailableCourses] = useState<
    { id: string; code: string; name: string }[]
  >([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState('');

  const selectedSet = useMemo(() => new Set(selectedCourseIds), [selectedCourseIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await getCurrentAcademicTermId();
      if (!cancelled) setTermId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCourses() {
      setCoursesError('');
      if (!programId) {
        setAvailableCourses([]);
        setSelectedCourseIds([]);
        return;
      }

      setCoursesLoading(true);
      try {
        const courses = await getProgramCourses(programId);
        if (cancelled) return;
        setAvailableCourses(courses);

        // If editing an existing student, preload currently enrolled courses for the current term.
        if (student?.id && termId) {
          const enrolled = await getStudentCourseIdsForTerm(student.id, termId);
          if (cancelled) return;
          setSelectedCourseIds(enrolled);
        } else {
          // default: none selected
          setSelectedCourseIds([]);
        }
      } catch (e) {
        if (cancelled) return;
        setCoursesError('Failed to load courses for this program.');
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    }

    void loadCourses();
    return () => {
      cancelled = true;
    };
  }, [programId, student?.id, termId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const result = student
      ? await updateStudent(student.id, formData)
      : await createStudent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const studentId =
      student?.id ?? (typeof result === 'object' && 'id' in result ? (result.id as string) : null);

    if (studentId && termId) {
      const enrollResult = await setStudentEnrollmentsForTerm(studentId, termId, selectedCourseIds);
      if (enrollResult && 'error' in enrollResult && enrollResult.error) {
        setError(enrollResult.error);
        setLoading(false);
        return;
      }
    }

    if ('id' in result && result.id) {
      router.push(`/dashboard/students/${result.id}?registered=true`);
    } else {
      router.push('/dashboard/students');
    }
    router.refresh();
  }

  const programOptions = [
    { value: '', label: 'Select program' },
    ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!student && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 shrink-0 text-blue-600" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold">Step 1: Register in MIS</p>
              <p className="mt-1 text-blue-700">
                Admission number and student ID card are created automatically.
                After registration, import the student to Moodle LMS.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input name="first_name" label="First name" defaultValue={student?.first_name} required />
          <Input name="last_name" label="Last name" defaultValue={student?.last_name} required />
          <Input name="email" label="Email" type="email" defaultValue={student?.email} required />
          <Input name="phone" label="Phone" defaultValue={student?.phone ?? ''} />
          <Input name="date_of_birth" label="Date of birth" type="date" defaultValue={student?.date_of_birth ?? ''} />
          <Select name="gender" label="Gender" defaultValue={student?.gender ?? ''} options={genderOptions} />
          <Input name="nationality" label="Nationality" defaultValue={student?.nationality ?? 'Kenyan'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input name="address" label="Street address" defaultValue={student?.address ?? ''} />
          </div>
          <Input name="city" label="City" defaultValue={student?.city ?? ''} />
          <Input name="country" label="Country" defaultValue={student?.country ?? 'Kenya'} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic & Emergency</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select
            name="program_id"
            label="Program"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            options={programOptions}
          />
          <Input name="enrollment_date" label="Enrollment date" type="date" defaultValue={student?.enrollment_date ?? new Date().toISOString().split('T')[0]} />
          <Select name="status" label="Status" defaultValue={student?.status ?? 'active'} options={statusOptions} />
          <Input name="emergency_contact_name" label="Emergency contact name" defaultValue={student?.emergency_contact_name ?? ''} />
          <Input name="emergency_contact_phone" label="Emergency contact phone" defaultValue={student?.emergency_contact_phone ?? ''} />
          <div className="sm:col-span-2">
            <Textarea name="notes" label="Notes" rows={3} defaultValue={student?.notes ?? ''} />
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Course registration</p>
                <p className="mt-1 text-xs text-slate-600">
                  Select the courses to register for the current term.
                </p>
              </div>
              {!termId && (
                <span className="text-xs text-amber-700">No current term set</span>
              )}
            </div>

            {!programId ? (
              <p className="mt-3 text-sm text-slate-600">Select a program to see its courses.</p>
            ) : coursesLoading ? (
              <p className="mt-3 text-sm text-slate-600">Loading courses…</p>
            ) : coursesError ? (
              <p className="mt-3 text-sm text-red-600">{coursesError}</p>
            ) : availableCourses.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No active courses found for this program.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {availableCourses.map((c) => {
                  const checked = selectedSet.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-slate-300"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedCourseIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            return Array.from(next);
                          });
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {c.code}
                          <span className="font-normal text-slate-500"> — {c.name}</span>
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          <UserPlus className="h-4 w-4" />
          {loading ? 'Registering...' : student ? 'Update Student' : 'Register Student'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
