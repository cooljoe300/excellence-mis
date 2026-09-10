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
import type { Course, OnlineLesson } from '@/lib/types';
import { Plus, Edit, Trash2, Video, Play, Loader2, Lock, Copy, Calendar } from 'lucide-react';

export function AdminOnlineClassesClient() {
  const { success, error: toastError } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<OnlineLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<OnlineLesson | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnlineLesson | null>(null);
  const [previewLesson, setPreviewLesson] = useState<OnlineLesson | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    course_id: '',
    title: '',
    topic: '',
    description: '',
    recording_url: '',
    passcode: '',
    class_type: 'recorded' as 'live' | 'recorded',
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
    formDataObj.append('recording_url', formData.recording_url);
    formDataObj.append('passcode', formData.passcode);
    formDataObj.append('class_type', formData.class_type);
    formDataObj.append('is_published', formData.is_published.toString());

    try {
      if (editingLesson) {
        const result = await updateOnlineLesson(editingLesson.id, formDataObj);
        if (result.success) {
          success('Recorded class updated successfully');
          setShowForm(false);
          setEditingLesson(null);
          resetForm();
          loadLessons();
        } else {
          toastError(result.error || 'Failed to update recorded class');
        }
      } else {
        const result = await createOnlineLesson(formDataObj);
        if (result.success) {
          success('Recorded class published successfully');
          setShowForm(false);
          resetForm();
          loadLessons();
        } else {
          toastError(result.error || 'Failed to publish recorded class');
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
        success('Recorded class deleted successfully');
        setDeleteTarget(null);
        loadLessons();
      } else {
        toastError(result.error || 'Failed to delete recorded class');
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
      recording_url: lesson.recording_url || '',
      passcode: lesson.passcode || '',
      class_type: lesson.class_type || 'recorded',
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
      recording_url: '',
      passcode: '',
      class_type: 'recorded',
      is_published: true,
    });
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    success('Passcode copied to clipboard');
  }

  const totalClasses = lessons.length;
  const recordedClasses = lessons.filter(l => l.class_type === 'recorded').length;
  const publishedClasses = lessons.filter(l => l.is_published).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recorded Classes</h1>
          <p className="text-slate-600 mt-1">Add and manage recorded lessons for your students.</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingLesson(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Recorded Class
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Total Classes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalClasses}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-sm text-slate-600">Recorded</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{recordedClasses}</div>
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
          <h3 className="text-lg font-medium text-slate-900 mb-2">No recorded classes yet</h3>
          <p className="text-slate-600 mb-4">Get started by adding your first recorded class.</p>
          <Button onClick={() => { resetForm(); setEditingLesson(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Recorded Class
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Unit</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => {
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
                      <Badge variant={lesson.class_type === 'recorded' ? 'secondary' : 'default'}>
                        {lesson.class_type === 'recorded' ? 'RECORDED' : 'LIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {formatDate(lesson.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                          onClick={() => setPreviewLesson(lesson)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
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
        open={showForm}
        onClose={() => { setShowForm(false); setEditingLesson(null); resetForm(); }}
        title={editingLesson ? 'Edit Recorded Class' : 'Add Recorded Class'}
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
              placeholder="e.g., Introduction to Financial Accounting – Lesson 1"
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
              placeholder="e.g., Introduction to Double Entry Accounting"
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
              placeholder="This recorded lesson covers the basic principles of double-entry accounting."
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="recording_url" className="block text-sm font-medium text-slate-700 mb-1">
              Recorded Class URL <span className="text-red-600">*</span>
            </label>
            <Input
              id="recording_url"
              type="url"
              required
              value={formData.recording_url}
              onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
              placeholder="Paste Zoom recording link here"
            />
          </div>

          <div>
            <label htmlFor="class_type" className="block text-sm font-medium text-slate-700 mb-1">
              Class Type
            </label>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-slate-400" />
              <span className="text-sm text-slate-600">Recorded Class</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Students will click to watch the recorded class.</p>
            <input type="hidden" name="class_type" value={formData.class_type} />
          </div>

          <div>
            <label htmlFor="passcode" className="block text-sm font-medium text-slate-700 mb-1">
              Passcode
            </label>
            <Input
              id="passcode"
              value={formData.passcode}
              onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
              placeholder="Enter recording passcode if required"
            />
            <p className="text-xs text-slate-500 mt-1">Leave blank if the recording does not require a passcode.</p>
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
              Publish to students
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
                editingLesson ? 'Update Class' : 'Save Recorded Class'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      {previewLesson && (
        <Modal
          open={!!previewLesson}
          onClose={() => setPreviewLesson(null)}
          title="Class Preview"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Unit</label>
              <p className="text-slate-900 mt-1">
                {courses.find(c => c.id === previewLesson.course_id)?.code} - {courses.find(c => c.id === previewLesson.course_id)?.name}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Class Title</label>
              <p className="text-slate-900 mt-1">{previewLesson.title}</p>
            </div>
            {previewLesson.topic && (
              <div>
                <label className="text-sm font-medium text-slate-700">Topic</label>
                <p className="text-slate-900 mt-1">{previewLesson.topic}</p>
              </div>
            )}
            {previewLesson.description && (
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <p className="text-slate-900 mt-1">{previewLesson.description}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant={previewLesson.class_type === 'recorded' ? 'secondary' : 'default'}>
                {previewLesson.class_type === 'recorded' ? 'RECORDED CLASS' : 'LIVE CLASS'}
              </Badge>
            </div>
            {previewLesson.passcode && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-700">Recording Passcode</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(previewLesson.passcode)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-slate-900 font-mono">{previewLesson.passcode}</p>
              </div>
            )}
            <div className="pt-4 border-t border-slate-200">
              <Button
                onClick={() => {
                  if (previewLesson.recording_url) {
                    window.open(previewLesson.recording_url, '_blank', 'noopener,noreferrer');
                  } else if (previewLesson.zoom_url) {
                    window.open(previewLesson.zoom_url, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {previewLesson.class_type === 'recorded' ? 'Watch Recording' : 'Join Class'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Recorded Class"
        description="Are you sure you want to delete this recorded class? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </div>
  );
}
