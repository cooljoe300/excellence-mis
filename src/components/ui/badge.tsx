import { cn, getStatusColor } from '@/lib/utils';

export function Badge({
  status,
  variant = 'default',
  children,
  className,
}: {
  status?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children: React.ReactNode;
  className?: string;
}) {
  const variantStyles = {
    default: 'bg-blue-100 text-blue-700',
    secondary: 'bg-slate-100 text-slate-600',
    destructive: 'bg-red-100 text-red-700',
    outline: 'border border-slate-200 text-slate-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status ? getStatusColor(status) : variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
