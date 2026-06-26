'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const tabs = [
  { label: 'Student Personal Profile', segment: '' },
  { label: 'Enrolment Profiles', segment: 'enrollment' },
  { label: 'Student ID', segment: 'id-card' },
  { label: 'Course Registration', segment: 'registration' },
  { label: 'Fee Statement', segment: 'fees' },
  { label: 'Student Log', segment: 'log' },
] as const;

export function StudentDetailNav({ studentId }: { studentId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/dashboard/students/${studentId}`;

  if (searchParams.get('edit') === 'true' && pathname === basePath) {
    return null;
  }

  return (
    <nav className="mb-6 overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-0">
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
                'whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                isActive
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
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
