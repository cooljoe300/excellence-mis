'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Profile', segment: '' },
  { label: 'Enrollment', segment: 'enrollment' },
  { label: 'ID Card', segment: 'id-card' },
  { label: 'Registration', segment: 'registration' },
  { label: 'Fees', segment: 'fees' },
  { label: 'Activity Log', segment: 'log' },
] as const;

export function StudentDetailNav({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/dashboard/students/${studentId}`;

  if (searchParams.get('edit') === 'true' && pathname === basePath) {
    return null;
  }

  return (
    <nav className="mb-6 -mx-1 overflow-x-auto">
      <div className="flex min-w-max gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map((tab) => {
          const href = tab.segment ? `${basePath}/${tab.segment}` : basePath;
          const isActive =
            tab.segment === ''
              ? pathname === basePath
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={tab.segment || 'profile'}
              href={href}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-muted hover:text-slate-900 hover:bg-white/60'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
