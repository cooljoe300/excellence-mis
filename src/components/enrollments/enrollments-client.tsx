'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { createEnrollment } from '@/app/actions/enrollments';
import type { AcademicTerm, Course, Enrollment, Student } from '@/lib/types';
import { formatDate } from '@/lib/utils';

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
                label: `${s.student_number} — ${s.first_name} ${s.last_name}`,
              })),
            ]}
            required
          />
          <Select
            name="course_id"
            label="Course"
            options={[
              { value: '', label: 'Select course' },
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
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Enroll'}</Button>
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

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Student course enrollments by academic term"
        action={<Button onClick={() => setShowForm(true)}>+ New Enrollment</Button>}
      />

      {enrollments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No enrollments yet.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Student</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Course</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Term</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Grade</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrollments.map((enrollment) => (
                <tr key={enrollment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">
                    {(enrollment.student as Student)?.first_name}{' '}
                    {(enrollment.student as Student)?.last_name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {(enrollment.course as Course)?.code} — {(enrollment.course as Course)?.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {(enrollment.term as AcademicTerm)?.name}
                  </td>
                  <td className="px-6 py-4">
                    <Badge status={enrollment.status}>{enrollment.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {enrollment.grade ?? (enrollment.score != null ? `${enrollment.score}%` : '—')}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{formatDate(enrollment.enrolled_at)}</td>
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
