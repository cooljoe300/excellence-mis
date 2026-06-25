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
    <div className={cn('rounded-xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          {trend && <p className="mt-2 text-xs text-emerald-600">{trend}</p>}
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <Icon className="h-5 w-5 text-blue-600" />
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
