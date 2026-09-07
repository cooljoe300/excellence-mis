'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Eye, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import type { Profile } from '@/lib/types';

interface LecturerManagementProps {
  lecturers: Profile[];
  onUpdateLecturer: (lecturerId: string, data: FormData) => Promise<{ error?: string; success?: boolean }>;
  onToggleCanTeach: (lecturerId: string, canTeach: boolean) => Promise<{ error?: string; success?: boolean }>;
}

export function LecturerManagement({ lecturers, onUpdateLecturer, onToggleCanTeach }: LecturerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<Profile | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredLecturers = lecturers.filter((lecturer) =>
    lecturer.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecturer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lecturer.staff_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleToggleCanTeach(lecturer: Profile) {
    setLoading(true);
    setError(null);
    const result = await onToggleCanTeach(lecturer.id, !lecturer.can_teach);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  function handleEdit(lecturer: Profile) {
    setSelectedLecturer(lecturer);
    setIsViewMode(false);
    setIsModalOpen(true);
  }

  function handleView(lecturer: Profile) {
    setSelectedLecturer(lecturer);
    setIsViewMode(true);
    setIsModalOpen(true);
  }

  function handleAddNew() {
    setSelectedLecturer(null);
    setIsViewMode(false);
    setIsModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lecturer Management</CardTitle>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lecturer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <Input
              placeholder="Search lecturers by name, email, or staff number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Staff Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Can Teach</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLecturers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-500">
                    No lecturers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLecturers.map((lecturer) => (
                  <TableRow key={lecturer.id}>
                    <TableCell className="font-medium">{lecturer.full_name}</TableCell>
                    <TableCell>{lecturer.email}</TableCell>
                    <TableCell>{lecturer.staff_number || '-'}</TableCell>
                    <TableCell>{lecturer.department || '-'}</TableCell>
                    <TableCell>{lecturer.specialization || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={lecturer.employment_status === 'active' ? 'default' : 'secondary'}>
                        {lecturer.employment_status || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCanTeach(lecturer)}
                        disabled={loading}
                      >
                        {lecturer.can_teach ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleView(lecturer)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(lecturer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LecturerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lecturer={selectedLecturer}
        isViewMode={isViewMode}
        onUpdate={onUpdateLecturer}
      />
    </div>
  );
}

interface LecturerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lecturer: Profile | null;
  isViewMode: boolean;
  onUpdate: (lecturerId: string, data: FormData) => Promise<{ error?: string; success?: boolean }>;
}

function LecturerModal({ isOpen, onClose, lecturer, isViewMode, onUpdate }: LecturerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await onUpdate(lecturer?.id || '', formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isViewMode ? 'View Lecturer' : lecturer ? 'Edit Lecturer' : 'Add Lecturer'}
          </h2>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="full_name" className="text-sm font-medium text-slate-700">
                Full Name
              </label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={lecturer?.full_name || ''}
                disabled={isViewMode}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={lecturer?.email || ''}
                disabled={isViewMode}
                required
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Phone Number
              </label>
              <Input
                id="phone"
                name="phone"
                defaultValue={lecturer?.phone || ''}
                disabled={isViewMode}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="staff_number" className="text-sm font-medium text-slate-700">
                Staff Number
              </label>
              <Input
                id="staff_number"
                name="staff_number"
                defaultValue={lecturer?.staff_number || ''}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium text-slate-700">
                Department
              </label>
              <Input
                id="department"
                name="department"
                defaultValue={lecturer?.department || ''}
                disabled={isViewMode}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="specialization" className="text-sm font-medium text-slate-700">
                Specialization
              </label>
              <Input
                id="specialization"
                name="specialization"
                defaultValue={lecturer?.specialization || ''}
                disabled={isViewMode}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="employment_status" className="text-sm font-medium text-slate-700">
                Employment Status
              </label>
              <Select
                id="employment_status"
                name="employment_status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'on_leave', label: 'On Leave' },
                  { value: 'retired', label: 'Retired' },
                ]}
                defaultValue={lecturer?.employment_status || 'active'}
                disabled={isViewMode}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="can_teach" className="text-sm font-medium text-slate-700">
                Can Teach / Lecturer
              </label>
              <Select
                id="can_teach"
                name="can_teach"
                options={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
                defaultValue={lecturer?.can_teach ? 'true' : 'false'}
                disabled={isViewMode}
              />
            </div>
          </div>

          {!isViewMode && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Lecturer'}
              </Button>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}
