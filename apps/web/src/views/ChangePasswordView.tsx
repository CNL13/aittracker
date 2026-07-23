/* eslint-disable */
// @ts-nocheck
import React, { useState } from 'react';
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
} from '../types';

export function PasswordChangeForm({
  auth,
  onSuccess,
  onCancel,
  compact = false,
}: {
  auth: AuthContextType;
  onSuccess?: () => void | Promise<void>;
  onCancel?: () => void;
  compact?: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ tất cả các trường.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await auth.refreshProfile();
        if (onSuccess) {
          window.setTimeout(() => {
            void onSuccess();
          }, 900);
        }
      } else {
        setError(data.error || 'Đã xảy ra lỗi khi đổi mật khẩu.');
      }
    } catch {
      setLoading(false);
      setError('Không thể kết nối tới máy chủ.');
    }
  };

  if (success) {
    return (
      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center flex flex-col items-center gap-3">
        <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        <h3 className="font-semibold text-slate-200 text-sm">Đổi mật khẩu thành công!</h3>
        <p className="text-xs text-slate-400">
          {compact ? 'Mật khẩu mới đã được cập nhật cho tài khoản của bạn.' : 'Đang chuyển hướng về trang phù hợp...'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handlePasswordChange} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-2 items-start text-xs text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mật khẩu hiện tại</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/80 transition-colors"
          placeholder="Nhập mật khẩu hiện tại..."
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mật khẩu mới</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/80 transition-colors"
          placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Xác nhận mật khẩu mới</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500/80 transition-colors"
          placeholder="Nhập lại mật khẩu mới..."
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full mt-4 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Đổi mật khẩu'}
      </button>

      {onCancel && !auth.user?.mustChangePassword && (
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 px-4 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 bg-transparent hover:bg-slate-900 transition-colors"
          disabled={loading}
        >
          Hủy bỏ
        </button>
      )}
    </form>
  );
}



export default function ChangePasswordView({ auth }: { auth: AuthContextType }) {
  const navigate = useNavigate();
  const nextPath = auth.user?.role === 'admin' ? '/admin/users' : '/personnel';

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Yêu cầu đổi mật khẩu</h2>
          {auth.user?.mustChangePassword && (
            <p className="text-xs text-amber-400/90 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 mt-2 font-medium">
              Bạn phải đổi mật khẩu để bắt đầu sử dụng hệ thống
            </p>
          )}
        </div>

        <PasswordChangeForm
          auth={auth}
          onSuccess={() => navigate(nextPath)}
          onCancel={!auth.user?.mustChangePassword ? () => navigate(-1) : undefined}
        />
      </div>
    </div>
  );
}

