'use client';

import { useState, useEffect } from 'react';
import { PendingActionsCard } from '@/components/pending-actions/pending-actions-card';
import { PendingActionsModal } from '@/components/pending-actions/pending-actions-modal';
import type { PendingAction } from '@/app/actions/pending-actions';

interface DashboardClientProps {
  pendingActions: PendingAction[];
  children: React.ReactNode;
}

export function DashboardClient({ pendingActions, children }: DashboardClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [autoShow, setAutoShow] = useState(true);

  useEffect(() => {
    // Auto-show modal on first load if there are pending actions
    if (autoShow && pendingActions.length > 0) {
      // Check if modal was recently dismissed
      const dismissedAt = sessionStorage.getItem('pendingActionsDismissed');
      if (dismissedAt) {
        const dismissedTime = new Date(dismissedAt);
        const now = new Date();
        const hoursSinceDismiss = (now.getTime() - dismissedTime.getTime()) / (1000 * 60 * 60);
        
        // If dismissed less than 4 hours ago, don't auto-show
        if (hoursSinceDismiss < 4) {
          setAutoShow(false);
          return;
        }
      }
      
      // Delay slightly to allow page to render
      const timer = setTimeout(() => {
        setShowModal(true);
        setAutoShow(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [pendingActions, autoShow]);

  const handleViewActions = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {children}
      {pendingActions.length > 0 && (
        <PendingActionsCard actions={pendingActions} onViewActions={handleViewActions} />
      )}
      <PendingActionsModal
        actions={pendingActions}
        isOpen={showModal}
        onClose={handleCloseModal}
      />
    </>
  );
}
