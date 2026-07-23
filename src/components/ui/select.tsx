import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  completed?: boolean;
}

export function Select({ label, error, options, completed, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700">
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
      <select
        id={selectId}
        className={cn(
          'w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
          error && 'border-red-300',
          completed && !props.disabled && 'border-emerald-200 bg-emerald-50/50',
          props.disabled && 'bg-slate-50 text-slate-600 cursor-not-allowed',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
