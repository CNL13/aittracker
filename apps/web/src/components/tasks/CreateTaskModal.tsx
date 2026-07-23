/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
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

export default function CreateTaskModal({
  projectId,
  members,
  onClose,
  onSuccess,
}: {
  projectId: string;
  members: ProjectMember[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [ownerId, setOwnerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeMembers = members.filter((m) => !(m as any).removed_at);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Tiêu đề công việc không được bỏ trống.');
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setError('Hạn hoàn thành không thể trước ngày bắt đầu.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          ownerId: ownerId || undefined,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          collaborators: selectedCollaborators,
          reviewers: selectedReviewers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Đã xảy ra lỗi khi tạo công việc.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    }
    setLoading(false);
  };

  const handleCollabChange = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedCollaborators([...selectedCollaborators, userId]);
      setSelectedReviewers(selectedReviewers.filter((id) => id !== userId));
    } else {
      setSelectedCollaborators(selectedCollaborators.filter((id) => id !== userId));
    }
  };

  const handleReviewerChange = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviewers([...selectedReviewers, userId]);
      setSelectedCollaborators(selectedCollaborators.filter((id) => id !== userId));
    } else {
      setSelectedReviewers(selectedReviewers.filter((id) => id !== userId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto py-12">
      <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Briefcase className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Thêm công việc mới</h3>
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
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Tiêu đề công việc *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề nhiệm vụ..."
              required
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mô tả công việc</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả công việc..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Trạng thái *</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="todo">Cần làm (Todo)</option>
                <option value="in_progress">Đang làm (In Progress)</option>
                <option value="waiting">Đang chờ (Waiting)</option>
                <option value="done">Hoàn thành (Done)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Độ ưu tiên *</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                required
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              >
                <option value="low">Thấp (Low)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="high">Cao (High)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Ngày bắt đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Hạn hoàn thành</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Người phụ trách (Owner)</label>
            <select
              value={ownerId}
              onChange={(e) => {
                const newOwner = e.target.value;
                setOwnerId(newOwner);
                setSelectedCollaborators(selectedCollaborators.filter((id) => id !== newOwner));
                setSelectedReviewers(selectedReviewers.filter((id) => id !== newOwner));
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="">-- Để trống (Task mở chờ người nhận) --</option>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.userId}>
                  {m.fullName} (@{m.username})
                </option>
              ))}
            </select>
          </div>

          {ownerId && activeMembers.length > 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase">Phân công thành viên khác</label>
              <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-950/40 divide-y divide-slate-900/60">
                {activeMembers
                  .filter((m) => m.userId !== ownerId)
                  .map((m) => {
                    const isCollab = selectedCollaborators.includes(m.userId);
                    const isReviewer = selectedReviewers.includes(m.userId);

                    return (
                      <div key={m.id} className="flex justify-between items-center py-2 text-xs">
                        <span className="text-slate-300 font-medium truncate max-w-[180px]">{m.fullName}</span>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isCollab}
                              onChange={(e) => handleCollabChange(m.userId, e.target.checked)}
                              className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Cộng tác</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isReviewer}
                              onChange={(e) => handleReviewerChange(m.userId, e.target.checked)}
                              className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Duy!t</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Hy b
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55"
            >
              {loading ? 'Đang tạo...' : 'Tạo công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

