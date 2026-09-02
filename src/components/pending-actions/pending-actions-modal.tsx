'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import type { PendingAction } from '@/app/actions/pending-actions';
import {
  CreditCard,
  MessageCircle,
  UserMinus,
  AlertCircle,
  User,
  ClipboardList,
  Clock,
  Users,
  X,
  CheckCircle2,
} from 'lucide-react';

interface PendingActionsModalProps {
  actions: PendingAction[];
  isOpen: boolean;
  onClose: () => void;
}

const iconMap = {
  CreditCard,
  MessageCircle,
  UserMinus,
  AlertCircle,
  User,
  ClipboardList,
  Clock,
  Users,
};

const priorityConfig = {
  urgent: { color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  high: { color: 'bg-orange-500', textColor: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  normal: { color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  info: { color: 'bg-slate-500', textColor: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
};

export function PendingActionsModal({ actions, isOpen, onClose }: PendingActionsModalProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const totalCount = actions.reduce((sum, action) => sum + action.count, 0);

  const handleReview = (action: PendingAction) => {
    onClose();
    router.push(action.route);
  };

  const handleDismiss = () => {
    setDismissed(true);
    onClose();
    // Store dismissal in session storage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pendingActionsDismissed', new Date().toISOString());
    }
  };

  const handleViewAll = () => {
    onClose();
    // Navigate to the first action's route or a dedicated action center page
    if (actions.length > 0) {
      router.push(actions[0].route);
    }
  };

  useEffect(() => {
    // Check if modal was recently dismissed
    if (typeof window !== 'undefined') {
      const dismissedAt = sessionStorage.getItem('pendingActionsDismissed');
      if (dismissedAt) {
        const dismissedTime = new Date(dismissedAt);
        const now = new Date();
        const hoursSinceDismiss = (now.getTime() - dismissedTime.getTime()) / (1000 * 60 * 60);
        
        // If dismissed less than 4 hours ago, don't show
        if (hoursSinceDismiss < 4) {
          setDismissed(true);
          onClose();
        }
      }
    }
  }, [onClose]);

  if (dismissed || !isOpen || actions.length === 0) {
    return null;
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Pending Actions" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Pending Actions</h2>
          <p className="text-slate-600 mt-2">
            You have {totalCount} action{totalCount !== 1 ? 's' : ''} that require your attention.
          </p>
        </div>

        {/* Actions List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {actions.map((action) => {
            const Icon = iconMap[action.icon as keyof typeof iconMap] || AlertCircle;
            const priority = priorityConfig[action.priority];

            return (
              <div
                key={action.id}
                className={`rounded-lg border ${priority.borderColor} ${priority.bgColor} p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-2 ${priority.bgColor}`}>
                    <Icon className={`h-5 w-5 ${priority.textColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{action.title}</h3>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priority.bgColor} ${priority.textColor}`}>
                        {action.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{action.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-2xl font-bold ${priority.textColor}`}>
                        {action.count}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleReview(action)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={handleDismiss} className="flex-1">
            Dismiss
          </Button>
          <Button onClick={handleViewAll} className="flex-1">
            View All Actions
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function PendingActionsEmptyState() {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">All caught up!</h3>
      <p className="text-slate-600">
        There are no pending actions requiring your attention.
      </p>
    </div>
  );
}
