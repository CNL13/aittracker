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

export default function EditTaskModal({
  task,
  members,
  onClose,
  onSuccess,
}: {
  task: Task;
  members: ProjectMember[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [ownerId, setOwnerId] = useState(task.ownerId);
  const [percentComplete, setPercentComplete] = useState(task.percentComplete);
  const [startDate, setStartDate] = useState(task.startDate || '');
  const [dueDate, setDueDate] = useState(task.dueDate || '');
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeMembers = members.filter((m) => !(m as any).removed_at);

  useEffect(() => {
    const fetchTaskDetail = async () => {
      try {
        const res = await fetch(`/api/tasks/detail?taskId=${task.id}`);
        if (res.ok) {
          const data = await res.json();
          const taskMembers: TaskMember[] = data.members || [];
          setSelectedCollaborators(
            taskMembers.filter((m) => m.assignmentRole === 'collaborator' && !(m as any).removed_at).map((m) => m.userId)
          );
          setSelectedReviewers(
            taskMembers.filter((m) => m.assignmentRole === 'reviewer' && !(m as any).removed_at).map((m) => m.userId)
          );
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTaskDetail();
  }, [task.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Tiêu đề công việc không được bỏ trống.');
      return;
    }
    if (!ownerId) {
      setError('Vui lòng chọn người phụ trách.');
      return;
    }
    if (startDate && dueDate && dueDate < startDate) {
      setError('Hạn hoàn thành không thể trước ngày bắt đầu.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          ownerId,
          percentComplete,
          startDate: startDate || undefined,
          dueDate: dueDate || undefined,
          collaborators: selectedCollaborators,
          reviewers: selectedReviewers,
          version: task.version,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Đã xảy ra lỗi khi cập nhật công việc.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    }
    setSubmitting(false);
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
            <Edit2 className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Chỉnh sửa công việc</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500">
            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto mb-2" />
            <p className="text-xs">Đang tải chi tiết công việc...</p>
          </div>
        ) : (
          <>
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
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Trạng thái *</label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const newStatus = e.target.value as TaskStatus;
                      setStatus(newStatus);
                      if (newStatus === 'done') {
                        setPercentComplete(100);
                      }
                    }}
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
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
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
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Tiến độ hoàn thành (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentComplete}
                    onChange={(e) => {
                      const newPct = Number(e.target.value);
                      setPercentComplete(newPct);
                      if (newPct === 100) {
                        setStatus('done');
                      } else if (status === 'done' && newPct < 100) {
                        setStatus('in_progress');
                      }
                    }}
                    className="flex-1 accent-indigo-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-slate-300 w-8 text-right">{percentComplete}%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Người phụ trách (Owner) *</label>
                <select
                  value={ownerId}
                  onChange={(e) => {
                    const newOwner = e.target.value;
                    setOwnerId(newOwner);
                    setSelectedCollaborators(selectedCollaborators.filter((id) => id !== newOwner));
                    setSelectedReviewers(selectedReviewers.filter((id) => id !== newOwner));
                  }}
                  required
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
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
                  <div className="max-h-32 overflow-y-auto border border-slate-800 rounded-xl p-3 bg-slate-950/40 divide-y divide-slate-900/60">
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
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

