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

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}



export default function CreateProjectModal({ users, isAdmin, onClose, onSuccess }: { users: User[]; isAdmin: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => getTodayInputValue());
  const [dueDate, setDueDate] = useState('');
  const [managerId, setManagerId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [highlightedMemberIndex, setHighlightedMemberIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedMembers = users.filter((user) => memberIds.includes(user.id));
  const availableMembers = users.filter((user) => user.id !== managerId && !memberIds.includes(user.id));
  const normalizedMemberSearch = memberSearch.trim().toLowerCase();
  const filteredMembers = normalizedMemberSearch
    ? availableMembers.filter((user) => (
      user.fullName.toLowerCase().includes(normalizedMemberSearch) ||
      user.username.toLowerCase().includes(normalizedMemberSearch) ||
      (user.email || '').toLowerCase().includes(normalizedMemberSearch)
    ))
    : availableMembers;

  useEffect(() => {
    setHighlightedMemberIndex(0);
  }, [memberSearch, managerId, memberIds.length]);

  const handleManagerChange = (nextManagerId: string) => {
    setManagerId(nextManagerId);
    setMemberIds((current) => current.filter((id) => id !== nextManagerId));
    setMemberSearch('');
  };

  const handleAddMember = (userId?: string) => {
    const nextUserId = userId || filteredMembers[highlightedMemberIndex]?.id;
    if (!nextUserId) return;
    setMemberIds((current) => current.includes(nextUserId) ? current : [...current, nextUserId]);
    setMemberSearch('');
    setMemberDropdownOpen(true);
    setHighlightedMemberIndex(0);
  };

  const handleMemberKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddMember();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMemberDropdownOpen(true);
      setHighlightedMemberIndex((current) => Math.min(current + 1, Math.max(filteredMembers.length - 1, 0)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedMemberIndex((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === 'Escape') {
      setMemberDropdownOpen(false);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setMemberIds((current) => current.filter((id) => id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên dự án không được bỏ trống.');
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setError('Ngày hoàn thành không thể trước ngày bắt đầu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          managerId: managerId || undefined,
          memberIds,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Đã xảy ra lỗi khi tạo dự án.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">{isAdmin ? 'Tạo dự án mới' : 'Đề xuất dự án mới'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Tên dự án *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên dự án (tối đa 200 ký tự)..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mô tả dự án</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả chi tiết dự án..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Ngày bắt đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Ngày hoàn thành</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Người quản lý dự án (Manager)</label>
            <select
              value={managerId}
              onChange={(e) => handleManagerChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
            >
              <option value="">-- Chọn thành viên quản lý --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} (@{u.username})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Thành viên dự án</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setMemberDropdownOpen(true);
                }}
                onFocus={() => setMemberDropdownOpen(true)}
                onBlur={() => window.setTimeout(() => setMemberDropdownOpen(false), 120)}
                onKeyDown={handleMemberKeyDown}
                placeholder="Gõ tên, email hoặc @username..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
              />
              {memberDropdownOpen && (
                <div className="absolute z-[60] mt-2 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/40 py-1">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((u, index) => (
                      <button
                        key={u.id}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleAddMember(u.id);
                        }}
                        onMouseEnter={() => setHighlightedMemberIndex(index)}
                        className={`w-full px-3 py-2 text-left text-xs transition-colors ${index === highlightedMemberIndex
                          ? 'bg-indigo-500/15 text-white'
                          : 'text-slate-300 hover:bg-slate-900'
                          }`}
                      >
                        <span className="block font-semibold">{u.fullName}</span>
                        <span className="text-[11px] text-slate-500">@{u.username}{u.email ? ` · ${u.email}` : ''}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-slate-500">Không tìm thấy thành viên phù hợp.</div>
                  )}
                </div>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-100"
                  >
                    <span className="font-semibold">{member.fullName}</span>
                    <span className="text-indigo-300/70">@{member.username}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      title="Xóa thành viên"
                      className="p-0.5 rounded-md hover:bg-indigo-500/20 text-indigo-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55"
            >
              {loading ? 'Đang gửi...' : isAdmin ? 'Tạo dự án' : 'Gửi đề xuất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



