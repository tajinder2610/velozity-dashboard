import React, { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { NotificationsApi } from '../api/endpoints';
import { useSocket } from '../context/SocketContext';
import { NotificationItem } from '../types';

export function NotificationBell() {
  const { socket } = useSocket();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await NotificationsApi.list();
    setItems(res.data.notifications);
    setUnreadCount(res.data.unreadCount);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    // Unread count updates over the socket, not polling, per the brief.
    const onNew = (n: NotificationItem) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification:new', onNew);
    return () => {
      socket.off('notification:new', onNew);
    };
  }, [socket]);

  const markOne = async (id: string) => {
    await NotificationsApi.markRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAll = async () => {
    await NotificationsApi.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAll} className="text-xs text-blue-600 hover:underline">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">No notifications</p>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markOne(n.id)}
                className={`block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  n.read ? 'text-slate-500' : 'bg-blue-50/60 font-medium text-slate-800'
                }`}
              >
                {n.message}
                <div className="text-xs text-slate-400">
                  {formatDistanceToNowStrict(new Date(n.createdAt), { addSuffix: true })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
