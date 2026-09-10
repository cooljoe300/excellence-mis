'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { getManagedUsers } from '@/app/actions/user-roles';
import { RoleManagementTable } from '@/components/users/role-management-table';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import type { ManagedUserRow } from '@/app/actions/user-roles';

export default function UserRolesPage() {
  const [users, setUsers] = useState<ManagedUserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<'superadmin' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await (supabase.auth as any).getUser();
      
      if (!user) {
        redirect('/login');
        return;
      }

      // Get user role from metadata or profile
      const role = user.user_metadata?.role;
      if (role !== 'superadmin' && role !== 'admin') {
        redirect('/dashboard');
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserRole(role as 'superadmin' | 'admin');
      
      const managedUsers = await getManagedUsers();
      setUsers(managedUsers);
      setLoading(false);
    }
    loadData();
  }, []);

  const handleUserCreated = () => {
    // Refresh the user list
    async function refreshUsers() {
      const managedUsers = await getManagedUsers();
      setUsers(managedUsers);
    }
    refreshUsers();
  };

  if (loading) {
    return null; // Loading
  }

  if (!currentUserRole) {
    return null; // Should redirect
  }

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage account access levels for staff, teachers, admins, and students"
        action={<AddUserDialog currentUserId={currentUserId} currentUserRole={currentUserRole} onUserCreated={handleUserCreated} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Role management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Change a user&apos;s role to control what they can access in the portal.
          </p>
          <RoleManagementTable users={users} currentUserId={currentUserId} currentUserRole={currentUserRole} />
        </CardContent>
      </Card>
    </div>
  );
}

