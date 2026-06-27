'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { createCourse, deleteCourse, updateCourse } from '@/app/actions/courses';
import type { Course, Program } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

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
  const { success } = useToast();
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
    success(course ? 'Course updated successfully' : 'Course created successfully');
    router.refresh();
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={course ? 'Edit Course' : 'Add Course'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input name="credits" label="Credits" type="number" defaultValue={course?.credits?.toString() ?? '3'} required />
          <Input name="unit_fee" label="Unit fee (KES)" type="number" min="0" step="0.01" defaultValue={course?.unit_fee?.toString() ?? '0'} required />
        </div>
        <Textarea name="description" label="Description" rows={2} defaultValue={course?.description ?? ''} />
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
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : course ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CoursesClient({
  courses,
  programs,
}: {
  courses: Course[];
  programs: Program[];
}) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteCourse(deleteTarget.id);
    if (result.error) {
      toastError(result.error);
      setDeleting(false);
      return;
    }
    success(`Course "${deleteTarget.name}" deleted`);
    setDeleteTarget(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Manage courses across all programs"
        action={<Button onClick={() => setShowForm(true)}>+ Add Course</Button>}
      />

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Add your first course to start building your academic catalog."
          action={<Button onClick={() => setShowForm(true)}>+ Add Course</Button>}
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Unit fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-mono text-xs">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell className="text-muted">
                    {(course.program as { name: string } | null)?.name ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted">{course.credits}</TableCell>
                  <TableCell className="text-muted">{formatCurrency(course.unit_fee ?? 0)}</TableCell>
                  <TableCell>
                    <Badge status={course.is_active ? 'active' : 'inactive'}>
                      {course.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setEditingCourse(course)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(course)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}

      {showForm && <CourseFormModal programs={programs} onClose={() => setShowForm(false)} />}
      {editingCourse && (
        <CourseFormModal programs={programs} course={editingCourse} onClose={() => setEditingCourse(null)} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete course"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete course"
        loading={deleting}
      />
    </div>
  );
}
