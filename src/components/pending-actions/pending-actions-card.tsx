import { AlertCircle } from 'lucide-react';
import type { PendingAction } from '@/app/actions/pending-actions';

interface PendingActionsCardProps {
  actions: PendingAction[];
  onViewActions?: () => void;
}

export function PendingActionsCard({ actions, onViewActions }: PendingActionsCardProps) {
  const totalCount = actions.reduce((sum, action) => sum + action.count, 0);

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">Pending Actions</p>
          </div>
          <p className="text-3xl font-bold text-amber-900">{totalCount}</p>
          <p className="mt-1 text-sm text-amber-700">
            Action{totalCount !== 1 ? 's' : ''} require attention
          </p>
        </div>
      </div>
    </div>
  );
}
