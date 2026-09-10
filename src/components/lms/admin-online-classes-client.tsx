'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getOnlineLessonsByCourse, createOnlineLesson, updateOnlineLesson, deleteOnlineLesson } from '@/app/actions/lms';
import { getCourses } from '@/app/actions/courses';
import type { Program, Course, OnlineLesson, OnlineLessonType, OnlineLessonStatus } from '@/lib/types';
import { ArrowLeft, Plus, Edit, Trash2, Video, Clock, Calendar, User, Eye, Loader2 } from 'lucide-react';

export function AdminOnlineClassesClient({ 
  programs 
}: { 
  programs: Program[] 
}) {
  const { success, error: toastError } = useToast();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<OnlineLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<OnlineLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnlineLesson | null>(null);
  const [previewLesson, setPreviewLesson] = useState<OnlineLesson | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    description: '',
    lecturer_id: '',
    lecturer_name: '',
    zoom_join_url: '',
    zoom_meeting_id: '',
    zoom_passcode: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    recording_url: '',
    thumbnail_url: '',
    class_type: 'live_class' as OnlineLessonType,
    status: 'scheduled' as OnlineLessonStatus,
    is_published: false,
  });

  async function loadCourses(programId: string) {
    setLoading(true);
    try {
      const allCourses = await getCourses();
      const programCourses = allCourses.filter(c => c.program_id === programId);
      setCourses(programCourses);
      setSelectedCourse(null);
      setLessons([]);
    } catch (error) {
      console.error('Error loading courses:', error);
      toastError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  async function loadLessons(courseId: string) {
    setLoading(true);
    try {
      const data = await getOnlineLessonsByCourse(courseId);
      setLessons(data);
    } catch (error) {
      console.error('Error loading lessons:', error);
      toastError('Failed to load online lessons');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    const formDataObj = new FormData();
    formDataObj.append('course_id', selectedCourse!.id);
    formDataObj.append('title', formData.title);
    formDataObj.append('topic', formData.topic);
    formDataObj.append('description', formData.description);
    formDataObj.append('lecturer_id', formData.lecturer_id);
    formDataObj.append('lecturer_name', formData.lecturer_name);
    formDataObj.append('zoom_join_url', formData.zoom_join_url);
    formDataObj.append('zoom_meeting_id', formData.zoom_meeting_id);
    formDataObj.append('zoom_passcode', formData.zoom_passcode);
    formDataObj.append('scheduled_date', formData.scheduled_date);
    formDataObj.append('start_time', formData.start_time);
    formDataObj.append('end_time', formData.end_time);
    formDataObj.append('duration_minutes', formData.duration_minutes);
    formDataObj.append('recording_url', formData.recording_url);
    formDataObj.append('thumbnail_url', formData.thumbnail_url);
    formDataObj.append('class_type', formData.class_type);
    formDataObj.append('status', formData.status);
    formDataObj.append('is_published', formData.is_published.toString());

    const result = editingLesson
      ? await updateOnlineLesson(editingLesson.id, formDataObj)
      : await createOnlineLesson(formDataObj);

    if (result.success) {
      success(editingLesson ? 'Lesson updated' : 'Lesson created');
      setShowForm(false);
      setEditingLesson(null);
      resetForm();
      if (selectedCourse) {
        await loadLessons(selectedCourse.id);
      }
    } else {
      toastError(result.error || 'Failed to save lesson');
    }

    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    
    const result = await deleteOnlineLesson(deleteTarget.id);
    if (result.success) {
      success('Lesson deleted');
      setDeleteTarget(null);
      if (selectedCourse) {
        await loadLessons(selectedCourse.id);
      }
    } else {
      toastError(result.error || 'Failed to delete lesson');
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      topic: '',
      description: '',
      lecturer_id: '',
      lecturer_name: '',
      zoom_join_url: '',
      zoom_meeting_id: '',
      zoom_passcode: '',
      scheduled_date: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      recording_url: '',
      thumbnail_url: '',
      class_type: 'live_class',
      status: 'scheduled',
      is_published: false,
    });
  }

  function openForm(lesson?: OnlineLesson) {
    if (lesson) {
      setEditingLesson(lesson);
      setFormData({
        title: lesson.title,
        topic: lesson.topic || '',
        description: lesson.description || '',
        lecturer_id: lesson.lecturer_id || '',
        lecturer_name: lesson.lecturer_name || '',
        zoom_join_url: lesson.zoom_join_url,
        zoom_meeting_id: lesson.zoom_meeting_id || '',
        zoom_passcode: lesson.zoom_passcode || '',
        scheduled_date: lesson.scheduled_date,
        start_time: lesson.start_time,
        end_time: lesson.end_time,
        duration_minutes: lesson.duration_minutes?.toString() || '',
        recording_url: lesson.recording_url || '',
        thumbnail_url: lesson.thumbnail_url || '',
        class_type: lesson.class_type,
        status: lesson.status,
        is_published: lesson.is_published,
      });
    } else {
      setEditingLesson(null);
      resetForm();
    }
    setShowForm(true);
  }

  function handleProgramChange(programId: string) {
    const program = programs.find(p => p.id === programId);
    setSelectedProgram(program || null);
    if (program) {
      loadCourses(program.id);
    }
  }

  function handleCourseChange(courseId: string) {
    const course = courses.find(c => c.id === courseId);
    setSelectedCourse(course || null);
    if (course) {
      loadLessons(course.id);
    }
  }

  function getStatusBadge(status: OnlineLessonStatus) {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      live: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={styles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  function getClassTypeBadge(type: OnlineLessonType) {
    return (
      <Badge variant="outline">
        {type === 'live_class' ? 'Live Class' : 'Recorded Class'}
      </Badge>
    );
  }

  return (
    <div>
      <PageHeader
        title="Online Classes"
        description="Manage live Zoom classes and recorded lessons for students"
        action={
          <Link href="/dashboard/lms/programmes">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to LMS
            </Button>
          </Link>
        }
      />

      {/* Program and Course Selection */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="program">Select Programme</Label>
          <select
            id="program"
            value={selectedProgram?.id || ''}
            onChange={(e) => handleProgramChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Choose a programme</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="course">Select Course</Label>
          <select
            id="course"
            value={selectedCourse?.id || ''}
            onChange={(e) => handleCourseChange(e.target.value)}
            disabled={!selectedProgram}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">{selectedProgram ? "Choose a course" : "Select programme first"}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedCourse && (
        <>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">{selectedCourse.code} - {selectedCourse.name}</h3>
              <p className="text-sm text-slate-600">{selectedProgram?.name}</p>
            </div>
            <Button onClick={() => openForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Online Class
            </Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-600">Loading lessons...</div>
          ) : lessons.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No online classes"
              description="Add Zoom live classes or recorded lessons for this course."
            />
          ) : (
            <DataTable>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lessons.map((lesson) => (
                    <TableRow key={lesson.id}>
                      <TableCell className="font-medium text-slate-900">
                        {lesson.title}
                        {lesson.topic && (
                          <div className="text-sm text-slate-600">{lesson.topic}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {getClassTypeBadge(lesson.class_type)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(lesson.scheduled_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {lesson.start_time} - {lesson.end_time}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lesson.status)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lesson.is_published ? 'success' : 'secondary'}>
                          {lesson.is_published ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setPreviewLesson(lesson)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => openForm(lesson)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(lesson)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTable>
          )}
        </>
      )}

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingLesson(null);
          resetForm();
        }}
        title={editingLesson ? 'Edit Online Class' : 'Add Online Class'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Class Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Financial Accounting Live Lesson"
                required
              />
            </div>

            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g., Regression Analysis"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Class description for students"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lecturer_name">Lecturer Name</Label>
              <Input
                id="lecturer_name"
                value={formData.lecturer_name}
                onChange={(e) => setFormData({ ...formData, lecturer_name: e.target.value })}
                placeholder="e.g., Dr. John Mwangi"
              />
            </div>

            <div>
              <Label htmlFor="class_type">Class Type</Label>
              <select
                id="class_type"
                value={formData.class_type}
                onChange={(e) => setFormData({ ...formData, class_type: e.target.value as OnlineLessonType })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="live_class">Live Zoom Class</option>
                <option value="recorded_class">Recorded Class</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="zoom_join_url">Zoom Join URL *</Label>
            <Input
              id="zoom_join_url"
              value={formData.zoom_join_url}
              onChange={(e) => setFormData({ ...formData, zoom_join_url: e.target.value })}
              placeholder="https://zoom.us/j/123456789"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Full Zoom meeting join URL. Students will click to join live classes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zoom_meeting_id">Meeting ID (Optional)</Label>
              <Input
                id="zoom_meeting_id"
                value={formData.zoom_meeting_id}
                onChange={(e) => setFormData({ ...formData, zoom_meeting_id: e.target.value })}
                placeholder="123 456 7890"
              />
            </div>

            <div>
              <Label htmlFor="zoom_passcode">Passcode (Optional)</Label>
              <Input
                id="zoom_passcode"
                value={formData.zoom_passcode}
                onChange={(e) => setFormData({ ...formData, zoom_passcode: e.target.value })}
                placeholder="ABC123"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="scheduled_date">Date *</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                placeholder="e.g., 120"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as OnlineLessonStatus })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="recording_url">Recording URL (Optional)</Label>
              <Input
                id="recording_url"
                value={formData.recording_url}
                onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                placeholder="https://zoom.us/recording/..."
              />
              <p className="text-xs text-slate-500 mt-1">
                For recorded classes, add the Zoom cloud recording share link
              </p>
            </div>

            <div>
              <Label htmlFor="thumbnail_url">Thumbnail URL (Optional)</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="is_published" className="text-sm">
              Publish to students
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingLesson(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? 'Saving...' : editingLesson ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete online class"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete class"
      />

      <Modal
        open={!!previewLesson}
        onClose={() => setPreviewLesson(null)}
        title={`Preview: ${previewLesson?.title}`}
        size="lg"
      >
        {previewLesson && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {getClassTypeBadge(previewLesson.class_type)}
              {getStatusBadge(previewLesson.status)}
              <Badge variant={previewLesson.is_published ? 'success' : 'secondary'}>
                {previewLesson.is_published ? 'Published' : 'Draft'}
              </Badge>
            </div>

            {previewLesson.topic && (
              <div>
                <h4 className="font-semibold text-slate-900">Topic</h4>
                <p className="text-slate-600">{previewLesson.topic}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </h4>
                <p className="text-slate-600">
                  {new Date(previewLesson.scheduled_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </h4>
                <p className="text-slate-600">
                  {previewLesson.start_time} - {previewLesson.end_time}
                  {previewLesson.duration_minutes && (
                    <span className="ml-2">({previewLesson.duration_minutes} min)</span>
                  )}
                </p>
              </div>
            </div>

            {previewLesson.lecturer_name && (
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Lecturer
                </h4>
                <p className="text-slate-600">{previewLesson.lecturer_name}</p>
              </div>
            )}

            {previewLesson.description && (
              <div>
                <h4 className="font-semibold text-slate-900">Description</h4>
                <p className="text-slate-600">{previewLesson.description}</p>
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-900 mb-2">Zoom Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-600">Join URL:</span>
                  <a 
                    href={previewLesson.zoom_join_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    {previewLesson.zoom_join_url}
                  </a>
                </div>
                {previewLesson.zoom_meeting_id && (
                  <div>
                    <span className="text-slate-600">Meeting ID:</span>
                    <span className="ml-2">{previewLesson.zoom_meeting_id}</span>
                  </div>
                )}
                {previewLesson.zoom_passcode && (
                  <div>
                    <span className="text-slate-600">Passcode:</span>
                    <span className="ml-2">{previewLesson.zoom_passcode}</span>
                  </div>
                )}
              </div>
            </div>

            {previewLesson.recording_url && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-slate-900 mb-2">Recording Available</h4>
                <a 
                  href={previewLesson.recording_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {previewLesson.recording_url}
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
