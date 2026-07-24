'use client';

import { useState, useEffect } from 'react';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUserRole } from '@/lib/auth';
import { getManagedUsers } from '@/app/actions/user-roles';
import { RoleManagementTable } from '@/components/users/role-management-table';
import { AddUserDialog } from '@/components/users/add-user-dialog';
import type { ManagedUserRow } from '@/app/actions/user-roles';

export default function UserRolesPage() {
  const [users, setUsers] = useState<ManagedUserRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<'superadmin' | 'admin' | null>(null);

  useEffect(() => {
    async function loadData() {
      const role = await getCurrentUserRole();
      if (role !== 'superadmin' && role !== 'admin') {
        redirect('/dashboard');
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        redirect('/login');
        return;
      }

      setCurrentUserId(user.id);
      setCurrentUserRole(role as 'superadmin' | 'admin');
      
      const managedUsers = await getManagedUsers();
      setUsers(managedUsers);
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

  if (!currentUserRole) {
    return null; // Loading
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

