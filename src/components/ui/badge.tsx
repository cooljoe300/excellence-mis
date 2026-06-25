import { cn, getStatusColor } from '@/lib/utils';

export function Badge({
  status,
  children,
  className,
}: {
  status?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status ? getStatusColor(status) : 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {children}
    </span>
  );
}
