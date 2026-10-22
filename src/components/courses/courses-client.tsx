'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useToast } from '@/components/ui/toast';
import { createCourse, deleteCourse, updateCourse } from '@/app/actions/courses';
import type { Course, Program } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { BookOpen, Search, X } from 'lucide-react';

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
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('');

  // Handle URL query parameters for program filter
  useEffect(() => {
    const programParam = searchParams.get('program');
    setProgramFilter(programParam || '');
  }, [searchParams]);

  // Filter courses based on search (program is filtered at backend level)
  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch = 
        searchQuery === '' ||
        course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [courses, searchQuery]);

  // Update URL when program filter changes
  function handleProgramChange(programId: string) {
    setProgramFilter(programId);
    const params = new URLSearchParams(searchParams.toString());
    if (programId) {
      params.set('program', programId);
    } else {
      params.delete('program');
    }
    router.push(`/dashboard/courses?${params.toString()}`);
  }

  // Clear all filters
  function clearFilters() {
    setSearchQuery('');
    setProgramFilter('');
    router.push('/dashboard/courses');
  }

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

      {/* Filter Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={programFilter}
            onChange={(e) => handleProgramChange(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
        {(searchQuery || programFilter) && (
          <Button variant="secondary" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-slate-600">
        {searchQuery ? (
          `${filteredCourses.length} courses found`
        ) : (
          `Showing ${courses.length} courses`
        )}
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Add your first course to start building your academic catalog."
          action={<Button onClick={() => setShowForm(true)}>+ Add Course</Button>}
        />
      ) : filteredCourses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">No courses found</h3>
          <p className="mt-2 text-sm text-slate-500">
            No courses match the selected program and search criteria. Try changing your filters.
          </p>
        </div>
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">S/N</TableHead>
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
              {filteredCourses.map((course, index) => (
                <TableRow key={course.id}>
                  <TableCell className="text-slate-600">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{course.code}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell className="text-muted">
                    {(course.program as { name: string } | null)?.name ?? 'Unassigned'}
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
