/* eslint-disable */
// @ts-nocheck
import React from 'react';
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

export default function KanbanBoard({ tasks, members, isAdmin, isLocked, onTaskEdit, onStatusChange, currentUserId }: {
  tasks: Task[],
  members: ProjectMember[],
  isAdmin: boolean,
  isLocked: boolean,
  onTaskEdit: (task: Task) => void,
  onStatusChange: (task: Task, newStatus: TaskStatus | 'blocked') => void,
  currentUserId: string
}) {
  const columns = [
    { id: 'todo', title: 'Cần làm', color: 'slate', dot: 'bg-slate-400' },
    { id: 'in_progress', title: 'Đang làm', color: 'indigo', dot: 'bg-indigo-500' },
    { id: 'waiting', title: 'Đang chờ', color: 'amber', dot: 'bg-amber-500' },
    { id: 'blocked', title: 'Vướng mắc', color: 'red', dot: 'bg-red-500' },
    { id: 'done', title: 'Hoàn thành', color: 'emerald', dot: 'bg-emerald-500' },
  ];

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('originalStatus', task.status);
    e.dataTransfer.setData('originalBlockersCount', String(task.openBlockersCount || 0));
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const originalStatus = e.dataTransfer.getData('originalStatus') as TaskStatus;
    const originalBlockersCount = parseInt(e.dataTransfer.getData('originalBlockersCount') || '0', 10);

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentColumn = originalBlockersCount > 0 ? 'blocked' : originalStatus;
    if (colId === currentColumn) return;

    onStatusChange(task, colId as any);
  };

  return (
    <div className="flex gap-5 overflow-x-auto pb-6 select-none">
      {columns.map(col => {
        const colTasks = tasks.filter(t => {
          if (col.id === 'blocked') return (t.openBlockersCount || 0) > 0;
          if ((t.openBlockersCount || 0) > 0) return false;
          return t.status === col.id;
        });

        return (
          <div
            key={col.id}
            className="w-76 shrink-0 bg-slate-900/40 border border-slate-800 rounded-3xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-md"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">{col.title}</h4>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800">
                {colTasks.length}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3.5 min-h-[450px]">
              {colTasks.map(task => {
                const projectMember = members.find(m => m.userId === currentUserId);
                const isManager = projectMember?.projectRole === 'manager';
                const isTaskOwner = task.ownerId === currentUserId;
                const canDrag = isAdmin || isManager || isTaskOwner;

                const taskOwner = members.find(m => m.userId === task.ownerId);

                return (
                  <div
                    key={task.id}
                    draggable={canDrag && !isLocked}
                    onDragStart={e => handleDragStart(e, task)}
                    onClick={() => onTaskEdit(task)}
                    className={`bg-slate-950/80 hover:bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 hover:border-indigo-500/50 shadow-lg transition-all duration-300 flex flex-col gap-2 relative group ${canDrag && !isLocked ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                      }`}
                  >
                    <div className="font-semibold text-slate-200 text-sm leading-snug group-hover:text-indigo-400 transition-colors">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center gap-2 pt-2.5 mt-1 border-t border-slate-900/80">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold capitalize border ${task.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          task.priority === 'medium' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                          {task.priority === 'high' ? 'Cao' : task.priority === 'medium' ? 'T.Bình' : 'Thấp'}
                        </span>

                        {task.openBlockersCount && task.openBlockersCount > 0 ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-[9px] font-bold text-red-400">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {task.openBlockersCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {taskOwner && (
                          <div
                            className="h-5 w-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-[9px] font-bold"
                            title={taskOwner.fullName}
                          >
                            {taskOwner.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

