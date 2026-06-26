'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createCourse, deleteCourse, updateCourse } from '@/app/actions/courses';
import type { Course, Program } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

function CourseFormModal({
  programs,
  onClose,
  course,
}: {
  programs: Program[];
  onClose: () => void;
  course?: Course;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    if (!course) {
      formData.set('is_active', 'true');
    }

    const result = course
      ? await updateCourse(course.id, formData)
      : await createCourse(formData);
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
        <h2 className="text-lg font-semibold">{course ? 'Edit Course' : 'Add Course'}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input name="name" label="Course name" defaultValue={course?.name} required />
          <Input name="code" label="Code" placeholder="CS101" defaultValue={course?.code} required />
          <Select
            name="program_id"
            label="Program"
            defaultValue={course?.program_id ?? ''}
            options={[
              { value: '', label: 'No program' },
              ...programs.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="credits"
              label="Credits"
              type="number"
              defaultValue={course?.credits?.toString() ?? '3'}
              required
            />
            <Input
              name="unit_fee"
              label="Unit fee (KES)"
              type="number"
              min="0"
              step="0.01"
              defaultValue={course?.unit_fee?.toString() ?? '0'}
              required
            />
          </div>
          <Textarea
            name="description"
            label="Description"
            rows={2}
            defaultValue={course?.description ?? ''}
          />
          {course && (
            <Select
              name="is_active"
              label="Status"
              defaultValue={course.is_active ? 'true' : 'false'}
              options={[
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : course ? 'Save changes' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CoursesClient({
  courses,
  programs,
}: {
  courses: Course[];
  programs: Program[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Manage courses across all programs"
        action={<Button onClick={() => setShowForm(true)}>+ Add Course</Button>}
      />

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center text-slate-500">
          No courses yet.
        </div>
      ) : (
        <DataTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Code</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Name</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Program</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Credits</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Unit fee</th>
                <th className="px-6 py-3 text-left font-medium text-slate-500">Status</th>
                <th className="px-6 py-3 text-right font-medium text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs">{course.code}</td>
                  <td className="px-6 py-4 font-medium">{course.name}</td>
                  <td className="px-6 py-4 text-slate-600">
                    {(course.program as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-600">{course.credits}</td>
                  <td className="px-6 py-4 text-slate-600">{formatCurrency(course.unit_fee ?? 0)}</td>
                  <td className="px-6 py-4">
                    <Badge status={course.is_active ? 'active' : 'inactive'}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingCourse(course)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deletingId === course.id}
                        onClick={async () => {
                          if (!window.confirm(`Delete course "${course.name}"? This cannot be undone.`)) {
                            return;
                          }
                          try {
                            setDeletingId(course.id);
                            await deleteCourse(course.id);
                            window.location.reload();
                          } finally {
                            setDeletingId(null);
                          }
                        }}
                      >
                        {deletingId === course.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}

      {showForm && <CourseFormModal programs={programs} onClose={() => setShowForm(false)} />}
      {editingCourse && (
        <CourseFormModal
          programs={programs}
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
        />
      )}
    </div>
  );
}
