'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getPendingActionsCount } from '@/app/actions/pending-actions';

export function PendingActionsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchCount() {
      try {
        const pendingCount = await getPendingActionsCount();
        setCount(pendingCount);
      } catch (error) {
        console.error('Failed to fetch pending actions count:', error);
      }
    }

    fetchCount();
    // Refresh count every 2 minutes
    const interval = setInterval(fetchCount, 120000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) {
    return (
      <button className="relative rounded-lg p-2 hover:bg-slate-100 transition-colors">
        <Bell className="h-5 w-5 text-slate-600" />
      </button>
    );
  }

  return (
    <button className="relative rounded-lg p-2 hover:bg-slate-100 transition-colors">
      <Bell className="h-5 w-5 text-slate-600" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
