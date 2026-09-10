'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, DataTable, EmptyState } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { getLearningActivitiesByCourse, createLearningActivity, updateLearningActivity, deleteLearningActivity } from '@/app/actions/lms';
import type { Program, Course, LmsLearningActivity, LmsActivityProvider, LmsLaunchMode, LmsActivityStatus } from '@/lib/types';
import { ArrowLeft, Plus, Edit, Trash2, Video, Clock, ExternalLink, Eye } from 'lucide-react';

export function LmsUnitActivitiesClient({ 
  program, 
  course 
}: { 
  program: Program; 
  course: Course 
}) {
  const { success, error: toastError } = useToast();
  const [activities, setActivities] = useState<LmsLearningActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<LmsLearningActivity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LmsLearningActivity | null>(null);
  const [previewActivity, setPreviewActivity] = useState<LmsLearningActivity | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    external_url: '',
    description: '',
    display_description: true,
    provider: 'external_link' as LmsActivityProvider,
    launch_mode: 'iframe' as LmsLaunchMode,
    status: 'active' as LmsActivityStatus,
  });

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await getLearningActivitiesByCourse(course.id);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
      toastError('Failed to load learning activities');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    const formDataObj = new FormData();
    formDataObj.append('course_id', course.id);
    formDataObj.append('name', formData.name);
    formDataObj.append('external_url', formData.external_url);
    formDataObj.append('description', formData.description);
    formDataObj.append('display_description', formData.display_description.toString());
    formDataObj.append('provider', formData.provider);
    formDataObj.append('launch_mode', formData.launch_mode);
    formDataObj.append('status', formData.status);

    const result = editingActivity
      ? await updateLearningActivity(editingActivity.id, formDataObj)
      : await createLearningActivity(formDataObj);

    if (result.success) {
      success(editingActivity ? 'Activity updated' : 'Activity created');
      setShowForm(false);
      setEditingActivity(null);
      resetForm();
      await loadActivities();
    } else {
      toastError(result.error || 'Failed to save activity');
    }

    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    
    const result = await deleteLearningActivity(deleteTarget.id);
    if (result.success) {
      success('Activity deleted');
      setDeleteTarget(null);
      await loadActivities();
    } else {
      toastError(result.error || 'Failed to delete activity');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      external_url: '',
      description: '',
      display_description: true,
      provider: 'external_link' as LmsActivityProvider,
      launch_mode: 'iframe' as LmsLaunchMode,
      status: 'active' as LmsActivityStatus,
    });
  }

  function openForm(activity?: LmsLearningActivity) {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        name: activity.name,
        external_url: activity.external_url,
        description: activity.description || '',
        display_description: activity.display_description,
        provider: activity.provider as LmsActivityProvider,
        launch_mode: activity.launch_mode as LmsLaunchMode,
        status: activity.status as LmsActivityStatus,
      });
    } else {
      setEditingActivity(null);
      resetForm();
    }
    setShowForm(true);
  }

  // Load activities on mount
  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <div>
      <PageHeader
        title={`${course.code} - ${course.name}`}
        description={`${program.name} • Learning Activities`}
        action={
          <Link href={`/dashboard/lms/programmes/${program.id}`}>
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Courses
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex justify-end">
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Learning Activity
        </Button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-slate-600">Loading activities...</div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No learning activities"
          description="Add Zoom lessons, external learning links, or other activities for this course."
        />
      ) : (
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Launch Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-medium text-slate-900">{activity.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{activity.provider.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-muted text-sm">
                    {activity.launch_mode.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <Badge status={activity.status}>{activity.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => setPreviewActivity(activity)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => openForm(activity)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(activity)}>
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

      <Modal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingActivity(null);
          resetForm();
        }}
        title={editingActivity ? 'Edit Learning Activity' : 'Add Learning Activity'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Activity Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Financial Accounting Live Lesson"
              required
            />
          </div>

          <div>
            <Label htmlFor="external_url">External URL *</Label>
            <Input
              id="external_url"
              value={formData.external_url}
              onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
              placeholder="https://zoom.us/j/123456789"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Must use http:// or https://
            </p>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Activity description for students"
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="display_description"
              checked={formData.display_description}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, display_description: checked as boolean })
              }
            />
            <Label htmlFor="display_description" className="text-sm">
              Display description on course page
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <select
                id="provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as LmsActivityProvider })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="zoom">Zoom</option>
                <option value="microsoft_teams">Microsoft Teams</option>
                <option value="google_meet">Google Meet</option>
                <option value="moodle">Moodle</option>
                <option value="external_link">External Link</option>
              </select>
            </div>

            <div>
              <Label htmlFor="launch_mode">Launch Mode</Label>
              <select
                id="launch_mode"
                value={formData.launch_mode}
                onChange={(e) => setFormData({ ...formData, launch_mode: e.target.value as LmsLaunchMode })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="iframe">Embedded Inside MIS (Recommended)</option>
                <option value="zoom_sdk">Zoom SDK</option>
                <option value="same_tab">Same Tab (Fallback)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                If the provider blocks embedding, students will see a fallback option
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as LmsActivityStatus })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setEditingActivity(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={formLoading}>
              {formLoading ? 'Saving...' : editingActivity ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete learning activity"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete activity"
      />

      <Modal
        open={!!previewActivity}
        onClose={() => setPreviewActivity(null)}
        title={`Preview: ${previewActivity?.name}`}
        size="xl"
      >
        {previewActivity && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline">{previewActivity.provider.replace('_', ' ')}</Badge>
              <Badge status={previewActivity.status}>{previewActivity.status}</Badge>
              <span className="text-sm text-slate-600">
                {previewActivity.launch_mode.replace('_', ' ')}
              </span>
            </div>

            {previewActivity.display_description && previewActivity.description && (
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700">{previewActivity.description}</p>
              </div>
            )}

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This is a preview for administrators. Students will see this content
                through the activity viewer. If the provider blocks iframe embedding, students will see a
                fallback message with a button to open the content directly.
              </p>
            </div>

            <iframe
              src={previewActivity.external_url}
              className="w-full h-[60vh] border-0 rounded-lg bg-white"
              title={`Preview: ${previewActivity.name}`}
              allow="autoplay; fullscreen; picture-in-picture; camera; microphone; display-capture"
              allowFullScreen
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
