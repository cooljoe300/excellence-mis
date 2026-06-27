'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap, LogOut, User, ExternalLink, BookOpen, CreditCard, IdCard, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/ui/logo';
import { InstallAppButton } from '@/components/student/install-app-button';
import { InstallAppPrompt } from '@/components/student/install-app-prompt';
import { useState } from 'react';

const navItems = [
  { href: '/student', label: 'My Portal', icon: GraduationCap },
  { href: '/student/enroll', label: 'Register Units', icon: BookOpen },
  { href: '/student/fees', label: 'Pay Fees', icon: CreditCard },
  { href: '/student/id-card', label: 'My ID Card', icon: IdCard },
  { href: '/student/register', label: 'My Details', icon: User },
];

export function StudentShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Logo size="md" href={null} />

          <div className="flex items-center gap-2 sm:gap-4">
            <InstallAppButton />
            <a
              href="https://lms.excellenceonlinecollege.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-light transition-colors sm:flex"
            >
              <ExternalLink className="h-4 w-4" />
              Open LMS
            </a>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900">{userName}</p>
              <p className="text-xs text-muted">Student</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden max-w-5xl gap-1 px-6 pb-3 sm:flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/student' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-light text-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <nav className="border-t border-border bg-white px-4 py-3 sm:hidden animate-slide-up">
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/student' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-light text-primary'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              <a
                href="https://lms.excellenceonlinecollege.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary"
              >
                <ExternalLink className="h-4 w-4" />
                Open LMS
              </a>
              <div className="px-3 py-2">
                <InstallAppButton className="w-full justify-center" />
              </div>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8">{children}</main>
      <InstallAppPrompt />
    </div>
  );
}
