/* eslint-disable */
// @ts-nocheck
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import NotificationBell from './NotificationBell';
import { prefetchRouteData } from '../../utils/prefetchRoutes';

export default function AdminLayout({ auth, children }: { auth: AuthContextType; children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const warmRoute = (path: string) => prefetchRouteData(path, auth.user?.role);
  const go = (path: string) => {
    warmRoute(path);
    navigate(path);
    setTimeout(() => window.dispatchEvent(new Event('ait:app-refresh')), 0);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 flex flex-col">
      {/* Admin Topbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="font-extrabold text-white text-lg">A</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">AIT Tracker</h1>
              <p className="text-[10px] text-slate-400">Giao diện quản trị hệ thống</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">{auth.user?.fullName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize">
                {auth.user?.role}
              </span>
            </div>
            <NotificationBell />
            <button
              onClick={() => auth.logout()}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Admin Layout Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-5">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-52 shrink-0 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Danh mục</div>

          <button
            onClick={() => go('/projects')}
            onMouseEnter={() => { import('../../components/projects/ProjectsView'); warmRoute('/projects'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname.startsWith('/projects')
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            Quản lý Dự án
          </button>
          <button
            onClick={() => go('/admin/reports')}
            onMouseEnter={() => import('../../views/AdminReportsView')}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname === '/admin/reports'
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Báo cáo nhân sự
          </button>
          <button
            onClick={() => go('/tasks')}
            onMouseEnter={() => { import('../../views/MemberHomeView'); warmRoute('/tasks'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname.startsWith('/tasks')
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <ListTodo className="h-4 w-4 shrink-0" />
            Công việc
          </button>
          <button
            onClick={() => go('/admin/users')}
            onMouseEnter={() => { import('../../components/personnel/AdminUsersView'); warmRoute('/admin/users'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname === '/admin/users'
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            Nhân sự
          </button>
          <button
            onClick={() => go('/calendar')}
            onMouseEnter={() => { import('../../app/CalendarView'); warmRoute('/calendar'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname.startsWith('/calendar')
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <CalendarDays className="h-4 w-4 shrink-0" />
            Lịch &amp; công
          </button>
          <button
            onClick={() => go('/admin/logs')}
            onMouseEnter={() => { import('../../views/CombinedLogsView'); warmRoute('/admin/logs'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname === '/admin/logs'
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            📋 Nhật ký
          </button>
        </aside>


        {/* Admin Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}

