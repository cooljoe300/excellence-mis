'use client';

import { useState, useTransition } from 'react';
import { Users } from 'lucide-react';
import { getStudentTrend, type TrendPoint, type TrendRange } from '@/app/actions/dashboard';
import { LineChart } from '@/components/dashboard/charts';
import { Section, SectionEmpty } from '@/components/dashboard/section';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const RANGES: { value: TrendRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' },
];

const SERIES = [
  { key: 'newStudents', label: 'New students', color: '#003380' },
  { key: 'active', label: 'Active', color: '#059669' },
  { key: 'inactive', label: 'Inactive / withdrawn', color: '#d97706' },
];

export function StudentTrend({ initialRange, initialData }: { initialRange: TrendRange; initialData: TrendPoint[] }) {
  const [range, setRange] = useState<TrendRange>(initialRange);
  const [cache, setCache] = useState<Partial<Record<TrendRange, TrendPoint[]>>>({ [initialRange]: initialData });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const data = cache[range];
  const total = data?.reduce((s, p) => s + p.newStudents, 0) ?? 0;
  const hasInactive = data?.some((p) => p.inactive > 0) ?? false;
  const series = hasInactive ? SERIES : SERIES.slice(0, 2);

  function select(next: TrendRange) {
    setRange(next);
    setError(null);
    if (cache[next]) return;
    startTransition(async () => {
      try {
        const points = await getStudentTrend(next);
        setCache((c) => ({ ...c, [next]: points }));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load this information');
      }
    });
  }

  return (
    <Section
      title="Student Overview"
      description={data ? `${total.toLocaleString('en-KE')} new registrations in the selected period` : undefined}
      action={
        <div role="tablist" aria-label="Trend range" className="inline-flex rounded-lg border border-border bg-slate-50 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              role="tab"
              type="button"
              aria-selected={range === r.value}
              onClick={() => select(r.value)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                range === r.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {error ? (
        <div role="alert" className="flex min-h-[200px] flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-slate-900">Unable to load this information</p>
          <button type="button" onClick={() => select(range)} className="mt-2 text-xs font-medium text-primary hover:underline">
            Retry
          </button>
        </div>
      ) : !data || pending ? (
        <Skeleton className="h-[260px] w-full" aria-busy="true" />
      ) : total === 0 ? (
        <SectionEmpty
          icon={Users}
          title="No new registrations"
          description="No students were registered in the selected period. Try a wider range."
        />
      ) : (
        <LineChart data={data} series={series} ariaLabel={`Student registrations over the last ${RANGES.find((r) => r.value === range)?.label}`} />
      )}
    </Section>
  );
}
