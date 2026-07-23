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
import CreateProjectModal from './CreateProjectModal';

export default function ProjectsView({ auth }: { auth: AuthContextType }) {

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 6;

  const [createModal, setCreateModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [approvingProjectId, setApprovingProjectId] = useState('');
  const [projectActionError, setProjectActionError] = useState('');
  const [rejectModal, setRejectModal] = useState<Project | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingProjectId, setRejectingProjectId] = useState('');
  const [deleteModal, setDeleteModal] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState('');

  const navigate = useNavigate();
  const isAdmin = auth.user?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users/list?limit=100&status=active');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleApproveProject = async (event: React.MouseEvent, project: Project) => {
    event.stopPropagation();
    if (!isAdmin || approvingProjectId) return;
    setApprovingProjectId(project.id);
    setProjectActionError('');
    try {
      const res = await fetch('/api/projects/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (res.ok) { await fetchProjects(); }
      else { setProjectActionError(data.error || 'Không thể duyệt dự án.'); }
    } catch { setProjectActionError('Không thể kết nối đến máy chủ.'); }
    finally { setApprovingProjectId(''); }
  };

  const handleRejectProject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setRejectingProjectId(rejectModal.id);
    setProjectActionError('');
    try {
      const res = await fetch('/api/projects/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: rejectModal.id, reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) { await fetchProjects(); setRejectModal(null); setRejectReason(''); }
      else { setProjectActionError(data.error || 'Không thể từ chối dự án.'); }
    } catch { setProjectActionError('Không thể kết nối đến máy chủ.'); }
    finally { setRejectingProjectId(''); }
  };

  const handleDeleteProject = async () => {
    if (!deleteModal) return;
    setDeletingProjectId(deleteModal.id);
    setProjectActionError('');
    try {
      const res = await fetch('/api/projects/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: deleteModal.id }),
      });
      const data = await res.json();
      if (res.ok) { await fetchProjects(); setDeleteModal(null); }
      else { setProjectActionError(data.error || 'Không thể xóa dự án.'); }
    } catch { setProjectActionError('Không thể kết nối đến máy chủ.'); }
    finally { setDeletingProjectId(''); }
  };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search: search.trim(),
        status,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/projects/list?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [search, status, page]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const getManagerName = (managerId?: string | null) => {
    if (!managerId) return 'Không có';
    if (managerId === auth.user?.id) return `${auth.user?.fullName} (Bn)`;
    const found = users.find((u) => u.id === managerId);
    return found ? found.fullName : `Thành viên (ID: ${managerId.substring(0, 8)})`;
  };


  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Dự án nghiên cứu</h2>
          <p className="text-xs text-slate-400">Danh sách các đề tài và dự án nghiên cứu đang triển khai</p>
        </div>
        <button
          onClick={() => setCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          {isAdmin ? 'Tạo dự án mới' : 'Đề xuất dự án'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-900/30 border border-slate-800 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mô tả dự án..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="planning">⏳ Chờ duyệt</option>
            <option value="active">✅ Đang chạy</option>
            <option value="paused">⏸ Tạm dừng</option>
            <option value="completed">🏁 Hoàn thành</option>
            <option value="rejected">❌ Từ chối</option>
            <option value="archived">🗄️ Lưu trữ</option>
          </select>
        </div>
      </div>

      {projectActionError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{projectActionError}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-500">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium">Đang tải danh sách dự án...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-24 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
          <Briefcase className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Không tìm thấy dự án nào khớp với bộ lọc.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group cursor-pointer p-5 bg-slate-900/35 border border-slate-800/80 rounded-2xl hover:border-slate-700/80 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/[0.02] flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="font-bold text-white text-sm leading-snug group-hover:text-indigo-400 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${project.status === 'planning' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
                        project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          project.status === 'paused' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                            project.status === 'completed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                              project.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        {project.status === 'planning' ? '⏳ Chờ duyệt' :
                          project.status === 'active' ? '✅ Đang chạy' :
                            project.status === 'paused' ? '⏸ Tạm dừng' :
                              project.status === 'completed' ? '🏁 Xong' :
                                project.status === 'rejected' ? '❌ Từ chối' :
                                  '🗄️ Lưu trữ'}
                      </span>
                      {isAdmin && project.status === 'planning' && (
                        <>
                          <button
                            type="button"
                            onClick={(event) => handleApproveProject(event, project)}
                            disabled={approvingProjectId === project.id}
                            title="Duyệt dự án"
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 flex items-center gap-1"
                          >
                            {approvingProjectId === project.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Duyệt
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRejectModal(project); setRejectReason(''); }}
                            title="Từ chối dự án"
                            className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-semibold text-red-300 hover:bg-red-500/20 flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Từ chối
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDeleteModal(project); }}
                          title="Xóa dự án"
                          className="p-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 h-8 leading-relaxed">
                    {project.description || 'Không có mô tả dự án.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-900/60 space-y-2.5 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>Thi gian:</span>
                    <span className="font-semibold text-slate-300">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString('vi-VN') : '-'}
                      {' - '}
                      {project.dueDate ? new Date(project.dueDate).toLocaleDateString('vi-VN') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quản lý:</span>
                    <span className="font-semibold text-slate-300 truncate max-w-[150px]">
                      {getManagerName(project.managerId)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center pt-6 border-t border-slate-900">
              <span className="text-xs text-slate-500">
                Hiển thị {projects.length} / {total} dự án
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs font-semibold text-slate-300">
                  Trang {page} / {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-1">Từ chối dự án</h3>
            <p className="text-xs text-slate-400 mb-4">Dự án: <span className="text-white font-medium">{rejectModal.name}</span></p>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Lý do từ chối *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối dự án..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-red-500/60 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 rounded-xl border border-slate-800 text-xs text-slate-400 hover:text-white">Hủy</button>
              <button
                onClick={handleRejectProject}
                disabled={rejectingProjectId === rejectModal.id || !rejectReason.trim()}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectingProjectId === rejectModal.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Từ chối dự án
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDeleteModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-white mb-1">Xóa dự án</h3>
            <p className="text-xs text-slate-400 mb-4">Bạn có chắc chắn muốn xóa dự án <strong className="text-red-400">"{deleteModal.name}"</strong>? Hành động này sẽ xóa vĩnh viễn dự án cùng toàn bộ công việc và thành viên liên quan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700">Hủy</button>
              <button onClick={handleDeleteProject} disabled={!!deletingProjectId}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs text-white font-semibold disabled:opacity-50 flex items-center gap-1.5">
                {deletingProjectId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {createModal && (
        <CreateProjectModal
          users={users}
          isAdmin={isAdmin}
          onClose={() => setCreateModal(false)}
          onSuccess={() => {
            setCreateModal(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

