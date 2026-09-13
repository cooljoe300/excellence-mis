'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle2, AlertCircle, Info, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { getUserNotifications, getUnreadNotificationCount, getPendingApprovalNotificationCount, syncPendingApprovalNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications';
import type { UserNotification } from '@/app/actions/notifications';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const typeConfig = {
  info: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  success: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  error: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  system: { icon: Info, color: 'text-slate-600', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' },
};

export function NotificationDropdown() {
  const [count, setCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadNotifications = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Sync pending approval notifications first
      await syncPendingApprovalNotifications();
      
      const [notificationsData, unreadCount] = await Promise.all([
        getUserNotifications(50),
        getUnreadNotificationCount(),
      ]);
      setNotifications(notificationsData);
      setCount(unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCount = async () => {
    try {
      // Sync pending approval notifications on count refresh
      await syncPendingApprovalNotifications();
      
      const unreadCount = await getUnreadNotificationCount();
      setCount(unreadCount);
    } catch (error) {
      console.error('Failed to refresh notification count:', error);
    }
  };

  useEffect(() => {
    refreshCount();
    // Refresh count every 2 minutes
    const interval = setInterval(refreshCount, 120000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.read) {
      setMarkingRead(prev => new Set(prev).add(notification.id));
      await markNotificationAsRead(notification.id);
      setMarkingRead(prev => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notification.id ? { ...n, read: true, read_at: new Date().toISOString() } : n)
      );
      setCount(prev => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
      setCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
              {notifications.some(n => !n.read) && (
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
                <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm text-slate-600">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type] || typeConfig.info;
                  const Icon = config.icon;
                  const isMarking = markingRead.has(notification.id);

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      disabled={isMarking}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                        !notification.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`rounded-lg p-2 ${config.bgColor} shrink-0`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-900 text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mb-1">{notification.message}</p>
                          <p className="text-xs text-slate-400">{formatRelativeTime(notification.created_at)}</p>
                        </div>
                        {isMarking && (
                          <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
