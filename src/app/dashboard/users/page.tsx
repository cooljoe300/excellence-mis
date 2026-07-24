import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUserRole } from '@/lib/auth';
import { getManagedUsers } from '@/app/actions/user-roles';
import { RoleManagementTable } from '@/components/users/role-management-table';
import { AddUserDialog } from '@/components/users/add-user-dialog';

export default async function UserRolesPage() {
  const role = await getCurrentUserRole();
  if (role !== 'superadmin' && role !== 'admin') redirect('/dashboard');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const users = await getManagedUsers();

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        description="Manage account access levels for staff, teachers, admins, and students"
        action={<AddUserDialog currentUserId={user.id} currentUserRole={role} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Role management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Change a user&apos;s role to control what they can access in the portal.
          </p>
          <RoleManagementTable users={users} currentUserId={user.id} currentUserRole={role} />
        </CardContent>
      </Card>
    </div>
  );
}

