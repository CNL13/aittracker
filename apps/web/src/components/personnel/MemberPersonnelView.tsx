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
import { PasswordChangeForm } from '../../views/ChangePasswordView';

export default function MemberPersonnelView({ auth }: { auth: AuthContextType }) {
  const user = auth.user;
  const statusLabel = user?.status === 'active' ? 'Đang làm' : user?.status === 'locked' ? 'Bị khóa' : 'Vô hiệu hóa';

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: auth.user?.fullName || '',
    email: auth.user?.email || '',
    phone: (auth.user as any)?.phone || '',
    department: (auth.user as any)?.department || '',
    position: (auth.user as any)?.position || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const res = await fetch('/api/users/update-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveSuccess('Cập nhật hồ sơ thành công!');
        setEditing(false);
        // Refresh auth to get updated user data
        if (auth.refreshProfile) {
          await auth.refreshProfile();
        } else {
          window.location.reload();
        }
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        setSaveError(data.error || 'Không thể cập nhật hồ sơ.');
      }
    } catch {
      setSaveError('Lỗi kết nối đến máy chủ.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Nhân sự</h2>
        <p className="text-xs text-slate-400 mt-1">Hồ sơ tài khoản và mật khẩu cá nhân</p>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5" />{saveSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <div className="glass-panel rounded-2xl border border-slate-800 p-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-800 border border-slate-700/70 flex items-center justify-center text-lg font-bold text-slate-200 shrink-0">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Hồ sơ của tôi</div>
                  <h3 className="text-lg font-bold text-white mt-1">{user?.fullName}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">@{user?.username}</p>
                </div>
                {!editing && (
                  <button
                    onClick={() => {
                      setEditForm({
                        fullName: auth.user?.fullName || '',
                        email: auth.user?.email || '',
                        phone: (auth.user as any)?.phone || '',
                        department: (auth.user as any)?.department || '',
                        position: (auth.user as any)?.position || '',
                      });
                      setSaveError('');
                      setEditing(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Edit2 className="h-3 w-3" />
                    Sửa thông tin
                  </button>
                )}
              </div>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4 mt-4">
              {saveError && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3" />{saveError}
                </div>
              )}
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Họ tên</label>
                <input value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
                  <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Số điện thoại</label>
                  <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="0901234567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Khoa/Nhóm</label>
                  <input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Chức vụ</label>
                  <input value={editForm.position} onChange={e => setEditForm({ ...editForm, position: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setEditing(false); setSaveError(''); }} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700">Hủy</button>
                <button onClick={handleSaveProfile} disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Lưu thông tin
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email</span>
                <span className="font-semibold text-slate-200">{user?.email || 'Chưa có email'}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Vai trò</span>
                <span className="font-semibold text-slate-200">{user?.role === 'admin' ? 'Admin/Sếp' : 'Nhân sự'}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Nhóm</span>
                <span className="font-semibold text-slate-200">{user?.department || user?.unit || 'Chưa phân nhóm'}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Loại nhân sự / chức vụ</span>
                <span className="font-semibold text-slate-200">{user?.position || user?.title || 'Chưa có chức vụ'}</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Trạng thái</span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${user?.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : user?.status === 'locked'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${user?.status === 'active' ? 'bg-emerald-400' : user?.status === 'locked' ? 'bg-amber-400' : 'bg-red-400'}`}></span>
                  {statusLabel}
                </span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Lần đăng nhập gần nhất</span>
                <span className="font-semibold text-slate-200">
                  {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-panel rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Đổi mật khẩu của tôi</h3>
              <p className="text-[10px] text-slate-400">Tài khoản: @{user?.username}</p>
            </div>
          </div>
          <PasswordChangeForm auth={auth} compact />
        </div>
      </div>
    </div>
  );
}


