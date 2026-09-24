import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  Briefcase, 
  Handshake, 
  Lightbulb, 
  ShieldCheck, 
  Sparkles,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

import { api } from '../../services/api';

interface DbNotification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  read?: boolean;
  created_at?: string;
}

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const iconForType = (type: string) => {
  switch ((type || 'info').toLowerCase()) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    case 'alert':
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case 'job':
    case 'application':
      return <Briefcase className="w-4 h-4 text-blue-600" />;
    case 'mou':
      return <Handshake className="w-4 h-4 text-emerald-600" />;
    case 'capstone':
    case 'problem':
      return <Lightbulb className="w-4 h-4 text-amber-500" />;
    case 'gov':
    case 'compliance':
      return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
    default:
      return <Info className="w-4 h-4 text-slate-500" />;
  }
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return 'Recently';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getNotifications();
      // The backend scopes to the authenticated user (user_id/email).
      // (students.id ≠ users.id, so no client-side re-filtering here.)
      setNotifications(data as DbNotification[]);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on open, and lightly poll while the drawer is open
  useEffect(() => {
    if (!isOpen) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [isOpen, loadNotifications]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-slideLeft">
        
        {/* Header */}
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Real-Time Ecosystem Feed</h3>
                <p className="text-[11px] text-slate-500">Live updates from Colleges, Industry & Government</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={loadNotifications}
                className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Refresh feed"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feed List */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-160px)]">
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mb-3" />
                <p className="text-xs font-semibold">Fetching live ecosystem events…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-700">You're all caught up</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  New application updates, MoU signings, and capstone challenges from the ecosystem will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                    item.read === false
                      ? 'border-blue-200/80 bg-blue-50/40 hover:bg-blue-50/70'
                      : 'border-slate-200/80 bg-slate-50/50 hover:bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-white shadow-xs border border-slate-200/60">
                        {iconForType(item.type)}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{timeAgo(item.created_at)}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Smart Automation Real-Time Stream</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            PostgreSQL Event Broker • {notifications.length} recent event{notifications.length === 1 ? '' : 's'}
          </p>
        </div>

      </div>
    </div>
  );
};
