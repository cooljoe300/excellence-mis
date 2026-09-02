'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Loader2 } from 'lucide-react';
import type { AcademicTerm } from '@/lib/types';
import { cn } from '@/lib/utils';

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({
  name,
  terms,
  selectedTermId,
  today,
  hour,
}: {
  name: string;
  terms: AcademicTerm[];
  selectedTermId: string | null;
  today: string;
  hour: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function onTermChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('term', value);
    else params.delete('term');
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {greeting(hour)}, {name}
        </h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s what&apos;s happening at Excellence Online College today.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
          <time dateTime={today}>{today}</time>
        </span>

        {terms.length > 0 && (
          <label className="relative inline-flex items-center">
            <span className="sr-only">Semester</span>
            <select
              value={selectedTermId ?? ''}
              onChange={(e) => onTermChange(e.target.value)}
              disabled={pending}
              className={cn(
                'appearance-none rounded-lg border border-border bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm',
                'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-70'
              )}
            >
              <option value="">All semesters</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_current ? ' (current)' : ''}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 text-slate-400" aria-hidden>
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              )}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
