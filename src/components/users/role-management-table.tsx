'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { updateUserRole, deleteUser, type ManagedUserRow } from '@/app/actions/user-roles';
import { formatDate } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import { Trash2 } from 'lucide-react';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

export function RoleManagementTable({
  users,
  currentUserId,
}: {
  users: ManagedUserRow[];
  currentUserId: string;
}) {
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>(
    Object.fromEntries(users.map((user) => [user.id, user.role]))
  );
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function saveRole(userId: string) {
    const role = roleDrafts[userId];
    if (!role) return;

    setBusyUserId(userId);
    setError(null);
    setMessage(null);

    const result = await updateUserRole(userId, role);
    if (result.error) {
      setError(result.error);
      setBusyUserId(null);
      return;
    }

    setMessage('User role updated successfully.');
    setBusyUserId(null);
  }

  function openDeleteDialog(user: ManagedUserRow) {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
    setError(null);
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    setDeleteLoading(true);
    setError(null);
    setMessage(null);

    const result = await deleteUser(userToDelete.id);
    if (result.error) {
      setError(result.error);
      setDeleteLoading(false);
      return;
    }

    setMessage(result.softDeleted ? 'User deactivated successfully.' : 'User deleted successfully.');
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    setDeleteLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-600">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Current role</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Update role</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {users.map((user) => {
              const draftRole = roleDrafts[user.id] ?? user.role;
              const isBusy = busyUserId === user.id;
              const isCurrentUser = user.id === currentUserId;
              const unchanged = draftRole === user.role;

              return (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{user.full_name ?? 'No name'}</p>
                    {isCurrentUser && <p className="text-xs text-blue-700">You</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.email ?? '—'}</td>
                  <td className="px-4 py-3 capitalize text-slate-700">{user.role}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[260px] items-end gap-2">
                      <div className="flex-1">
                        <Select
                          value={draftRole}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({ ...prev, [user.id]: e.target.value as UserRole }))
                          }
                          options={ROLE_OPTIONS}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => saveRole(user.id)}
                        disabled={isBusy || unchanged}
                      >
                        {isBusy ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openDeleteDialog(user)}
                      disabled={isCurrentUser}
                      title={isCurrentUser ? "You cannot delete your own account" : "Delete user"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete User?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{userToDelete?.full_name || 'this user'}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

