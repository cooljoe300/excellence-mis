'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  MessageCircle,
  UserMinus,
  User,
  ClipboardList,
  Clock,
  Users
} from 'lucide-react';
import { getPendingActionsCount, getAdminPendingActions } from '@/app/actions/pending-actions';
import type { PendingAction } from '@/app/actions/pending-actions';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, any> = {
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

export function PendingActionsBadge() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const loadActions = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const pendingActions = await getAdminPendingActions();
      setActions(pendingActions);
    } catch (error) {
      console.error('Failed to fetch pending actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      loadActions();
    }
    setIsOpen(!isOpen);
  };

  const handleActionClick = (action: PendingAction) => {
    setIsOpen(false);
    router.push(action.route);
  };

  const handleMarkAllAsRead = () => {
    // For now, this just closes the dropdown
    // In a full implementation, this would update notification read status
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative rounded-lg p-2 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5 text-slate-600" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {actions.length > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 hover:bg-slate-100"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : actions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm text-slate-600">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {actions.map((action) => {
                  const Icon = iconMap[action.icon] || AlertCircle;
                  const priority = priorityConfig[action.priority];

                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${priority.bgColor} shrink-0`}>
                          <Icon className={`h-4 w-4 ${priority.textColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-900 text-sm">{action.title}</h4>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priority.bgColor} ${priority.textColor}`}>
                              {action.priority}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-1">{action.description}</p>
                          <p className={`text-sm font-semibold ${priority.textColor}`}>
                            {action.count} action{action.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {actions.length > 0 && (
            <div className="border-t border-slate-200 px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/dashboard');
                }}
              >
                View all in dashboard
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
