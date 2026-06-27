import { cn, formatCurrency } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'group rounded-xl border border-border bg-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          {trend && <p className="mt-2 text-xs font-medium text-emerald-600">{trend}</p>}
        </div>
        <div className="rounded-xl bg-primary-light p-3 transition-colors group-hover:bg-blue-100 shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export function StatCardCurrency({
  title,
  amount,
  icon: Icon,
}: {
  title: string;
  amount: number;
  icon: LucideIcon;
}) {
  return (
    <StatCard title={title} value={formatCurrency(amount)} icon={Icon} />
  );
}
