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
  DollarSign,
  Building2,
  TrendingUp,
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
  children?: NavItem[];
  isParent?: boolean;
}

const allNavItems: NavItem[] = [
  // Admin navigation - GENERAL
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'GENERAL' },
  // Admin navigation - ACADEMICS
  { href: '/dashboard/students', label: 'Students', icon: Users, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'ACADEMICS' },
  { href: '/dashboard/programs', label: 'Programs', icon: GraduationCap, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'ACADEMICS' },
  { href: '/dashboard/courses', label: 'Courses / Units', icon: BookOpen, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'ACADEMICS' },
  { href: '/dashboard/intakes', label: 'Intakes', icon: Inbox, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'ACADEMICS' },
  { href: '/dashboard/enrollments', label: 'Enrollments', icon: ClipboardList, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'ACADEMICS' },
  { href: '/dashboard/deregistered-units', label: 'Deregistered Units', icon: Ban, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'ACADEMICS' },
  // Admin navigation - TIMETABLE & ATTENDANCE
  { href: '/dashboard/timetable', label: 'Timetable', icon: Calendar, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'TIMETABLE & ATTENDANCE' },
  { href: '/dashboard/timetable/rooms', label: 'Rooms', icon: LayoutDashboard, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'TIMETABLE & ATTENDANCE' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'TIMETABLE & ATTENDANCE' },
  // Admin navigation - FINANCE
  { href: '/dashboard/fees', label: 'Fees', icon: CreditCard, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'FINANCE' },
  // Admin navigation - REPORTING (with submenus)
  { 
    href: '/dashboard/reports', 
    label: 'Reports', 
    icon: BarChart3, 
    roles: ['superadmin', 'admin', 'staff'] as UserRole[], 
    section: 'REPORTING',
    isParent: true,
    children: [
      { href: '/dashboard/reports?category=student-reports', label: 'Student Reports', icon: Users, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: null },
      { href: '/dashboard/reports?category=academic-reports', label: 'Academic Reports', icon: BookOpen, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: null },
      { href: '/dashboard/reports?category=finance-reports', label: 'Finance Reports', icon: DollarSign, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: null },
      { href: '/dashboard/reports?category=administrative-reports', label: 'Administrative Reports', icon: Building2, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: null },
    ]
  },
  // Admin navigation - LMS & ONLINE LEARNING
  { href: '/dashboard/lms/programmes', label: 'LMS Programmes', icon: Library, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'LMS & ONLINE LEARNING' },
  { href: '/dashboard/lms/online-classes', label: 'Online Classes', icon: Video, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'LMS & ONLINE LEARNING' },
  { href: 'https://lms.excellenceonlinecollege.com', label: 'Open LMS', icon: ExternalLink, roles: ['superadmin', 'admin', 'staff', 'teacher'] as UserRole[], section: 'LMS & ONLINE LEARNING', external: true },
  // Admin navigation - ADMINISTRATION
  { href: '/dashboard/users', label: 'Users & Roles', icon: Shield, roles: ['superadmin', 'admin'] as UserRole[], section: 'ADMINISTRATION' },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: FileText, roles: ['superadmin', 'admin'] as UserRole[], section: 'ADMINISTRATION' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'ADMINISTRATION' },
  // Admin navigation - legacy semesters (keeping for compatibility)
  { href: '/dashboard/semesters', label: 'Semesters', icon: CalendarDays, roles: ['superadmin', 'admin', 'staff'] as UserRole[], section: 'ACADEMICS' },
  // Student navigation - unchanged
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
  // Teacher navigation - unchanged
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
  const isAdmin = ['superadmin', 'admin', 'staff', 'teacher'].includes(userRole);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    isAdmin 
      ? new Set(['GENERAL', 'ACADEMICS', 'TIMETABLE & ATTENDANCE', 'FINANCE', 'REPORTING', 'LMS & ONLINE LEARNING', 'ADMINISTRATION'])
      : new Set(['Personal', 'Academic', 'Finance', 'Services'])
  );
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set(['Reports']) // Reports is expanded by default
  );

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

  function toggleParent(label: string) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
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
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                  </a>
                );
              }
              
              // Handle parent menu items (like Reports)
              if (item.isParent && item.children) {
                const isParentExpanded = expandedParents.has(item.label);
                const hasActiveChild = item.children.some(
                  (child) =>
                    pathname === child.href ||
                    (child.href !== '/dashboard' && pathname.startsWith(child.href))
                );
                
                return (
                  <div key={item.href}>
                    <button
                      type="button"
                      onClick={() => toggleParent(item.label)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        hasActiveChild
                          ? 'bg-accent text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </div>
                      {isParentExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {isParentExpanded && (
                      <div className="mt-1 space-y-0.5 pl-4">
                        {item.children.map((child) => {
                          const isChildActive =
                            pathname === child.href ||
                            (child.href !== '/dashboard' && pathname.startsWith(child.href));
                          
                          // Handle nested submenus
                          if (child.isParent && child.children) {
                            const isChildParentExpanded = expandedParents.has(child.label);
                            const hasActiveGrandchild = child.children.some(
                              (grandchild) =>
                                pathname === grandchild.href ||
                                (grandchild.href !== '/dashboard' && pathname.startsWith(grandchild.href))
                            );
                            
                            return (
                              <div key={child.href}>
                                <button
                                  type="button"
                                  onClick={() => toggleParent(child.label)}
                                  className={cn(
                                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                    hasActiveGrandchild
                                      ? 'bg-accent/50 text-white'
                                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <child.icon className="h-4 w-4 shrink-0" />
                                    {child.label}
                                  </div>
                                  {isChildParentExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                                {isChildParentExpanded && (
                                  <div className="mt-1 space-y-0.5 pl-4">
                                    {child.children.map((grandchild) => {
                                      const isGrandchildActive =
                                        pathname === grandchild.href ||
                                        (grandchild.href !== '/dashboard' && pathname.startsWith(grandchild.href));
                                      const GrandchildIcon = grandchild.icon;
                                      
                                      return (
                                        <Link
                                          key={grandchild.href}
                                          href={grandchild.href}
                                          onClick={handleNavClick}
                                          className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                            isGrandchildActive
                                              ? 'bg-accent text-white shadow-sm'
                                              : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                          )}
                                        >
                                          <GrandchildIcon className="h-4 w-4 shrink-0" />
                                          {grandchild.label}
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={handleNavClick}
                              className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                                isChildActive
                                  ? 'bg-accent text-white shadow-sm'
                                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
                              )}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
              (item.href !== '/dashboard' && pathname.startsWith(item.href)) ||
              (item.children && item.children.some(
                (child) =>
                  pathname === child.href ||
                  (child.href !== '/dashboard' && pathname.startsWith(child.href)) ||
                  (child.children && child.children.some(
                    (grandchild) =>
                      pathname === grandchild.href ||
                      (grandchild.href !== '/dashboard' && pathname.startsWith(grandchild.href))
                  ))
              ))
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
                    
                    // Handle parent items within sections
                    if (item.isParent && item.children) {
                      const isParentExpanded = expandedParents.has(item.label);
                      const hasActiveChild = item.children.some(
                        (child) =>
                          pathname === child.href ||
                          (child.href !== '/dashboard' && pathname.startsWith(child.href)) ||
                          (child.children && child.children.some(
                            (grandchild) =>
                              pathname === grandchild.href ||
                              (grandchild.href !== '/dashboard' && pathname.startsWith(grandchild.href))
                          ))
                      );
                      
                      return (
                        <div key={item.href}>
                          <button
                            type="button"
                            onClick={() => toggleParent(item.label)}
                            className={cn(
                              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                              hasActiveChild
                                ? 'bg-accent/50 text-white'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-4 w-4 shrink-0" />
                              {item.label}
                            </div>
                            {isParentExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                          {isParentExpanded && (
                            <div className="mt-1 space-y-0.5 pl-4">
                              {item.children.map((child) => {
                                const isChildActive =
                                  pathname === child.href ||
                                  (child.href !== '/dashboard' && pathname.startsWith(child.href));
                                const ChildIcon = child.icon;
                                
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={handleNavClick}
                                    className={cn(
                                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                                      isChildActive
                                        ? 'bg-accent text-white shadow-sm'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                    )}
                                  >
                                    <ChildIcon className="h-4 w-4 shrink-0" />
                                    {child.label}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    
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
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
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
