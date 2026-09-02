import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function formatPercent(pct: number | null) {
  if (pct === null) return null;
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toLocaleString('en-KE', { maximumFractionDigits: 1 })}%`;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  changePct,
  changeLabel,
  supporting,
  tone = 'default',
  href,
  invertTrend = false,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  /** Percentage change vs the previous period; null hides the indicator. */
  changePct?: number | null;
  changeLabel?: string;
  supporting?: string;
  tone?: 'default' | 'warning';
  href: string;
  /** When true, an increase is shown as negative (e.g. outstanding fees). */
  invertTrend?: boolean;
}) {
  const hasChange = changePct !== undefined && changePct !== null;
  const good = hasChange ? (invertTrend ? changePct < 0 : changePct > 0) : false;
  const bad = hasChange ? (invertTrend ? changePct > 0 : changePct < 0) : false;
  const TrendIcon = !hasChange || changePct === 0 ? Minus : changePct > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md focus-visible:outline-2',
        tone === 'warning' ? 'border-amber-200/80 hover:border-amber-300' : 'border-border hover:border-slate-300'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{title}</p>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            tone === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-primary-light text-primary'
          )}
          aria-hidden
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="mt-3 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {hasChange && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
              good && 'bg-emerald-50 text-emerald-700',
              bad && 'bg-red-50 text-red-700',
              !good && !bad && 'bg-slate-100 text-slate-600'
            )}
          >
            <TrendIcon className="h-3 w-3" aria-hidden />
            <span className="sr-only">{good ? 'Up' : bad ? 'Down' : 'No change'} </span>
            {formatPercent(changePct)}
          </span>
        )}
        {(changeLabel || supporting) && <span className="text-muted">{changeLabel ?? supporting}</span>}
      </div>
    </Link>
  );
}
