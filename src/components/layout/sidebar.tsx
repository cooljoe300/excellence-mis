'use client';

import { useState } from 'react';
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
  X,
  UserMinus,
  IdCard,
  User,
  ChevronDown,
  ChevronRight,
  Award,
  Calendar,
  FileText,
  Library,
  Video,
  ExternalLink,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import type { UserRole } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: any;
  roles: UserRole[];
  section?: string | null;
  external?: boolean;
}

const allNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/students', label: 'Students', icon: Users, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/programs', label: 'Programs', icon: GraduationCap, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/semesters', label: 'Semesters', icon: CalendarDays, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/intakes', label: 'Intakes', icon: Inbox, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/courses', label: 'Courses', icon: BookOpen, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/enrollments', label: 'Enrollments', icon: ClipboardList, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/deregistered-units', label: 'Deregistered Units', icon: Ban, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/timetable', label: 'Timetable', icon: Calendar, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/timetable/rooms', label: 'Rooms', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/fees', label: 'Fees', icon: CreditCard, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/users', label: 'Users & Roles', icon: Shield, roles: ['superadmin', 'admin'] as UserRole[] },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['superadmin', 'admin', 'staff'] as UserRole[] },
  { href: '/dashboard/lms/programmes', label: 'LMS Programmes', icon: Library, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: '/dashboard/lms/online-classes', label: 'Online Classes', icon: Video, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[] },
  { href: 'https://lms.excellenceonlinecollege.com', label: 'Open LMS', icon: ExternalLink, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], external: true },
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student'] as UserRole[], section: null },
  { href: '/student/register', label: 'My Details', icon: User, roles: ['student'] as UserRole[], section: 'Personal' },
  { href: '/student/enroll', label: 'Register Units', icon: BookOpen, roles: ['student'] as UserRole[], section: 'Academic' },
  { href: '/student/academic-records', label: 'Academic Records', icon: ClipboardList, roles: ['student'] as UserRole[], section: 'Academic' },
  { href: '/student/exam-results', label: 'Exam Results', icon: Award, roles: ['student'] as UserRole[], section: 'Academic' },
  { href: '/student/timetable', label: 'Timetable', icon: Calendar, roles: ['student'] as UserRole[], section: 'Academic' },
  { href: '/student/deregister', label: 'Deregister', icon: UserMinus, roles: ['student'] as UserRole[], section: 'Academic' },
  { href: 'https://lms.excellenceonlinecollege.com', label: 'Open LMS', icon: ExternalLink, roles: ['student'] as UserRole[], section: 'Academic', external: true },
  { href: '/student/fees', label: 'Fee Statement', icon: CreditCard, roles: ['student'] as UserRole[], section: 'Finance' },
  { href: '/student/id-card', label: 'My ID Card', icon: IdCard, roles: ['student'] as UserRole[], section: 'Services' },
  { href: '/student/admission-letter', label: 'Admission Letter', icon: FileText, roles: ['student'] as UserRole[], section: 'Services' },
  { href: '/student/lms/my-learning', label: 'My Learning', icon: Library, roles: ['student'] as UserRole[], section: 'Academic' },
  { href: '/teacher', label: 'Dashboard', icon: LayoutDashboard, roles: ['teacher'] as UserRole[], section: null },
  { href: '/teacher/timetable', label: 'My Timetable', icon: Calendar, roles: ['teacher'] as UserRole[], section: null },
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Personal', 'Academic', 'Finance', 'Services']));

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
    await (supabase.auth as any).signOut();
    router.push('/login');
    router.refresh();
  }

  function handleNavClick() {
    onMobileClose?.();
  }

  function toggleSection(section: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  const groupedNavItems = navItems.reduce((acc, item) => {
    const section = item.section || 'main';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof navItems>);

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
        {Object.entries(groupedNavItems).map(([section, items]) => {
          if (section === 'main') {
            return items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              const isExternal = item.external;
              
              if (isExternal) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleNavClick}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      'text-slate-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </a>
                );
              }
              
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
            });
          }

          const isExpanded = expandedSections.has(section);
          const hasActiveItem = items.some(
            (item) =>
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
          );

          return (
            <div key={section}>
              <button
                type="button"
                onClick={() => toggleSection(section)}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  hasActiveItem
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                )}
              >
                <span>{section}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-0.5 pl-4">
                  {items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    const isExternal = item.external;
                    
                    if (isExternal) {
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleNavClick}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                            'text-slate-300 hover:bg-white/10 hover:text-white'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </a>
                      );
                    }
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
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
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-4 space-y-2">
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
