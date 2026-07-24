/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  User as UserIcon, Users, Lock, Unlock, KeyRound, LogOut, Plus, Edit2, RefreshCw, Search, Filter, Check,
  AlertTriangle, Copy, History, Laptop, Smartphone, ChevronLeft, ChevronRight, Shield, Loader2, CheckCircle2,
  UserCheck, Briefcase, X, UserCog, CircleDot, LayoutDashboard, Mail, ListTodo, CalendarDays, Bell, FileText,
  Trash2, MessageSquare, Calendar, Flag, Tag, Layers, ChevronDown, Clock, Paperclip, AtSign, Smile, Send,
  MoreHorizontal, MoreVertical, CheckSquare, Eye, ShieldCheck, UserPlus, CornerDownRight, UserMinus
} from 'lucide-react';
import {
  User, Task, TaskStatus, TaskPriority, TaskBlocker, TaskMember, AuthSession, AuthContextType, Project, ProjectMember
} from '../../types';
import TaskCommentModal from './TaskCommentModal';
import KanbanBoard from './KanbanBoard';
import UpdateTaskProgressModal from './UpdateTaskProgressModal';

export default function TaskBoardView({
  auth,
  fixedProjectId,
  onUpdateSuccess,
}: {
  auth: AuthContextType;
  fixedProjectId?: string;
  onUpdateSuccess?: () => void;
}) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const [selectedProjectId, setSelectedProjectId] = useState(fixedProjectId || '');
  const [onlyMine, setOnlyMine] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [groupBy, setGroupBy] = useState<'status' | 'project'>('status');
  const activeProjectId = fixedProjectId || selectedProjectId;
  const canCreateSubtask = !!activeProjectId;

  const [activePopover, setActivePopover] = useState<{
    taskId: string;
    type: 'priority' | 'status';
    coords: { top?: number; bottom?: number; left: number };
  } | null>(null);

  const togglePopover = (e: React.MouseEvent<HTMLElement>, taskId: string, type: 'priority' | 'status') => {
    e.stopPropagation();
    if (activePopover?.taskId === taskId && activePopover?.type === type) {
      setActivePopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const isNearBottom = spaceBelow < 220;

    if (isNearBottom) {
      setActivePopover({
        taskId,
        type,
        coords: {
          bottom: window.innerHeight - rect.top + 6,
          left: Math.max(10, Math.min(rect.left, window.innerWidth - 210)),
        },
      });
    } else {
      setActivePopover({
        taskId,
        type,
        coords: {
          top: rect.bottom + 6,
          left: Math.max(10, Math.min(rect.left, window.innerWidth - 210)),
        },
      });
    }
  };

  useEffect(() => {
    const handleClosePopover = () => {
      if (activePopover) setActivePopover(null);
    };
    window.addEventListener('click', handleClosePopover);
    window.addEventListener('scroll', handleClosePopover, true);
    return () => {
      window.removeEventListener('click', handleClosePopover);
      window.removeEventListener('scroll', handleClosePopover, true);
    };
  }, [activePopover]);

  const [activeUserOptionsTaskId, setActiveUserOptionsTaskId] = useState<string | null>(null);
  const [activeCommentTask, setActiveCommentTask] = useState<any | null>(null);
  const [updateTaskModal, setUpdateTaskModal] = useState<any | null>(null);

  // Quick Subtask Input
  const [activeSubtaskInputTaskId, setActiveSubtaskInputTaskId] = useState<string | null>(null);
  const [subtaskTitleInput, setSubtaskTitleInput] = useState('');
  const [subtaskOwnerId, setSubtaskOwnerId] = useState('');
  const [subtaskDueDate, setSubtaskDueDate] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState('');
  const [creatingSubtask, setCreatingSubtask] = useState(false);

  const [showRootTaskDraft, setShowRootTaskDraft] = useState(false);
  const [rootTaskTitleInput, setRootTaskTitleInput] = useState('');
  const [rootTaskOwnerId, setRootTaskOwnerId] = useState('');
  const [rootTaskDueDate, setRootTaskDueDate] = useState('');
  const [rootTaskPriority, setRootTaskPriority] = useState('');
  const [creatingRootTask, setCreatingRootTask] = useState(false);

  const isAdmin = auth.user?.role === 'admin';

  const resetSubtaskDraft = () => {
    setActiveSubtaskInputTaskId(null);
    setSubtaskTitleInput('');
    setSubtaskOwnerId('');
    setSubtaskDueDate('');
    setSubtaskPriority('');
  };

  const resetRootTaskDraft = () => {
    setShowRootTaskDraft(false);
    setRootTaskTitleInput('');
    setRootTaskOwnerId('');
    setRootTaskDueDate('');
    setRootTaskPriority('');
  };

  useEffect(() => {
    if (!canCreateSubtask) {
      resetSubtaskDraft();
      resetRootTaskDraft();
    }
  }, [canCreateSubtask]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects/list', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchProjectMembers = useCallback(async (pId: string) => {
    if (!pId) return;
    try {
      const res = await fetch(`/api/projects/members?projectId=${pId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjectMembers(data.members || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        search: debouncedSearch.trim(),
        limit: '200',
      });
      const pId = fixedProjectId || selectedProjectId;
      if (pId) {
        query.set('projectId', pId);
        fetchProjectMembers(pId);
      }
      if (onlyMine) {
        query.set('onlyMine', 'true');
      }
      const endpoint = '/api/tasks/my';
      const res = await fetch(`${endpoint}?${query.toString()}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedProjectId, fixedProjectId, onlyMine, fetchProjectMembers]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Quick Action: Claim Task / Assign to self
  const handleClaimTask = async (task: any) => {
    try {
      const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'claim_task' }),
      });
      if (res.ok) {
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể tự nhận việc.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Action: Unclaim Task (Rút khỏi task khi percent = 0)
  const handleUnclaimTask = async (task: any) => {
    setActiveUserOptionsTaskId(null);
    try {
      const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unclaim_task' }),
      });
      if (res.ok) {
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể rút khỏi công việc.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateRootTask = async () => {
    if (!activeProjectId) {
      alert('Vui lòng chọn một dự án cụ thể trước khi tạo task.');
      return;
    }
    if (!rootTaskTitleInput.trim()) {
      alert('Vui lòng nhập tên task.');
      return;
    }
    try {
      setCreatingRootTask(true);
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          title: rootTaskTitleInput.trim(),
          status: 'todo',
          priority: rootTaskPriority || 'medium',
          ownerId: rootTaskOwnerId || null,
          dueDate: rootTaskDueDate || null,
        }),
      });
      if (res.ok) {
        resetRootTaskDraft();
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể tạo task.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingRootTask(false);
    }
  };

  // Quick Action: Create Subtask under Parent Task
  const handleCreateSubtask = async (parentTask: any) => {
    if (!subtaskTitleInput.trim()) return;
    if (!activeProjectId) {
      alert('Vui lòng chọn một dự án cụ thể trước khi tạo task nhỏ.');
      return;
    }
    if (parentTask.projectId !== activeProjectId) {
      alert('Task nhỏ phải được tạo trong đúng dự án đang chọn.');
      return;
    }
    try {
      setCreatingSubtask(true);
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          parentId: parentTask.id,
          title: subtaskTitleInput.trim(),
          status: 'todo',
          priority: subtaskPriority || 'medium',
          ownerId: subtaskOwnerId || null,
          dueDate: subtaskDueDate || null,
        }),
      });
      if (res.ok) {
        resetSubtaskDraft();
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể tạo task nhỏ.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingSubtask(false);
    }
  };
  const handleUpdatePriority = async (task: any, newPriority: string) => {
    setActivePopover(null);
    try {
      const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority, version: task.version }),
      });
      if (res.ok) {
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể đổi mức độ ưu tiên.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (task: any, newStatus: string) => {
    setActivePopover(null);
    try {
      const canManageThisTask = isAdmin || task.memberRole === 'manager';
      if (newStatus === 'done' && !canManageThisTask) {
        const res = await fetch('/api/progress/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            proposedPercent: 100,
            description: 'Đề xuất hoàn thành công việc.',
          }),
        });
        if (res.ok) {
          fetchTasks();
          if (onUpdateSuccess) onUpdateSuccess();
        } else {
          const d = await res.json();
          alert(d.error || 'Không thể gửi yêu cầu hoàn thành.');
        }
        return;
      }

      const res = await fetch(`/api/tasks/update?taskId=${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          percentComplete: newStatus === 'done' ? 100 : task.percentComplete,
          version: task.version,
        }),
      });
      if (res.ok) {
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể đổi trạng thái.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveTask = async (task: any) => {
    setActivePopover(null);
    if (task.status !== 'todo') return;
    const confirmed = window.confirm(`Xóa task "${task.title}" khỏi việc cần làm?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/tasks/archive?taskId=${encodeURIComponent(task.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        fetchTasks();
        if (onUpdateSuccess) onUpdateSuccess();
      } else {
        const d = await res.json();
        alert(d.error || 'Không thể xóa task.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleApprovePendingProgress = async (task: any) => {
    try {
      if (task.pendingProgressUpdateId) {
        await fetch('/api/progress/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            progressUpdateId: task.pendingProgressUpdateId,
            action: 'approved',
          }),
        });
      } else {
        await fetch(`/api/tasks/update?taskId=${task.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            percentComplete: task.pendingPercent,
            status: task.pendingPercent === 100 ? 'done' : 'in_progress',
          }),
        });
      }
      fetchTasks();
      if (onUpdateSuccess) onUpdateSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingSubtask(false);
    }
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case 'high':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 whitespace-nowrap"><Flag className="h-3.5 w-3.5 fill-red-400 text-red-400 shrink-0" /> Khẩn cấp</span>;
      case 'medium':
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 whitespace-nowrap"><Flag className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" /> Cao</span>;
      case 'low':
      default:
        return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 whitespace-nowrap"><Flag className="h-3.5 w-3.5 fill-blue-400 text-blue-400 shrink-0" /> Bình thường</span>;
    }
  };

  const statusBadge = (task: any) => {
    if (task.pendingPercent !== undefined && task.pendingPercent !== null) {
      return (
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">
          ⏳ Chờ duyệt {task.pendingPercent}%
        </span>
      );
    }

    switch (task.status) {
      case 'todo':
        return <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">🔘 VIỆC CẦN LÀM</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">🔵 ĐANG LÀM</span>;
      case 'waiting':
        return <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">🟡 ĐANG CHỜ</span>;
      case 'done':
      default:
        return <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap">✅ HOÀN THÀNH</span>;
    }
  };

  // Group root tasks vs subtasks
  const rootTasks = tasks.filter(t => !t.parentId);
  const subtasksMap = new Map<string, any[]>();
  tasks.forEach(t => {
    if (t.parentId) {
      const list = subtasksMap.get(t.parentId) || [];
      list.push(t);
      subtasksMap.set(t.parentId, list);
    }
  });

  return (
    <div className="space-y-5">
      {/* Control Header & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Tìm kiếm hoặc nhập tên công việc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
            />
          </div>

          {!fixedProjectId && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
            >
              <option value="">📁 Tất cả dự án</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {/* Toggle filter: All vs Only Mine */}
          <button
            type="button"
            onClick={() => setOnlyMine(!onlyMine)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${onlyMine
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
          >
            {onlyMine ? <UserIcon className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
            {onlyMine ? '👤 Chỉ việc của tôi' : '🔘 Tất cả công việc'}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              📋 Danh sách
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              📊 Kanban
            </button>
          </div>

          {viewMode === 'list' && (
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'status' | 'project')}
              className="px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 focus:outline-none cursor-pointer"
            >
              <option value="status">Gom nhóm: Trạng thái</option>
              <option value="project">Gom nhóm: Dự án</option>
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">
          <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto mb-2" />
          <p className="text-xs">Đang tải danh sách công việc...</p>
        </div>
      ) : tasks.length === 0 && !(viewMode === 'list' && activeProjectId) ? (
        <div className="py-12 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-sm text-slate-400">Không tìm thấy công việc nào.</p>
        </div>
      ) : viewMode === 'list' ? (
        /* LIST VIEW - ClickUp Style Table */
        <div className="space-y-6">
          {(() => {
            const groupMap: Record<string, any[]> = {};
            if (groupBy === 'status') {
              groupMap['todo'] = [];
              groupMap['in_progress'] = [];
              groupMap['done'] = [];
              rootTasks.forEach((t) => {
                let k = t.status || 'todo';
                if (k === 'waiting') k = 'in_progress';
                if (!groupMap[k]) groupMap[k] = [];
                groupMap[k].push(t);
              });
            } else {
              rootTasks.forEach((t) => {
                const k = t.projectName || t.projectId || 'Chưa rõ dự án';
                if (!groupMap[k]) groupMap[k] = [];
                groupMap[k].push(t);
              });
            }

            return Object.entries(groupMap).map(([groupKey, groupTasks]) => {
              if (groupTasks.length === 0 && groupBy === 'project') return null;
              const groupTitle =
                groupBy === 'status'
                  ? groupKey === 'todo'
                    ? '🔘 VIỆC CẦN LÀM'
                    : groupKey === 'in_progress'
                      ? '🔵 ĐANG LÀM'
                      : '✅ HOÀN THÀNH'
                  : groupKey;

              return (
                <div key={groupKey} className="bg-slate-900/30 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                  {/* Group Header */}
                  <div className="px-5 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                      <h3 className="text-xs font-bold text-white tracking-wider uppercase">{groupTitle}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        {groupTasks.length}
                      </span>
                    </div>
                  </div>

                  {/* Table Header with Optimized Column Ratios */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs table-fixed">
                      <thead>
                        <tr className="border-b border-slate-800/60 text-slate-500 font-semibold uppercase text-[10px] tracking-wider bg-slate-950/30">
                          <th className="py-3 px-4 w-[24%]">Tên nhiệm vụ</th>
                          <th className="py-3 px-3 w-[18%]">Người được giao</th>
                          <th className="py-3 px-3 w-[13%]">Ngày đến hạn</th>
                          <th className="py-3 px-3 w-[12%]">Ưu tiên</th>
                          <th className="py-3 px-3 w-[13%]">Trạng thái</th>
                          <th className="py-3 px-2 w-[6%] text-center whitespace-nowrap">Bình luận</th>
                          <th className="py-3 px-4 w-[14%] text-right whitespace-nowrap">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {groupTasks.map((task, index) => {
                          const isAssigned = task.ownerId === auth.user?.id || (task.memberRole === 'owner') || (task.memberRole === 'collaborator');
                          const childSubtasks = subtasksMap.get(task.id) || [];
                          const isUserOwner = task.ownerId === auth.user?.id;
                          const hasPendingProgress = task.pendingPercent !== undefined && task.pendingPercent !== null;
                          const taskProgressComplete = Number(task.percentComplete || 0) >= 100 || task.status === 'done';
                          const canShowProgressUpdate = isAssigned && !hasPendingProgress && !taskProgressComplete;

                          // Smart popover direction based on row position
                          const isNearBottom = index >= groupTasks.length - 2 && groupTasks.length > 2;
                          const popoverPlacement = isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

                          return (
                            <React.Fragment key={task.id}>
                              {/* PARENT TASK ROW */}
                              <tr className="hover:bg-slate-800/30 transition-colors group">
                                {/* Title & Subtask '+' Icon */}
                                <td className="py-3 px-4 text-slate-200 overflow-hidden">
                                  <div className="flex items-start justify-between gap-2 max-w-full">
                                    <div className="flex flex-col gap-1 items-start max-w-[calc(100%-24px)] overflow-hidden">
                                      <span
                                        className="text-xs font-bold text-slate-100 leading-snug line-clamp-2 break-all max-w-full"
                                        title={task.title}
                                      >
                                        {task.title}
                                      </span>
                                      {task.projectName && groupBy === 'status' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/80 max-w-full truncate">
                                          <Briefcase className="h-3 w-3 text-indigo-400 shrink-0" />
                                          <span className="truncate">{task.projectName}</span>
                                        </span>
                                      )}
                                    </div>

                                    {/* '+' Button on Parent Task to add Subtask */}
                                    {canCreateSubtask && (
                                      <button
                                      onClick={() => {
                                        if (activeSubtaskInputTaskId === task.id) {
                                          resetSubtaskDraft();
                                        } else {
                                          resetRootTaskDraft();
                                          resetSubtaskDraft();
                                          setActiveSubtaskInputTaskId(task.id);
                                        }
                                      }}
                                      className="p-1 rounded-md bg-slate-800/80 hover:bg-indigo-600 text-slate-400 hover:text-white transition-colors shrink-0 opacity-80 group-hover:opacity-100"
                                      title="Thêm task nhỏ (Subtask)"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Assignee Column with 👤+ Direct Claim / Unassign */}
                                <td className="py-3.5 px-3 text-slate-400 relative overflow-hidden">
                                  {task.ownerId ? (
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                      <div className="h-6 w-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                        {(task.ownerName || 'U').substring(0, 1).toUpperCase()}
                                      </div>
                                      <span className="truncate text-xs text-slate-200 font-medium">{task.ownerName}</span>
                                      
                                      {/* Unassign option if 0% progress */}
                                      {isUserOwner && (task.percentComplete === 0 || !task.percentComplete) && (
                                        <button
                                          onClick={() => handleUnclaimTask(task)}
                                          className="p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                                          title="Rút khỏi công việc (Trả về task mở)"
                                        >
                                          <UserMinus className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    /* Open Task - Click 👤+ to Direct Claim */
                                    <button
                                      onClick={() => handleClaimTask(task)}
                                      className="px-2 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm whitespace-nowrap"
                                      title="Bấm vào để tự nhận việc và làm ngay"
                                    >
                                      <UserPlus className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                      <span>👤+ Nhận làm</span>
                                    </button>
                                  )}
                                </td>

                                {/* Due date */}
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  {task.dueDate ? (
                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-400 font-bold' : 'text-slate-300'
                                      }`}>
                                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[11px] italic">Chưa đặt</span>
                                  )}
                                </td>

                                {/* Priority with Fixed Floating Popover Trigger */}
                                <td className="py-3.5 px-3 relative">
                                  <button
                                    onClick={(e) => togglePopover(e, task.id, 'priority')}
                                    className="p-1 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-left"
                                  >
                                    {priorityBadge(task.priority)}
                                    <ChevronDown className="h-3 w-3 text-slate-500" />
                                  </button>
                                </td>

                                {/* Status with Fixed Floating Popover Trigger */}
                                <td className="py-3.5 px-3 relative">
                                  <button
                                    onClick={(e) => togglePopover(e, task.id, 'status')}
                                    className="hover:opacity-80 transition-opacity text-left"
                                  >
                                    {statusBadge(task)}
                                  </button>
                                </td>

                                {/* Comments */}
                                <td className="py-3.5 px-2 text-center">
                                  <button onClick={() => setActiveCommentTask(task)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5 text-xs font-medium">
                                    <MessageSquare className="h-4 w-4" />
                                    <span>{task.commentCount || 0}</span>
                                  </button>
                                </td>

                                {/* Actions Column (ONLY show single approval button if employee requested approval) */}
                                <td className="py-3.5 px-4 text-right">
                                  {hasPendingProgress && (isAdmin || task.memberRole === 'manager') ? (
                                    <button
                                      onClick={() => setUpdateTaskModal(task)}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow shadow-emerald-600/20 whitespace-nowrap flex items-center gap-1 ml-auto"
                                      title="Mở menu phê duyệt & điều chỉnh tiến độ"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt
                                    </button>
                                  ) : canShowProgressUpdate ? (
                                    <button
                                      onClick={() => setUpdateTaskModal(task)}
                                      className="px-2.5 py-1 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow shadow-indigo-600/20 whitespace-nowrap"
                                    >
                                      Cập nhật
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-600 italic">-</span>
                                  )}
                                </td>
                              </tr>

                              {/* MULTI-COLUMN INLINE SUBTASK CREATION ROW */}
                              {canCreateSubtask && activeSubtaskInputTaskId === task.id && (
                                <tr className="bg-slate-950/80 border-y border-indigo-500/40">
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center gap-2">
                                      <CornerDownRight className="h-4 w-4 text-indigo-400 shrink-0" />
                                      <input
                                        type="text"
                                        autoFocus
                                        placeholder="1. Nhập tên nhiệm vụ con (Subtask)..."
                                        value={subtaskTitleInput}
                                        onChange={(e) => setSubtaskTitleInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleCreateSubtask(task);
                                          if (e.key === 'Escape') resetSubtaskDraft();
                                        }}
                                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/50 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                                      />
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <select
                                      value={subtaskOwnerId}
                                      onChange={(e) => setSubtaskOwnerId(e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-400"
                                    >
                                      <option value="">+ Người giao</option>
                                      {projectMembers.map((member) => (
                                        <option key={member.userId} value={member.userId}>{member.fullName}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="date"
                                      value={subtaskDueDate}
                                      onChange={(e) => setSubtaskDueDate(e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-400"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <select
                                      value={subtaskPriority}
                                      onChange={(e) => setSubtaskPriority(e.target.value)}
                                      className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-400"
                                    >
                                      <option value="">+ Ưu tiên</option>
                                      <option value="high">Khẩn cấp</option>
                                      <option value="medium">Cao</option>
                                      <option value="low">Bình thường</option>
                                    </select>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="text-[11px] text-slate-300 font-medium">🔘 VIỆC CẦN LÀM</span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center text-slate-500 text-[11px]">-</td>
                                  <td className="py-2.5 px-4 text-right">
                                    <button
                                      onClick={() => handleCreateSubtask(task)}
                                      disabled={creatingSubtask || !subtaskTitleInput.trim()}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow whitespace-nowrap"
                                    >
                                      Tạo
                                    </button>
                                  </td>
                                </tr>
                              )}

                              {/* SUBTASKS INDENTED ROWS (Full Individual Data & Interactions) */}
                              {childSubtasks.map((st, stIdx) => {
                                const isStUserOwner = st.ownerId === auth.user?.id;
                                const stHasPendingProgress = st.pendingPercent !== undefined && st.pendingPercent !== null;
                                const stProgressComplete = Number(st.percentComplete || 0) >= 100 || st.status === 'done';
                                const canShowSubtaskProgressUpdate = isStUserOwner && !stHasPendingProgress && !stProgressComplete;
                                const isStNearBottom = stIdx >= childSubtasks.length - 1 && isNearBottom;
                                const stPopoverPlacement = isStNearBottom ? 'bottom-full mb-1' : 'top-full mt-1';

                                return (
                                  <tr key={st.id} className="bg-slate-950/40 hover:bg-slate-900/60 transition-colors border-b border-slate-800/40">
                                    <td className="py-2.5 px-6 text-slate-300 overflow-hidden">
                                      <div className="flex items-center gap-2 max-w-full">
                                        <CornerDownRight className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                        <span className="text-xs font-semibold text-slate-200 truncate" title={st.title}>
                                          {st.title}
                                        </span>
                                      </div>
                                    </td>

                                    {/* Subtask Assignee / 👤+ Icon */}
                                    <td className="py-2.5 px-3">
                                      {st.ownerId ? (
                                        <div className="flex items-center gap-1.5">
                                          <div className="h-5 w-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-[9px] shrink-0">
                                            {(st.ownerName || 'U').substring(0, 1).toUpperCase()}
                                          </div>
                                          <span className="truncate text-[11px] text-slate-300">{st.ownerName}</span>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => handleClaimTask(st)}
                                          className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap"
                                        >
                                          <UserPlus className="h-3 w-3 text-emerald-400" />
                                          <span>Nhận làm</span>
                                        </button>
                                      )}
                                    </td>

                                    <td className="py-2.5 px-3 text-slate-400 text-[11px] whitespace-nowrap">{st.dueDate || '-'}</td>

                                    {/* Subtask Priority */}
                                    <td className="py-2.5 px-3 relative">
                                      <button
                                        onClick={(e) => togglePopover(e, st.id, 'priority')}
                                        className="p-0.5 rounded hover:bg-slate-800 transition-colors flex items-center gap-1 text-left"
                                      >
                                        {priorityBadge(st.priority)}
                                        <ChevronDown className="h-3 w-3 text-slate-500" />
                                      </button>
                                    </td>

                                    {/* Subtask Status */}
                                    <td className="py-2.5 px-3 relative">
                                      <button
                                        onClick={(e) => togglePopover(e, st.id, 'status')}
                                        className="hover:opacity-80 transition-opacity text-left"
                                      >
                                        {statusBadge(st)}
                                      </button>
                                    </td>

                                    <td className="py-2.5 px-2 text-center">
                                      <button onClick={() => setActiveCommentTask(st)} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-400 text-xs font-medium inline-flex items-center gap-1">
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        <span>{st.commentCount || 0}</span>
                                      </button>
                                    </td>

                                    <td className="py-2.5 px-4 text-right">
                                      {stHasPendingProgress && (isAdmin || st.memberRole === 'manager') ? (
                                        <button
                                          onClick={() => setUpdateTaskModal(st)}
                                          className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow"
                                        >
                                          Duyệt
                                        </button>
                                      ) : canShowSubtaskProgressUpdate ? (
                                        <button
                                          onClick={() => setUpdateTaskModal(st)}
                                          className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded shadow"
                                        >
                                          Cập nhật
                                        </button>
                                      ) : (
                                        <span className="text-[11px] text-slate-600 italic">-</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        {groupBy === 'status' && groupKey === 'todo' && activeProjectId && (
                          showRootTaskDraft ? (
                            <tr className="bg-slate-950/80 border-y border-indigo-500/40">
                              <td className="py-2.5 px-4">
                                <input
                                  type="text"
                                  autoFocus
                                  placeholder="Nhập tên task..."
                                  value={rootTaskTitleInput}
                                  onChange={(e) => setRootTaskTitleInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateRootTask();
                                    if (e.key === 'Escape') resetRootTaskDraft();
                                  }}
                                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/50 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={rootTaskOwnerId}
                                  onChange={(e) => setRootTaskOwnerId(e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-400"
                                >
                                  <option value="">+ Người giao</option>
                                  {projectMembers.map((member) => (
                                    <option key={member.userId} value={member.userId}>{member.fullName}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={rootTaskDueDate}
                                  onChange={(e) => setRootTaskDueDate(e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-400"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={rootTaskPriority}
                                  onChange={(e) => setRootTaskPriority(e.target.value)}
                                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-400"
                                >
                                  <option value="">+ Ưu tiên</option>
                                  <option value="high">Khẩn cấp</option>
                                  <option value="medium">Cao</option>
                                  <option value="low">Bình thường</option>
                                </select>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-[11px] text-slate-300 font-bold">VIỆC CẦN LÀM</span>
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-500 text-[11px]">-</td>
                              <td className="py-2.5 px-4 text-right">
                                <button
                                  onClick={handleCreateRootTask}
                                  disabled={creatingRootTask || !rootTaskTitleInput.trim()}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow whitespace-nowrap"
                                >
                                  Tạo
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr className="bg-slate-950/40">
                              <td className="py-2.5 px-4">
                                <button
                                  onClick={() => {
                                    resetSubtaskDraft();
                                    setShowRootTaskDraft(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold text-indigo-300 hover:text-white hover:bg-indigo-600/20 border border-dashed border-indigo-500/30"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Thêm task
                                </button>
                              </td>
                              <td colSpan={6} />
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {[
            { key: 'todo', title: '🔘 VIỆC CẦN LÀM', color: 'border-slate-700 bg-slate-900/40' },
            { key: 'in_progress', title: '🔵 ĐANG LÀM', color: 'border-blue-500/30 bg-blue-500/5' },
            { key: 'done', title: '✅ HOÀN THÀNH', color: 'border-emerald-500/30 bg-emerald-500/5' },
          ].map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key || (col.key === 'in_progress' && t.status === 'waiting'));
            return (
              <div key={col.key} className={`p-4 rounded-2xl border ${col.color} space-y-4`}>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{col.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">{colTasks.length}</span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {colTasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all space-y-3 shadow-lg">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-white">{task.title}</h4>
                        {priorityBadge(task.priority)}
                      </div>

                      {task.projectName && (
                        <p className="text-[10px] text-indigo-400 font-semibold">{task.projectName}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-slate-400 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          {task.ownerId ? (
                            <>
                              <div className="h-5 w-5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center justify-center font-bold text-[9px]">
                                {(task.ownerName || 'U').substring(0, 1).toUpperCase()}
                              </div>
                              <span className="truncate max-w-[80px]">{task.ownerName}</span>
                            </>
                          ) : (
                            <button
                              onClick={() => handleClaimTask(task)}
                              className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                            >
                              <UserPlus className="h-3 w-3" />
                              <span>👤+ Nhận làm</span>
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setActiveCommentTask(task)}
                          className="flex items-center gap-1 hover:text-indigo-400 transition-colors"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>{task.commentCount || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Comments Modal */}
      {activeCommentTask && (
        <TaskCommentModal
          task={activeCommentTask}
          currentUser={auth.user!}
          onClose={() => setActiveCommentTask(null)}
        />
      )}

      {/* Update Progress Modal */}
      {updateTaskModal && (
        <UpdateTaskProgressModal
          currentUser={auth.user!}
          task={updateTaskModal}
          onClose={() => setUpdateTaskModal(null)}
          onSuccess={() => {
            setUpdateTaskModal(null);
            fetchTasks();
          }}
        />
      )}

      {/* Global Fixed Floating Popover (Zero Clipping Guaranteed) */}
      {activePopover && (
        <div
          className="fixed z-[9999] w-48 bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-2xl space-y-1 animate-fade-in"
          style={{
            top: activePopover.coords.top !== undefined ? `${activePopover.coords.top}px` : undefined,
            bottom: activePopover.coords.bottom !== undefined ? `${activePopover.coords.bottom}px` : undefined,
            left: `${activePopover.coords.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const targetTask = tasks.find((t) => t.id === activePopover.taskId);
            if (!targetTask) return null;

            if (activePopover.type === 'priority') {
              return (
                <>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2 py-1">Đổi mức ưu tiên</p>
                  <button onClick={() => handleUpdatePriority(targetTask, 'high')} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-red-400 flex items-center gap-2">🔴 Khẩn cấp</button>
                  <button onClick={() => handleUpdatePriority(targetTask, 'medium')} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-amber-400 flex items-center gap-2">🟡 Cao</button>
                  <button onClick={() => handleUpdatePriority(targetTask, 'low')} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-semibold text-blue-400 flex items-center gap-2">🔵 Bình thường</button>
                </>
              );
            } else {
              return (
                <>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider px-2 py-1">Chuyển trạng thái</p>
                  <button onClick={() => handleUpdateStatus(targetTask, 'todo')} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-2">🔘 VIỆC CẦN LÀM</button>
                  <button onClick={() => handleUpdateStatus(targetTask, 'in_progress')} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-blue-400 flex items-center gap-2">🔵 ĐANG LÀM</button>
                  <button onClick={() => handleUpdateStatus(targetTask, 'done')} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-xs font-bold text-emerald-400 flex items-center gap-2">✅ HOÀN THÀNH</button>
                  {targetTask.status === 'todo' && (
                    <>
                      <div className="my-1 border-t border-slate-800" />
                      <button onClick={() => handleArchiveTask(targetTask)} className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 text-xs font-bold text-red-400 flex items-center gap-2">
                        <Trash2 className="h-3.5 w-3.5" /> Xóa task
                      </button>
                    </>
                  )}
                </>
              );
            }
          })()}
        </div>
      )}
    </div>
  );
}
