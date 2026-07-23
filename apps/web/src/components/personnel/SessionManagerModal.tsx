/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
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

export default function SessionManagerModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/sessions?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    if (!window.confirm('Bạn muốn thu hồi phiên làm việc này? Người dùng sẽ bị đăng xuất khỏi thiết bị đó.')) return;
    try {
      const res = await fetch('/api/users/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, sessionId }),
      });
      if (res.ok) {
        fetchSessions();
      } else {
        alert('Không thể thu hồi phiên.');
      }
    } catch {
      alert('Lỗi kết nối.');
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('Bạn muốn thu hồi TOÀN BỘ phiên làm việc của thành viên này?')) return;
    try {
      const res = await fetch('/api/users/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, revokeAll: true }),
      });
      if (res.ok) {
        fetchSessions();
      } else {
        alert('Không thể thu hồi phiên.');
      }
    } catch {
      alert('Lỗi kết nối.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Quản lý phiên làm việc</h3>
              <p className="text-[10px] text-slate-400">Các thiết bị đang đăng nhập của {user.fullName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sessions.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={handleRevokeAll}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 transition-colors"
            >
              Đăng xuất tất cả thiết bị
            </button>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin mx-auto mb-2" />
              <span>Đang tải thông tin phiên làm việc...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              Thành viên này hiện tại không có phiên làm việc nào hoạt động.
            </div>
          ) : (
            sessions.map((session) => {
              const isRevoked = !!session.revokedAt;
              const isExpired = new Date(session.expiresAt) <= new Date();
              const isActive = !isRevoked && !isExpired;

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${isActive
                    ? 'bg-slate-900/30 border-slate-800 hover:border-slate-700/60'
                    : 'bg-slate-950/20 border-slate-900 opacity-60'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'bg-slate-900 text-slate-600'
                      }`}>
                      {session.userAgent?.toLowerCase().includes('mobile') ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Laptop className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200 truncate max-w-sm">
                        {session.userAgent || 'Thiết bị không xác định'}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                        <span className="font-mono">IP: {session.ipHash ? session.ipHash.substring(0, 12) + '...' : 'Mocked'}</span>
                        <span></span>
                        <span>Hoạt động: {new Date(session.lastSeenAt).toLocaleString('vi-VN')}</span>
                        <span></span>
                        <span className={isActive ? 'text-indigo-400/80' : 'text-slate-600'}>
                          {isActive ? `Hết hạn: ${new Date(session.expiresAt).toLocaleDateString('vi-VN')}` : isRevoked ? 'Đã thu hồi' : 'Đã hết hạn'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => handleRevoke(session.id)}
                      className="px-3 py-1.5 rounded-lg border border-red-500/20 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Đăng xuất
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-900">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
}

