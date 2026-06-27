import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  error: {
    container: 'border-red-200 bg-red-50 text-red-800',
    icon: XCircle,
    iconColor: 'text-red-600',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertCircle,
    iconColor: 'text-amber-600',
  },
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: Info,
    iconColor: 'text-blue-600',
  },
};

export function Alert({ variant = 'info', children, className }: AlertProps) {
  const v = variants[variant];
  const Icon = v.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        v.container,
        className
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', v.iconColor)} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
