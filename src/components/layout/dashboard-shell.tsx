import { Sidebar } from './sidebar';
import type { UserRole } from '@/lib/types';

export function DashboardShell({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: UserRole;
}) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar userName={userName} userRole={userRole} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
