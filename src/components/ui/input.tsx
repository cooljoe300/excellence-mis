import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  completed?: boolean;
}

export function Input({ label, error, completed, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        {completed && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Already Provided
          </span>
        )}
      </div>
      <input
        id={inputId}
        className={cn(
          'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          error && 'border-red-300 focus:border-red-500 focus:ring-red-500/20',
          completed && !props.readOnly && 'border-emerald-200 bg-emerald-50/50',
          props.readOnly && 'bg-slate-50 text-slate-600 cursor-not-allowed',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
