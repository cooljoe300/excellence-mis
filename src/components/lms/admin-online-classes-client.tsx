'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getAllOnlineLessons, createOnlineLesson, updateOnlineLesson, deleteOnlineLesson } from '@/app/actions/lms';
import { getCourses } from '@/app/actions/courses';
import { calculateLessonStatus } from '@/lib/lms-utils';
import type { Course, OnlineLesson } from '@/lib/types';
import { Plus, Edit, Trash2, Video, Clock, Calendar, Loader2 } from 'lucide-react';

export function AdminOnlineClassesClient() {
  const { success, error: toastError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<OnlineLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<OnlineLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnlineLesson | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    topic: '',
    description: '',
    scheduled_date: '',
    start_time: '',
    end_time: '',
    zoom_url: '',
    is_published: true,
  });

  useEffect(() => {
    loadCourses();
    loadLessons();
  }, []);

  async function loadCourses() {
    try {
      const allCourses = await getCourses();
      setCourses(allCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
      toastError('Failed to load courses');
    }
  }

  async function loadLessons() {
    setLoading(true);
    try {
      const data = await getAllOnlineLessons();
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
    formDataObj.append('course_id', formData.course_id);
    formDataObj.append('title', formData.title);
    formDataObj.append('topic', formData.topic);
    formDataObj.append('description', formData.description);
    formDataObj.append('scheduled_date', formData.scheduled_date);
    formDataObj.append('start_time', formData.start_time);
    formDataObj.append('end_time', formData.end_time);
    formDataObj.append('zoom_url', formData.zoom_url);
    formDataObj.append('is_published', formData.is_published.toString());

    try {
      if (editingLesson) {
        const result = await updateOnlineLesson(editingLesson.id, formDataObj);
        if (result.success) {
          success('Online class updated successfully');
          setShowForm(false);
          setEditingLesson(null);
          resetForm();
          loadLessons();
        } else {
          toastError(result.error || 'Failed to update online class');
        }
      } else {
        const result = await createOnlineLesson(formDataObj);
        if (result.success) {
          success('Online class published successfully');
          setShowForm(false);
          resetForm();
          loadLessons();
        } else {
          toastError(result.error || 'Failed to publish online class');
        }
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toastError('An error occurred while saving the class');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      const result = await deleteOnlineLesson(deleteTarget.id);
      if (result.success) {
        success('Online class deleted successfully');
        setDeleteTarget(null);
        loadLessons();
      } else {
        toastError(result.error || 'Failed to delete online class');
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toastError('An error occurred while deleting the class');
    }
  }

  function handleEdit(lesson: OnlineLesson) {
    setEditingLesson(lesson);
    setFormData({
      course_id: lesson.course_id,
      title: lesson.title,
      topic: lesson.topic || '',
      description: lesson.description || '',
      scheduled_date: lesson.scheduled_date,
      start_time: lesson.start_time,
      end_time: lesson.end_time,
      zoom_url: lesson.zoom_url,
      is_published: lesson.is_published,
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      course_id: '',
      title: '',
      topic: '',
      description: '',
      scheduled_date: '',
      start_time: '',
      end_time: '',
      zoom_url: '',
      is_published: true,
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTime(timeStr: string) {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }

  const totalClasses = lessons.length;
  const upcomingClasses = lessons.filter(l => calculateLessonStatus(l) === 'upcoming').length;
  const publishedClasses = lessons.filter(l => l.is_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Online Classes</h1>
          <p className="text-slate-600 mt-1">Post and manage Zoom classes for enrolled students.</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingLesson(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Zoom Class
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Total Classes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalClasses}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Upcoming</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{upcomingClasses}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Published</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{publishedClasses}</div>
        </div>
      </div>

      {/* Lessons Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Video className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No online classes yet</h3>
          <p className="text-slate-600 mb-4">Get started by adding your first Zoom class.</p>
          <Button onClick={() => { resetForm(); setEditingLesson(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Zoom Class
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => {
                const status = calculateLessonStatus(lesson);
                const course = courses.find(c => c.id === lesson.course_id);
                return (
                  <TableRow key={lesson.id}>
                    <TableCell className="font-medium">
                      {course?.code || course?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lesson.title}</div>
                        {lesson.topic && (
                          <div className="text-sm text-slate-600">{lesson.topic}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(lesson.scheduled_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {formatTime(lesson.start_time)} – {formatTime(lesson.end_time)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {status === 'live' && (
                          <Badge variant="destructive">LIVE NOW</Badge>
                        )}
                        {status === 'upcoming' && (
                          <Badge variant="default">UPCOMING</Badge>
                        )}
                        {status === 'completed' && (
                          <Badge variant="secondary">COMPLETED</Badge>
                        )}
                        {!lesson.is_published && (
                          <Badge variant="outline">DRAFT</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(lesson)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(lesson)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingLesson(null); resetForm(); }}
        title={editingLesson ? 'Edit Zoom Class' : 'Add Zoom Class'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="course_id" className="block text-sm font-medium text-slate-700 mb-1">
              Unit <span className="text-red-600">*</span>
            </label>
            <select
              id="course_id"
              required
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            >
              <option value="">Select unit</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Class Title <span className="text-red-600">*</span>
            </label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Quantitative Analysis — Regression Analysis"
            />
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1">
              Topic
            </label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              placeholder="e.g., Regression Analysis"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="scheduled_date" className="block text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-600">*</span>
              </label>
              <Input
                id="scheduled_date"
                type="date"
                required
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-slate-700 mb-1">
                  Start <span className="text-red-600">*</span>
                </label>
                <Input
                  id="start_time"
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-slate-700 mb-1">
                  End <span className="text-red-600">*</span>
                </label>
                <Input
                  id="end_time"
                  type="time"
                  required
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="zoom_url" className="block text-sm font-medium text-slate-700 mb-1">
              Zoom Join URL <span className="text-red-600">*</span>
            </label>
            <Input
              id="zoom_url"
              type="url"
              required
              value={formData.zoom_url}
              onChange={(e) => setFormData({ ...formData, zoom_url: e.target.value })}
              placeholder="https://zoom.us/j/123456789"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description of the class content..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              checked={formData.is_published}
              onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-950"
            />
            <label htmlFor="is_published" className="text-sm text-slate-700">
              Publish this class (visible to students)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setShowForm(false); setEditingLesson(null); resetForm(); }}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingLesson ? 'Update Class' : 'Publish Class'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Online Class"
        description="Are you sure you want to delete this online class? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
