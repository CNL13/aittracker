/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import TaskBoardView from '../tasks/TaskBoardView';
import EditProjectModal from './EditProjectModal';
import CreateTaskModal from '../tasks/CreateTaskModal';
import UpdateTaskProgressModal from '../tasks/UpdateTaskProgressModal';
import { useAppRefresh } from '../../hooks/useAppRefresh';

export default function ProjectDetailView({ auth }: { auth: AuthContextType }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAdmin = auth.user?.role === 'admin';

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [taskMetrics, setTaskMetrics] = useState({ totalTasks: 0, doneTasks: 0, overdueTasks: 0 });
  const [loading, setLoading] = useState(true);
  // isManager: derived after project loads — current user is the PM of this project
  const isManager = !isAdmin && !!project && project.managerId === auth.user?.id;
  const canManage = isAdmin || isManager;

  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'progress' | 'chat'>('members');
  const [editModal, setEditModal] = useState(false);

  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState<'manager' | 'member' | 'viewer'>('member');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Task-related states
  const [tasks, setTasks] = useState<Task[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setTasksTotal] = useState(0);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState('');
  const [taskPage, setTaskPage] = useState(1);
  const taskLimit = 10;

  const [createTaskModal, setCreateTaskModal] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [reportingBlockerTask, setReportingBlockerTask] = useState<Task | null>(null);
  const [blockerDescription, setBlockerDescription] = useState('');
  const [reportingLoading, setReportingLoading] = useState(false);
  const [resolvingBlockersTask, setResolvingBlockersTask] = useState<{ task: Task; targetStatus: TaskStatus } | null>(null);
  const [openBlockersList, setOpenBlockersList] = useState<any[]>([]);
  const [resolvingNoteText, setResolvingNoteText] = useState('');
  const [resolvingLoadingState, setResolvingLoadingState] = useState(false);

  // Progress approval states
  const [progressUpdates, setProgressUpdates] = useState<any[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState<any>(null);
  const [adjustPercent, setAdjustPercent] = useState(50);
  const [adjustNote, setAdjustNote] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);

  const fetchProgressUpdates = useCallback(async () => {
    if (!id) return;
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/progress/list?projectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setProgressUpdates(data.data || []);
      }
    } catch (err) { console.error(err); }
    finally { setProgressLoading(false); }
  }, [id]);

  const fetchChatMessages = useCallback(async () => {
    if (!id) return;
    setChatLoading(true);
    try {
      const res = await fetch(`/api/messages/list?projectId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) { console.error(err); }
    finally { setChatLoading(false); }
  }, [id]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !id) return;
    setChatSending(true);
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id, content: chatInput.trim() }),
      });
      if (res.ok) {
        setChatInput('');
        fetchChatMessages();
      }
    } catch (err) { console.error(err); }
    finally { setChatSending(false); }
  };

  const handleApproveProgress = async (puId: string) => {
    try {
      const res = await fetch('/api/progress/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressUpdateId: puId, action: 'approved' }),
      });
      if (res.ok) { fetchProgressUpdates(); fetchTasks(); fetchProjectDetails(); }
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Lỗi kết nối'); }
  };

  const handleAdjustProgress = async () => {
    if (!adjustModal) return;
    setAdjustLoading(true);
    try {
      const res = await fetch('/api/progress/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressUpdateId: adjustModal.id,
          action: 'adjusted',
          finalPercent: adjustPercent,
          reviewNote: adjustNote,
        }),
      });
      if (res.ok) { setAdjustModal(null); setAdjustNote(''); fetchProgressUpdates(); fetchTasks(); fetchProjectDetails(); }
      else { const d = await res.json(); alert(d.error); }
    } catch { alert('Lỗi kết nối'); }
    finally { setAdjustLoading(false); }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Xóa tin nhắn này?')) return;
    try {
      const res = await fetch('/api/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId }),
      });
      if (res.ok) fetchChatMessages();
    } catch { alert('Lỗi'); }
  };

  useEffect(() => {
    if (resolvingBlockersTask) {
      const fetchOpenBlockers = async () => {
        try {
          const res = await fetch(`/api/blockers/list?taskId=${resolvingBlockersTask.task.id}`);
          if (res.ok) {
            const data = await res.json();
            const openOnly = (data.data || []).filter((b) => b.status === 'open');
            setOpenBlockersList(openOnly);
            if (openOnly.length === 0) {
              await updateTaskStatusDirectly(resolvingBlockersTask.task, resolvingBlockersTask.targetStatus);
              setResolvingBlockersTask(null);
            }
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchOpenBlockers();
    } else {
      setOpenBlockersList([]);
      setResolvingNoteText('');
    }
  }, [resolvingBlockersTask]);

  // Fetch progress/chat when tab switches
  useEffect(() => {
    if (activeTab === 'progress') fetchProgressUpdates();
    if (activeTab === 'chat') fetchChatMessages();
  }, [activeTab, fetchProgressUpdates, fetchChatMessages]);

  // Auto-refresh chat every 10 seconds
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const interval = setInterval(fetchChatMessages, 10000);
    return () => clearInterval(interval);
  }, [activeTab, fetchChatMessages]);

  const updateTaskStatusDirectly = async (task: Task, newStatus: TaskStatus) => {
    const prevTasks = [...tasks];
    setTasks(prevTasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          status: newStatus,
          priority: task.priority,
          ownerId: task.ownerId,
          percentComplete: newStatus === 'done' ? 100 : task.percentComplete,
          startDate: task.startDate || undefined,
          dueDate: task.dueDate || undefined,
          version: task.version,
        }),
      });

      if (res.status === 409) {
        alert('Xung đột phiên bản! Công việc này đã được người khác chỉnh sửa. Vui lòng làm mới trang.');
        setTasks(prevTasks);
        fetchTasks();
        fetchProjectDetails();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Lỗi khi cập nhật trạng thái.');
        setTasks(prevTasks);
      } else {
        fetchTasks();
        fetchProjectDetails();
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
      setTasks(prevTasks);
    }
  };

  const handleCreateBlockerFromKanban = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingBlockerTask) return;
    if (blockerDescription.trim().length < 10) {
      alert('Mô tả vướng mắc phải có ít nhất 10 ký tự.');
      return;
    }

    setReportingLoading(true);
    try {
      const res = await fetch('/api/blockers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: reportingBlockerTask.id,
          description: blockerDescription.trim(),
        }),
      });

      if (res.ok) {
        setReportingBlockerTask(null);
        setBlockerDescription('');
        fetchTasks();
        fetchProjectDetails();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi khi báo cáo vướng mắc.');
        fetchTasks();
      }
    } catch {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setReportingLoading(false);
    }
  };

  const handleResolveAllBlockersFromKanban = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingBlockersTask) return;
    if (!resolvingNoteText.trim()) {
      alert('Vui lòng nhập ghi chú giải quyết vướng mắc.');
      return;
    }

    setResolvingLoadingState(true);
    try {
      for (const blocker of openBlockersList) {
        await fetch('/api/blockers/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockerId: blocker.id,
            resolutionNote: resolvingNoteText.trim(),
          }),
        });
      }

      const res = await fetch(`/api/tasks/update?taskId=${resolvingBlockersTask.task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resolvingBlockersTask.task.title,
          description: resolvingBlockersTask.task.description,
          status: resolvingBlockersTask.targetStatus,
          priority: resolvingBlockersTask.task.priority,
          ownerId: resolvingBlockersTask.task.ownerId,
          percentComplete: resolvingBlockersTask.targetStatus === 'done' ? 100 : resolvingBlockersTask.task.percentComplete,
          startDate: resolvingBlockersTask.task.startDate || undefined,
          dueDate: resolvingBlockersTask.task.dueDate || undefined,
          version: resolvingBlockersTask.task.version,
        }),
      });

      if (res.ok) {
        setResolvingBlockersTask(null);
        fetchTasks();
        fetchProjectDetails();
      } else {
        const data = await res.json();
        alert(data.error || 'Lỗi khi cập nhật trạng thái sau khi giải quyết vướng mắc.');
        fetchTasks();
      }
    } catch {
      alert('Lỗi kết nối máy chủ.');
      fetchTasks();
    } finally {
      setResolvingLoadingState(false);
    }
  };

  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [selectedTaskForProgress, setSelectedTaskForProgress] = useState<Task | null>(null);

  const fetchProjectDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/detail?projectId=${id}`);
      const data = await res.json();
      if (res.ok) {
        setProject(data.project);
        setMembers(data.members || []);
        setTaskMetrics(data.taskMetrics || { totalTasks: 0, doneTasks: 0, overdueTasks: 0 });
      } else {
        setError(data.error || 'Đã xảy ra lỗi khi tải thông tin dự án.');
      }
    } catch {
      setError('Không thể kết nối đến máy chủ.');
    }
    setLoading(false);
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    setTasksLoading(true);
    try {
      const isKanban = typeof viewMode !== 'undefined' && viewMode === 'kanban';
      const query = new URLSearchParams({
        projectId: id,
        search: taskSearch.trim(),
        status: taskStatusFilter,
        priority: taskPriorityFilter,
        page: String(isKanban ? 1 : taskPage),
        limit: String(isKanban ? 1000 : taskLimit),
      });
      const res = await fetch(`/api/tasks/list?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setTasksTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
    setTasksLoading(false);
  }, [id, taskSearch, taskStatusFilter, taskPriorityFilter, taskPage, viewMode, taskLimit]);

  const fetchAvailableUsers = useCallback(async () => {
    if (!canManage) return;
    try {
      const res = await fetch('/api/users/list?limit=100&status=active');
      if (res.ok) {
        const data = await res.json();
        const memberIds = new Set(members.map((m) => m.userId));
        const filtered = (data.users || []).filter((u: User) => !memberIds.has(u.id));
        setAvailableUsers(filtered);
      }
    } catch (e) {
      console.error(e);
    }
  }, [canManage, members]);

  const refreshActiveProjectTab = useCallback(async () => {
    await fetchProjectDetails();
    if (activeTab === 'tasks') await fetchTasks();
    if (activeTab === 'progress') await fetchProgressUpdates();
    if (activeTab === 'chat') await fetchChatMessages();
  }, [activeTab, fetchProjectDetails, fetchTasks, fetchProgressUpdates, fetchChatMessages]);

  useAppRefresh(refreshActiveProjectTab, { minIntervalMs: 5000 });

  useEffect(() => {
    fetchProjectDetails();
  }, [fetchProjectDetails]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (project) {
      fetchAvailableUsers();
    }
  }, [project, fetchAvailableUsers]);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId) {
      setAddError('Vui lòng chọn thành viên.');
      return;
    }

    setAddLoading(true);
    setAddError('');

    try {
      const res = await fetch('/api/projects/members/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          userId: addUserId,
          projectRole: addRole,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAddUserId('');
        setAddRole('member');
        await fetchProjectDetails();
        await fetchTasks();
      } else {
        setAddError(data.error || 'Đã xảy ra lỗi khi thêm thành viên.');
      }
    } catch {
      setAddError('Không thể kết nối đến máy chủ.');
    }
    setAddLoading(false);
  };

  const handleRemoveMember = async (userId: string, fullName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn gỡ thành viên ${fullName} khỏi dự án này?`)) return;

    try {
      const res = await fetch('/api/projects/members/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          userId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        await fetchProjectDetails();
        await fetchTasks();
      } else {
        alert(data.error || 'Không thể gỡ thành viên.');
      }
    } catch {
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium">Đang tải thông tin chi tiết dự án...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="py-24 text-center max-w-lg mx-auto space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <h3 className="font-bold text-white text-base">Không thể hiển thị dự án</h3>
        <p className="text-xs text-slate-400">{error || 'Dự án không tồn tại hoặc bạn không có quyền truy cập.'}</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const isLocked = project.status === 'completed' || project.status === 'archived';
  const progressPercent = taskMetrics.totalTasks > 0
    ? Math.round((taskMetrics.doneTasks / taskMetrics.totalTasks) * 100)
    : 0;

  const manager = members.find((m) => m.projectRole === 'manager');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span className="hover:text-slate-300 cursor-pointer" onClick={() => navigate('/projects')}>Dự án</span>
            <span>/</span>
            <span className="text-slate-400">Chi tiết</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{project.name}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            Quay lại
          </button>
          {canManage && (
            <button
              onClick={() => setEditModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 flex items-center gap-2 transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Chỉnh sửa dự án
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-slate-900/35 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng quan dự án</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${project.status === 'planning' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' :
              project.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                project.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  project.status === 'completed' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
              }`}>
              {project.status === 'planning' ? '⏳ Chờ duyệt' :
                project.status === 'active' ? '✅ Đang hoạt động' :
                  project.status === 'paused' ? '⏸ Tạm dừng' :
                    project.status === 'completed' ? '🏁 Hoàn thành' :
                      project.status === 'rejected' ? '❌ Từ chối' :
                        '🗄️ Lưu trữ'}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed min-h-[60px] whitespace-pre-wrap">
            {project.description || 'Không có mô tả chi tiết cho dự án này.'}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-900/60 text-xs text-slate-400">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Thời hạn dự án</span>
              <span className="font-semibold text-slate-200">
                {project.startDate ? new Date(project.startDate).toLocaleDateString('vi-VN') : '-'}
                {' - '}
                {project.dueDate ? new Date(project.dueDate).toLocaleDateString('vi-VN') : '-'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Người quản lý (Manager)</span>
              <span className="font-semibold text-slate-200">
                {manager ? `${manager.fullName} (@${manager.username})` : 'Chưa chỉ định'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900/35 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiến độ & Chỉ số</h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tiến độ hoàn thành:</span>
                <span className="font-bold text-white">{progressPercent}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                <span className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Tổng số</span>
                <span className="font-bold text-slate-200">{taskMetrics.totalTasks}</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                <span className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Đã xong</span>
                <span className="font-bold text-emerald-400">{taskMetrics.doneTasks}</span>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                <span className="block text-slate-500 text-[10px] uppercase font-bold mb-1">Quá hạn</span>
                <span className="font-bold text-red-400">{taskMetrics.overdueTasks}</span>
              </div>
            </div>
          </div>

          {taskMetrics.overdueTasks > 0 && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Dự án đang có <strong>{taskMetrics.overdueTasks}</strong> công việc quá hạn cần xử lý!</span>
            </div>
          )}
        </div>
      </div>

      {isLocked && (
        <div className="p-4 bg-slate-900/50 border border-indigo-500/25 rounded-2xl flex items-center gap-3 text-xs text-indigo-300">
          <Lock className="h-5 w-5 text-indigo-400 shrink-0" />
          <div>
            <strong>Dự án đã đóng hoặc hoàn thành (Trạng thái: {project.status}).</strong> Mọi thao tác thêm/gỡ thành viên đã bị khóa để lưu trữ thông tin lịch sử.
          </div>
        </div>
      )}

      <div className="border-b border-slate-900 flex gap-4">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'members'
            ? 'border-indigo-500 text-indigo-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          Thành viên ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'tasks'
            ? 'border-indigo-500 text-indigo-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          Công việc ({taskMetrics.totalTasks})
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'progress'
            ? 'border-indigo-500 text-indigo-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          📊 Duyệt tiến độ {progressUpdates.filter(p => p.status === 'pending').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px]">
              {progressUpdates.filter(p => p.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'chat'
            ? 'border-indigo-500 text-indigo-400 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
        >
          💬 Chat
        </button>
      </div>

      {activeTab === 'progress' ? (
        <div className="space-y-4">
          {progressLoading ? (
            <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400" /><p className="text-xs text-slate-400 mt-2">Đang tải...</p></div>
          ) : progressUpdates.length === 0 ? (
            <div className="py-8 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
              <p className="text-sm text-slate-400">Chưa có yêu cầu cập nhật tiến độ nào.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {progressUpdates.map(pu => (
                <div key={pu.id} className={`p-4 rounded-xl border ${pu.status === 'pending' ? 'bg-amber-500/5 border-amber-500/20' :
                  pu.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/20' :
                    'bg-blue-500/5 border-blue-500/20'
                  }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">{pu.submitterName}</span>
                        <span className="text-[10px] text-slate-500">{new Date(pu.createdAt).toLocaleString('vi-VN')}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${pu.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                          pu.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                          {pu.status === 'pending' ? '⏳ Chờ duyệt' : pu.status === 'approved' ? '✅ Đã duyệt' : '🔄 Đã điều chỉnh'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300"><strong>Task:</strong> {pu.taskTitle}</p>
                      <p className="text-xs text-slate-300">Đề xuất: <strong className="text-white">{pu.currentPercent}% → {pu.proposedPercent}%</strong></p>
                      {pu.description && <p className="text-xs text-slate-400 italic">"{pu.description}"</p>}
                      {pu.evidenceUrl && <a href={pu.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">📎 Xem minh chứng</a>}
                      {pu.status !== 'pending' && pu.reviewNote && (
                        <div className="mt-2 p-2 bg-slate-900/50 rounded-lg border border-slate-800">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Phản hồi từ {pu.reviewerName || 'PM'}</p>
                          <p className="text-xs text-slate-300">{pu.reviewNote}</p>
                          {pu.status === 'adjusted' && <p className="text-xs text-blue-400 mt-1">Tiến độ điều chỉnh: <strong>{pu.finalPercent}%</strong></p>}
                        </div>
                      )}
                    </div>
                    {pu.status === 'pending' && canManage && (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleApproveProgress(pu.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold">✅ Duyệt {pu.proposedPercent}%</button>
                        <button onClick={() => { setAdjustModal(pu); setAdjustPercent(pu.proposedPercent); setAdjustNote(''); }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">🔄 Điều chỉnh</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {adjustModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
              <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
                <h3 className="text-sm font-bold text-white">🔄 Điều chỉnh tiến độ</h3>
                <p className="text-xs text-slate-400">Task: <strong className="text-white">{adjustModal.taskTitle}</strong></p>
                <p className="text-xs text-slate-400">Nhân viên đề xuất: <strong className="text-amber-400">{adjustModal.proposedPercent}%</strong></p>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">% Thực tế (do PM đánh giá)</label>
                  <div className="flex items-center gap-3">
                    <input type="range" min={0} max={100} value={adjustPercent} onChange={e => setAdjustPercent(Number(e.target.value))}
                      className="flex-1 accent-indigo-500" />
                    <span className="text-sm font-bold text-white w-12 text-right">{adjustPercent}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Ghi chú phản hồi *</label>
                  <textarea value={adjustNote} onChange={e => setAdjustNote(e.target.value)} rows={3}
                    placeholder="Giải thích lý do điều chỉnh..."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setAdjustModal(null)} className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">Hủy</button>
                  <button onClick={handleAdjustProgress} disabled={adjustLoading || !adjustNote.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold disabled:opacity-50">
                    {adjustLoading ? 'Đang gửi...' : `Điều chỉnh → ${adjustPercent}%`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'chat' ? (
        <div className="flex flex-col" style={{ minHeight: '400px' }}>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[500px]" id="chat-messages-container">
            {chatLoading ? (
              <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400" /></div>
            ) : chatMessages.length === 0 ? (
              <div className="py-12 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
                <p className="text-sm text-slate-400">Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!</p>
              </div>
            ) : (
              chatMessages.map(msg => {
                const isMe = msg.senderId === auth.user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] p-3 rounded-2xl ${isMe ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-900/50 border border-slate-800'}`}>
                      {!isMe && <p className="text-[10px] font-bold text-indigo-400 mb-1">{msg.senderName}</p>}
                      <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">{msg.content}</p>
                      <div className="flex items-center justify-between mt-1.5 gap-3">
                        <span className="text-[9px] text-slate-500">{new Date(msg.createdAt).toLocaleString('vi-VN')}</span>
                        {(isMe || canManage) && (
                          <button onClick={() => handleDeleteMessage(msg.id)} className="text-[9px] text-red-400/50 hover:text-red-400">Xóa</button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-2 mt-auto">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500" />
            <button onClick={handleSendMessage} disabled={chatSending || !chatInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 shrink-0">
              {chatSending ? '...' : 'Gửi'}
            </button>
          </div>
        </div>
      ) : activeTab === 'members' ? (
        <div className="space-y-6">
          {canManage && !isLocked && (
            <div className="p-5 bg-slate-900/35 border border-slate-800 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Thêm thành viên vào dự án</h4>
              {addError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}
              <form onSubmit={handleAddMemberSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <select
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                  >
                    <option value="">-- Chọn thành viên để thêm --</option>
                    {availableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} (@{u.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-44">
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as 'manager' | 'member' | 'viewer')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                  >
                    <option value="member">Thành viên (Member)</option>
                    <option value="manager">Người quản lý (Manager)</option>
                    <option value="viewer">Người xem (Viewer)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55 transition-colors"
                >
                  {addLoading ? 'Đang thêm...' : 'Thêm vào dự án'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-slate-900/35 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40">
                    <th className="py-4 px-6">Thành viên</th>
                    <th className="py-4 px-6">Vai trò dự án</th>
                    <th className="py-4 px-6">Ngày tham gia</th>
                    {canManage && !isLocked && <th className="py-4 px-6 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-xs">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                            {member.fullName.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-200 block">{member.fullName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">@{member.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize border ${member.projectRole === 'manager' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                          member.projectRole === 'member' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                          {member.projectRole === 'manager' ? 'Quản lý' : member.projectRole === 'member' ? 'Thành viên' : 'Xem'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                      </td>
                      {canManage && !isLocked && (
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.fullName)}
                            className="px-3 py-1.5 rounded-lg border border-red-500/20 text-[10px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            Gỡ ra
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <TaskBoardView auth={auth} fixedProjectId={id} onUpdateSuccess={fetchProjectDetails} />
        </div>
      )}

      {selectedTaskForProgress && (
        <UpdateTaskProgressModal
          currentUser={auth.user!}
          task={selectedTaskForProgress}
          onClose={() => setSelectedTaskForProgress(null)}
          onSuccess={() => {
            setSelectedTaskForProgress(null);
            fetchTasks();
            fetchProjectDetails();
          }}
        />
      )}
      {reportingBlockerTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto">
          <form onSubmit={handleCreateBlockerFromKanban} className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="text-base font-bold text-white">Báo cáo vướng mắc (Blocker)</h3>
              </div>
              <button
                type="button"
                onClick={() => { setReportingBlockerTask(null); setBlockerDescription(''); fetchTasks(); }}
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Hãy cung cấp chi tiết về vướng mắc ngăn cản bạn hoàn thành công việc <strong>{reportingBlockerTask.title}</strong>.
              </p>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Mô tả vướng mắc</label>
                <textarea
                  required
                  value={blockerDescription}
                  onChange={e => setBlockerDescription(e.target.value)}
                  placeholder="Nhập mô tả vướng mắc (tối thiểu 10 ký tự)..."
                  className="w-full min-h-[100px] px-3.5 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
              <button
                type="button"
                onClick={() => { setReportingBlockerTask(null); setBlockerDescription(''); fetchTasks(); }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={reportingLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55"
              >
                {reportingLoading ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {resolvingBlockersTask && openBlockersList.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto">
          <form onSubmit={handleResolveAllBlockersFromKanban} className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6 my-8">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Giải quyết vướng mắc</h3>
              </div>
              <button
                type="button"
                onClick={() => { setResolvingBlockersTask(null); fetchTasks(); }}
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Công việc <strong>{resolvingBlockersTask.task.title}</strong> đang bị chặn bởi các vướng mắc sau. Vui lòng nhập ghi chú để giải quyết toàn bộ vướng mắc trước khi chuyển sang cột mới.
              </p>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {openBlockersList.map(blocker => (
                  <div key={blocker.id} className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <span className="text-[10px] font-bold text-red-400 block">Báo cáo bởi {blocker.reporter_full_name}</span>
                    <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{blocker.description}</p>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Ghi chú giải quyết</label>
                <input
                  required
                  type="text"
                  value={resolvingNoteText}
                  onChange={e => setResolvingNoteText(e.target.value)}
                  placeholder="Nhập ghi chú giải quyết vướng mắc..."
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
              <button
                type="button"
                onClick={() => { setResolvingBlockersTask(null); fetchTasks(); }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={resolvingLoadingState}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-55"
              >
                {resolvingLoadingState ? 'Đang giải quyết...' : 'Xác nhận giải quyết & Di chuyển'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setEditModal(false)}
          onSuccess={() => {
            setEditModal(false);
            fetchProjectDetails();
          }}
        />
      )}
    </div>
  );
}

