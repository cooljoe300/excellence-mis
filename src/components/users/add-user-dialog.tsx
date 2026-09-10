'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Select from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { createUser } from '@/app/actions/user-roles';
import type { UserRole } from '@/lib/types';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';

interface AddUserDialogProps {
  currentUserId: string;
  currentUserRole: UserRole;
  onUserCreated?: () => void;
}

export function AddUserDialog({ currentUserId, currentUserRole, onUserCreated }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    fullName: string;
    role: string;
    temporaryPassword: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    confirmPassword: '',
    role: 'staff' as UserRole,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (formData.temporaryPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (formData.temporaryPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    const result = await createUser({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      temporaryPassword: formData.temporaryPassword,
      role: formData.role,
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setCreatedUser({
      email: result.email || formData.email,
      fullName: result.fullName || `${formData.firstName} ${formData.lastName}`,
      role: result.role || formData.role,
      temporaryPassword: formData.temporaryPassword,
    });
    setSuccess(true);
    setLoading(false);
    
    // Notify parent component to refresh user list
    if (onUserCreated) {
      onUserCreated();
    }
    
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      temporaryPassword: '',
      confirmPassword: '',
      role: 'staff',
    });
  };

  const getRoleOptions = () => {
    const options = [
      { value: 'staff', label: 'Staff' },
      { value: 'teacher', label: 'Teacher' },
      { value: 'admin', label: 'Admin' },
    ];

    // Only superadmin can see superadmin option
    if (currentUserRole === 'superadmin') {
      options.push({ value: 'superadmin', label: 'Superadmin' });
    }

    return options;
  };

  const copyToClipboard = (text: string, type: 'link' | 'credentials') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCredentials(true);
      setTimeout(() => setCopiedCredentials(false), 2000);
    }
  };

  const getLoginLink = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/login`;
    }
    return '/login';
  };

  const getCredentialsText = () => {
    if (!createdUser) return '';
    return `Welcome to Excellence Online College.

Your account has been created.

Login Email: ${createdUser.email}
Temporary Password: ${createdUser.temporaryPassword}

Login here: ${getLoginLink()}

You will be required to change your temporary password during your first login.`;
  };

  const closeDialog = () => {
    setOpen(false);
    setSuccess(false);
    setCreatedUser(null);
    setError(null);
  };

  if (!open) {
    return <Button onClick={() => setOpen(true)}>+ Add User</Button>;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900">
              {success ? 'User Created Successfully' : 'Add New User'}
            </h2>
            <button onClick={closeDialog} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>

          {success && createdUser ? (
            <div className="space-y-4">
              <Alert variant="info">
                User account has been created successfully. Share the login details with the user.
              </Alert>

              <div className="space-y-3 rounded-lg border border-slate-200 p-4 bg-slate-50">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Name</p>
                  <p className="font-medium text-slate-900">{createdUser.fullName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Email</p>
                  <p className="font-medium text-slate-900">{createdUser.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Role</p>
                  <p className="font-medium text-slate-900 capitalize">{createdUser.role}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase">Temporary Password</p>
                  <p className="font-medium text-slate-900">{'*'.repeat(createdUser.temporaryPassword.length)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Login Link</p>
                <div className="flex gap-2">
                  <Input
                    value={getLoginLink()}
                    readOnly
                    className="flex-1"
                  />
                  <Button
                    onClick={() => copyToClipboard(getLoginLink(), 'link')}
                    variant="secondary"
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => copyToClipboard(getCredentialsText(), 'credentials')}
                  variant="secondary"
                  className="flex-1"
                >
                  {copiedCredentials ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                  {copiedCredentials ? 'Copied!' : 'Copy Credentials'}
                </Button>
                <Button onClick={closeDialog} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <>
              {error && <Alert variant="error" className="mb-4">{error}</Alert>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254 700 000 000"
                />

                <div className="relative">
                  <Input
                    label="Temporary Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.temporaryPassword}
                    onChange={(e) => setFormData({ ...formData, temporaryPassword: e.target.value })}
                    placeholder="Min. 6 characters"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm temporary password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  options={getRoleOptions()}
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeDialog}
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
