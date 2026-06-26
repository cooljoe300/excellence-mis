'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { createEnrollment } from '@/app/actions/enrollments';
import type { AcademicTerm, Course, Enrollment, Student } from '@/lib/types';
import { formatCurrency, formatDate, getAdmissionNumber } from '@/lib/utils';

type GroupedStudentEnrollment = {
  key: string;
  studentId: string;
  termId: string;
  student: Student;
  term: AcademicTerm;
  units: { enrollment: Enrollment; course: Course }[];
  totalFee: number;
  enrolledAt: string;
};

function groupEnrollmentsByStudent(enrollments: Enrollment[]): GroupedStudentEnrollment[] {
  const map = new Map<string, GroupedStudentEnrollment>();

  for (const enrollment of enrollments) {
    const student = enrollment.student as Student;
    const term = enrollment.term as AcademicTerm;
    const course = enrollment.course as Course;
    const key = `${enrollment.student_id}:${enrollment.term_id}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        studentId: enrollment.student_id,
        termId: enrollment.term_id,
        student,
        term,
        units: [],
        totalFee: 0,
        enrolledAt: enrollment.enrolled_at,
      });
    }

    const group = map.get(key)!;
    group.units.push({ enrollment, course });
    group.totalFee += Number(course?.unit_fee ?? 0);
    if (enrollment.enrolled_at > group.enrolledAt) {
      group.enrolledAt = enrollment.enrolled_at;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

function EnrollmentFormModal({
  students,
  courses,
  terms,
  onClose,
}: {
  students: Student[];
  courses: Course[];
  terms: AcademicTerm[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createEnrollment(new FormData(e.currentTarget));
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New Enrollment</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Select
            name="student_id"
            label="Student"
            options={[
              { value: '', label: 'Select student' },
              ...students.map((s) => ({
                value: s.id,
                label: `${getAdmissionNumber(s)} — ${s.first_name} ${s.last_name}`,
              })),
            ]}
            required
          />
          <Select
            name="course_id"
            label="Course / Unit"
            options={[
              { value: '', label: 'Select unit' },
              ...courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
            ]}
            required
          />
          <Select
            name="term_id"
            label="Academic term"
            options={[
              { value: '', label: 'Select term' },
              ...terms.map((t) => ({ value: t.id, label: t.name })),
            ]}
            required
          />
          <Select
            name="status"
            label="Status"
            defaultValue="active"
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'dropped', label: 'Dropped' },
            ]}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Enroll'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EnrollmentsClient({
  enrollments,
  students,
  courses,
  terms,
}: {
  enrollments: Enrollment[];
  students: Student[];
  courses: Course[];
  terms: AcademicTerm[];
}) {
  const [showForm, setShowForm] = useState(false);
  const grouped = useMemo(() => groupEnrollmentsByStudent(enrollments), [enrollments]);

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="One record per student showing all registered units"
        action={<Button onClick={() => setShowForm(true)}>+ New Enrollment</Button>}
      />

      {grouped.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No enrollments yet.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Admission #</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Term</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Units</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Total fee</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Enrolled</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grouped.map((group) => (
                <tr key={group.key} className="align-top hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">
                    {getAdmissionNumber(group.student)}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/students/${group.studentId}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {group.student?.first_name} {group.student?.last_name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{group.student?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{group.term?.name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {group.units.map(({ enrollment, course }) => (
                        <div
                          key={enrollment.id}
                          className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                          <span className="font-medium text-slate-900">
                            {course?.code}
                            <span className="font-normal text-slate-500"> — {course?.name}</span>
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatCurrency(course?.unit_fee ?? 0)}
                          </span>
                          <Badge status={enrollment.status}>{enrollment.status}</Badge>
                          {(enrollment.grade || enrollment.score != null) && (
                            <span className="text-xs text-slate-500">
                              {enrollment.grade ?? `${enrollment.score}%`}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {group.units.length} unit{group.units.length === 1 ? '' : 's'}
                    </p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {formatCurrency(group.totalFee)}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(group.enrolledAt)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/dashboard/students/${group.studentId}`}>
                      <Button variant="ghost" size="sm">
                        View student
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && (
        <EnrollmentFormModal
          students={students}
          courses={courses}
          terms={terms}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
