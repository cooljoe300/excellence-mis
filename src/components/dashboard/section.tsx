import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { LucideIcon } from 'lucide-react';

export function Section({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn('flex flex-col rounded-xl border border-border bg-white shadow-sm', className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      <div className={cn('flex-1 p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function SectionEmpty({
  icon: Icon,
  title,
  description,
  tone = 'neutral',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'neutral' | 'positive';
}) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center px-4 py-8 text-center">
      <div
        className={cn(
          'mb-3 flex h-11 w-11 items-center justify-center rounded-full',
          tone === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-muted">{description}</p>
    </div>
  );
}

export function SectionSkeleton({
  title,
  height = 260,
  className,
}: {
  title: string;
  height?: number;
  className?: string;
}) {
  return (
    <section
      aria-label={`${title} loading`}
      aria-busy="true"
      className={cn('rounded-xl border border-border bg-white shadow-sm', className)}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="p-5">
        <Skeleton className="w-full" style={{ height }} />
      </div>
    </section>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm" aria-busy="true">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}
