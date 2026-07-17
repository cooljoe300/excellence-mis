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
  Shield,
  LogOut,
  ExternalLink,
  X,
  UserMinus,
  IdCard,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import type { UserRole } from '@/lib/types';

const allNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/students', label: 'Students', icon: Users, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/dashboard/programs', label: 'Programs', icon: GraduationCap, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/dashboard/semesters', label: 'Semesters', icon: CalendarDays, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/dashboard/intakes', label: 'Intakes', icon: Inbox, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen, roles: ['admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/enrollments', label: 'Enrollments', icon: ClipboardList, roles: ['admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/fees', label: 'Fees', icon: CreditCard, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/dashboard/users', label: 'Users & Roles', icon: Shield, roles: ['admin'] as UserRole[] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin', 'staff'] as UserRole[] },
  { href: '/student', label: 'My Portal', icon: GraduationCap, roles: ['student'] as UserRole[] },
  { href: '/student/enroll', label: 'Register Units', icon: BookOpen, roles: ['student'] as UserRole[] },
  { href: '/student/deregister', label: 'Deregister', icon: UserMinus, roles: ['student'] as UserRole[] },
  { href: '/student/fees', label: 'Pay Fees', icon: CreditCard, roles: ['student'] as UserRole[] },
  { href: '/student/id-card', label: 'My ID Card', icon: IdCard, roles: ['student'] as UserRole[] },
  { href: '/student/register', label: 'My Details', icon: User, roles: ['student'] as UserRole[] },
];

function getNavItems(role: UserRole) {
  return allNavItems.filter((item) => item.roles.includes(role));
}

interface SidebarProps {
  userName: string;
  userRole: UserRole;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ userName, userRole, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavItems(userRole);

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

  function handleNavClick() {
    onMobileClose?.();
  }

  const sidebarContent = (
    <>
      <div className="border-b border-slate-700 px-5 py-5">
        <div className="flex items-center justify-between">
          <Logo size="md" href={null} className="rounded-lg bg-white px-2 py-1" />
          {mobileOpen && onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
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
        <div className="flex items-center justify-between rounded-lg bg-slate-800/80 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="text-xs text-slate-400">{portalLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[var(--sidebar-bg)] text-white lg:hidden',
          'transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0 animate-slide-in-right' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-full w-64 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-white shrink-0">
        {sidebarContent}
      </aside>
    </>
  );
}
