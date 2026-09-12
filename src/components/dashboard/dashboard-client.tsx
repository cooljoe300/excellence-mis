'use client';

import { PendingActionsCard } from '@/components/pending-actions/pending-actions-card';
import type { PendingAction } from '@/app/actions/pending-actions';

interface DashboardClientProps {
  pendingActions: PendingAction[];
  children: React.ReactNode;
}

export function DashboardClient({ pendingActions, children }: DashboardClientProps) {
  return (
    <>
      {children}
      {pendingActions.length > 0 && (
        <PendingActionsCard actions={pendingActions} />
      )}
    </>
  );
}
