'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { updateUserRole, deleteUser, resetUserPassword, forcePasswordChange, type ManagedUserRow } from '@/app/actions/user-roles';
import { toggleLecturerCanTeach } from '@/app/actions/timetable';
import { formatDate } from '@/lib/utils';
import type { UserRole } from '@/lib/types';
import { Trash2, KeyRound, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

const SUPERADMIN_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
];

export function RoleManagementTable({
  users,
  currentUserId,
  currentUserRole,
}: {
  users: ManagedUserRow[];
  currentUserId: string;
  currentUserRole: UserRole;
}) {
  const roleOptions = currentUserRole === 'superadmin' ? SUPERADMIN_ROLE_OPTIONS : ROLE_OPTIONS;
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRole>>(
    Object.fromEntries(users.map((user) => [user.id, user.role]))
  );
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ManagedUserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<ManagedUserRow | null>(null);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [forcePasswordChangeDialogOpen, setForcePasswordChangeDialogOpen] = useState(false);
  const [userToForcePasswordChange, setUserToForcePasswordChange] = useState<ManagedUserRow | null>(null);
  const [forcePasswordChangeLoading, setForcePasswordChangeLoading] = useState(false);
  const [toggleCanTeachLoading, setToggleCanTeachLoading] = useState<string | null>(null);

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

  function openResetPasswordDialog(user: ManagedUserRow) {
    setUserToResetPassword(user);
    setTemporaryPassword('');
    setResetPasswordError(null);
    setResetPasswordDialogOpen(true);
  }

  async function confirmResetPassword() {
    if (!userToResetPassword || !temporaryPassword) return;
    setResetPasswordLoading(true);
    setResetPasswordError(null);

    if (temporaryPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters.');
      setResetPasswordLoading(false);
      return;
    }

    const result = await resetUserPassword(userToResetPassword.id, temporaryPassword);
    if (result.error) {
      setResetPasswordError(result.error);
      setResetPasswordLoading(false);
      return;
    }

    setResetPasswordDialogOpen(false);
    setUserToResetPassword(null);
    setResetPasswordLoading(false);
    setMessage('Password reset successfully. User will need to change it on next login.');
    setTimeout(() => setMessage(null), 3000);
  }

  function openForcePasswordChangeDialog(user: ManagedUserRow) {
    setUserToForcePasswordChange(user);
    setForcePasswordChangeDialogOpen(true);
  }

  async function confirmForcePasswordChange() {
    if (!userToForcePasswordChange) return;
    setForcePasswordChangeLoading(true);

    const result = await forcePasswordChange(userToForcePasswordChange.id);
    if (result.error) {
      setError(result.error);
      setForcePasswordChangeLoading(false);
      return;
    }

    setForcePasswordChangeDialogOpen(false);
    setUserToForcePasswordChange(null);
    setForcePasswordChangeLoading(false);
    setMessage('User will be required to change password on next login.');
    setTimeout(() => setMessage(null), 3000);
  }

  async function handleToggleCanTeach(userId: string, currentCanTeach: boolean) {
    setToggleCanTeachLoading(userId);
    const result = await toggleLecturerCanTeach(userId, !currentCanTeach);
    if (result.error) {
      setError(result.error);
      setToggleCanTeachLoading(null);
      return;
    }
    setToggleCanTeachLoading(null);
    setMessage(`Lecturer capability ${!currentCanTeach ? 'enabled' : 'disabled'} successfully.`);
    setTimeout(() => setMessage(null), 3000);
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
              <th className="px-4 py-3 font-medium">Can Teach</th>
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
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleCanTeach(user.id, user.can_teach || false)}
                      disabled={toggleCanTeachLoading === user.id}
                    >
                      {toggleCanTeachLoading === user.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : user.can_teach ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-[260px] items-end gap-2">
                      <div className="flex-1">
                        <Select
                          value={draftRole}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({ ...prev, [user.id]: e.target.value as UserRole }))
                          }
                          options={roleOptions}
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
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openResetPasswordDialog(user)}
                        title="Reset password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openForcePasswordChangeDialog(user)}
                        title="Force password change on next login"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => openDeleteDialog(user)}
                        disabled={isCurrentUser}
                        title={isCurrentUser ? "You cannot delete your own account" : "Delete user"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Reset Password Modal */}
      <Modal
        open={resetPasswordDialogOpen}
        onClose={() => setResetPasswordDialogOpen(false)}
        title="Reset Password"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Set a new temporary password for <strong>{userToResetPassword?.full_name || 'this user'}</strong>. They will need to change it on next login.
          </p>
          <Input
            label="Temporary Password"
            type="password"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            placeholder="Min. 6 characters"
            minLength={6}
          />
          {resetPasswordError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {resetPasswordError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setResetPasswordDialogOpen(false)}
              disabled={resetPasswordLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmResetPassword}
              disabled={resetPasswordLoading}
            >
              {resetPasswordLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Force Password Change Modal */}
      <Modal
        open={forcePasswordChangeDialogOpen}
        onClose={() => setForcePasswordChangeDialogOpen(false)}
        title="Force Password Change"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Force <strong>{userToForcePasswordChange?.full_name || 'this user'}</strong> to change their password on their next login.
          </p>
          <p className="text-sm text-slate-500">
            This will set the <code className="bg-slate-100 px-1 py-0.5 rounded">must_change_password</code> flag to true. The user will be redirected to the password change page when they log in next.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setForcePasswordChangeDialogOpen(false)}
              disabled={forcePasswordChangeLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmForcePasswordChange}
              disabled={forcePasswordChangeLoading}
            >
              {forcePasswordChangeLoading ? 'Setting...' : 'Force Password Change'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

