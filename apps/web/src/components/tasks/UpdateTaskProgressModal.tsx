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

export default function UpdateTaskProgressModal({
  currentUser,
  task,
  onClose,
  onSuccess,
}: {
  currentUser: User;
  task: Task;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isManagerOrAdmin = currentUser.role === 'admin' || task.memberRole === 'manager';
  const hasPending = task.pendingPercent !== undefined && task.pendingPercent !== null;
  const initialPercent = hasPending ? Number(task.pendingPercent) : Number(task.percentComplete || 0);
  const isApprovedComplete = !hasPending && (Number(task.percentComplete || 0) >= 100 || task.status === 'done');

  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [percentComplete, setPercentComplete] = useState<number>(initialPercent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressDescription, setProgressDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const [blockers, setBlockers] = useState<TaskBlocker[]>([]);
  const [blockersLoading, setBlockersLoading] = useState(true);

  const [showReportBlocker, setShowReportBlocker] = useState(false);
  const [blockerDesc, setBlockerDesc] = useState('');

  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolveAction, setResolveAction] = useState<'resolve' | 'dismiss'>('resolve');

  const fetchBlockers = useCallback(async () => {
    try {
      setBlockersLoading(true);
      const res = await fetch(`/api/blockers/list?taskId=${task.id}`);
      if (res.ok) {
        const data = await res.json();
        setBlockers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBlockersLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchBlockers();
  }, [fetchBlockers]);

  // Submit flow for Member vs Review flow for Admin/PM
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isManagerOrAdmin) {
        // PM/Admin Review or Direct Update Flow
        if (task.pendingProgressUpdateId) {
          const isAdjusted = percentComplete !== task.pendingPercent;
          if (isAdjusted && !reviewNote.trim()) {
            setError('Vui lòng nhập lý do điều chỉnh tiến độ.');
            setLoading(false);
            return;
          }
          const res = await fetch('/api/progress/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              progressUpdateId: task.pendingProgressUpdateId,
              action: isAdjusted ? 'adjusted' : 'approved',
              finalPercent: percentComplete,
              reviewNote: reviewNote || undefined,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            onSuccess();
          } else {
            setError(data.error || 'Lỗi khi xử lý duyệt tiến độ.');
          }
        } else {
          // Direct Task Progress Update by Admin/PM
          const newSt = percentComplete === 100 ? 'done' : percentComplete > 0 ? 'in_progress' : 'todo';
          const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              percentComplete,
              status: newSt,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            onSuccess();
          } else {
            setError(data.error || 'Lỗi khi cập nhật tiến độ.');
          }
        }
      } else {
        // Member Submit Proposal Flow
        const res = await fetch('/api/progress/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            proposedPercent: percentComplete,
            description: progressDescription,
            evidenceUrl: evidenceUrl || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          onSuccess();
        } else {
          setError(data.error || 'Xảy ra lỗi khi gửi yêu cầu.');
        }
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    }
    setLoading(false);
  };

  const handleReportBlocker = async () => {
    if (blockerDesc.trim().length < 10) {
      alert('Mô tả phải có ít nhất 10 ký tự');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/blockers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, description: blockerDesc }),
      });
      if (res.ok) {
        setShowReportBlocker(false);
        setBlockerDesc('');
        fetchBlockers();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAction = async () => {
    if (!resolveNote.trim()) {
      alert('Vui lòng nhập ghi chú');
      return;
    }
    try {
      setLoading(true);
      const url = resolveAction === 'resolve' ? '/api/blockers/resolve' : '/api/blockers/dismiss';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockerId: resolvingBlockerId, resolutionNote: resolveNote }),
      });
      if (res.ok) {
        setResolvingBlockerId(null);
        setResolveNote('');
        fetchBlockers();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi');
      }
    } catch (e) {
      alert('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const openBlockers = blockers.filter(b => b.status === 'open');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto">
      <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6 my-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-5 w-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">
              {isManagerOrAdmin ? (hasPending ? '🔄 Điều chỉnh / Duyệt tiến độ' : '✏️ Cập nhật tiến độ trực tiếp') : '📤 Gửi yêu cầu cập nhật tiến độ'}
            </h3>
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

        {/* Blocker Section */}
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/60">
          <h4 className="text-sm font-semibold text-white mb-3">Vướng mắc (Blockers)</h4>
          {blockersLoading ? (
            <div className="text-xs text-slate-400">Đang tải...</div>
          ) : (
            <>
              {openBlockers.length > 0 ? (
                <div className="space-y-3">
                  {openBlockers.map(blocker => {
                    const canResolve = currentUser.role === 'admin' || currentUser.id === blocker.reporter_id || currentUser.id === task.ownerId;
                    const canDismiss = currentUser.role === 'admin';

                    return (
                      <div key={blocker.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-xs font-semibold text-red-400">Vướng mắc bởi {blocker.reporter_full_name}</span>
                            <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{blocker.description}</p>
                          </div>
                        </div>

                        {resolvingBlockerId === blocker.id ? (
                          <div className="space-y-2 mt-2">
                            <input
                              type="text"
                              value={resolveNote}
                              onChange={e => setResolveNote(e.target.value)}
                              placeholder="Ghi chú giải quyết / hủy bỏ..."
                              className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white"
                            />
                            <div className="flex gap-2">
                              <button onClick={handleResolveAction} disabled={loading} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg">Xác nhận</button>
                              <button onClick={() => setResolvingBlockerId(null)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg">Hủy</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {canResolve && (
                              <button onClick={() => { setResolvingBlockerId(blocker.id); setResolveAction('resolve'); }} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs rounded-lg font-medium">Giải quyết</button>
                            )}
                            {canDismiss && (
                              <button onClick={() => { setResolvingBlockerId(blocker.id); setResolveAction('dismiss'); }} className="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs rounded-lg font-medium">Hủy bỏ</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400">Không có vướng mắc nào đang mở.</div>
                  {!showReportBlocker ? (
                    <button onClick={() => setShowReportBlocker(true)} className="px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs rounded-lg font-medium border border-red-500/20">Báo cáo vướng mắc (Blocker)</button>
                  ) : (
                    <div className="space-y-2 mt-2">
                      <textarea
                        value={blockerDesc}
                        onChange={e => setBlockerDesc(e.target.value)}
                        placeholder="Mô tả chi tiết vướng mắc (ít nhất 10 ký tự)..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-white min-h-[80px]"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={handleReportBlocker} disabled={loading} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-medium">Gửi báo cáo</button>
                        <button type="button" onClick={() => setShowReportBlocker(false)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg">Hủy</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {isApprovedComplete ? (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
            Task này đã được phê duyệt hoàn thành 100%, nên tiến độ không cần cập nhật thêm.
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
            <span className="block text-[10px] text-slate-500 uppercase font-bold">Nhiệm vụ: {task.title}</span>
            {hasPending && (
              <span className="text-xs font-bold text-amber-400 block">Nhân viên đề xuất: {task.pendingPercent}%</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              {isManagerOrAdmin ? '% THỰC TẾ (DO PM ĐÁNH GIÁ)' : 'Tiến độ (%)'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={percentComplete}
                onChange={(e) => {
                  const newPct = Number(e.target.value);
                  setPercentComplete(newPct);
                }}
                className="flex-1 accent-indigo-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-slate-300 w-8 text-right">{percentComplete}%</span>
            </div>
          </div>

          {isManagerOrAdmin ? (
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">GHI CHÚ PHẢN HỒI</label>
              <textarea
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
                rows={3}
                placeholder="Giải thích lý do điều chỉnh hoặc ghi chú duyệt..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Mô tả công việc đã làm</label>
                <textarea value={progressDescription} onChange={e => setProgressDescription(e.target.value)} rows={3}
                  placeholder="Mô tả cụ thể những gì đã hoàn thành..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">Link minh chứng (không bắt buộc)</label>
                <input value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] text-amber-400">⚠️ PM dự án sẽ duyệt trước khi tiến độ được cập nhật chính thức.</p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55"
            >
              {loading
                ? 'Đang xử lý...'
                : isManagerOrAdmin
                  ? hasPending && percentComplete === task.pendingPercent
                    ? `✅ Duyệt ${percentComplete}%`
                    : `Điều chỉnh → ${percentComplete}%`
                  : '📤 Gửi yêu cầu'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

