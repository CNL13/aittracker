/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon, Users, Lock, Unlock, KeyRound, LogOut, Plus, Edit2, RefreshCw, Search, Filter, Check,
  AlertTriangle, Copy, History, Laptop, Smartphone, ChevronLeft, ChevronRight, Shield, Loader2, CheckCircle2,
  UserCheck, Briefcase, X, UserCog, CircleDot, LayoutDashboard, Mail, ListTodo, CalendarDays, Bell, FileText,
  Trash2, MessageSquare, Calendar, Flag, Tag, Layers, ChevronDown, Clock, Paperclip, AtSign, Smile, Send,
  MoreHorizontal, MoreVertical, CheckSquare, Eye, ShieldCheck
} from 'lucide-react';
import {
  User, Task, TaskStatus, TaskPriority, TaskBlocker, TaskMember, AuthSession, AuthContextType, Project, ProjectMember
} from '../../types';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/in-app?limit=20');
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id?: string) => {
    try {
      await fetch('/api/notifications/in-app', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(id ? { notificationId: id } : { markAllRead: true }),
      });
      fetchNotifications();
    } catch { /* ignore */ }
  };

  const handleClick = (n: any) => {
    if (!n.readAt) markRead(n.id);
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const timeAgo = (d: string) => {
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (s < 60) return 'vừa xong';
    if (s < 3600) return `${Math.floor(s / 60)}p trước`;
    if (s < 86400) return `${Math.floor(s / 3600)}h trước`;
    return `${Math.floor(s / 86400)} ngày trước`;
  };

  const typeIcon: Record<string, string> = {
    nudge_report: '⚡', nudge_task: '📋', project_approved: '✅',
    project_rejected: '❌', task_assigned: '📌', system: '🔔',
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors relative"
        title="Thông báo">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-indigo-400" /> Thông báo
              </span>
              {unreadCount > 0 && (
                <button onClick={() => markRead()} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-medium">
                  Đọc hết
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-6 w-6 text-slate-700 mx-auto mb-2" />
                  <p className="text-[11px] text-slate-500">Không có thông báo nào</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button key={n.id} onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-800/60 transition-colors border-b border-slate-800/50 ${!n.readAt ? 'bg-indigo-500/5' : ''}`}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] font-semibold truncate ${!n.readAt ? 'text-white' : 'text-slate-400'}`}>{n.title}</p>
                          <span className="text-[9px] text-slate-500 shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                        {n.message && <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                        {n.senderName && <p className="text-[9px] text-slate-600 mt-0.5">Từ: {n.senderName}</p>}
                      </div>
                      {!n.readAt && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

