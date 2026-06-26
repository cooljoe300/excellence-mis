'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Inbox,
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/students', label: 'Students', icon: Users },
  { href: '/dashboard/programs', label: 'Programs', icon: GraduationCap },
  { href: '/dashboard/semesters', label: 'Semesters', icon: CalendarDays },
  { href: '/dashboard/intakes', label: 'Intakes', icon: Inbox },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen },
  { href: '/dashboard/enrollments', label: 'Enrollments', icon: ClipboardList },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/dashboard/fees', label: 'Fees', icon: CreditCard },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ userName, userRole }: { userName: string; userRole: UserRole }) {
  const pathname = usePathname();
  const router = useRouter();

  const portalLabel =
    userRole === 'admin'
      ? 'Super Admin Portal'
      : userRole === 'teacher'
        ? 'Teacher Portal'
        : userRole === 'student'
          ? 'Student Portal'
          : 'Staff Portal';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-900 text-white">
      <div className="border-b border-slate-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold">
            EOC
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Excellence Online</p>
            <p className="text-xs text-slate-400">Student MIS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-4 space-y-2">
        <a
          href="https://lms.excellenceonlinecollege.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Open LMS
        </a>
        <div className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs text-slate-400">{portalLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
