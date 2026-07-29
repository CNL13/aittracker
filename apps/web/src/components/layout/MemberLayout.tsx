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

export default function MemberLayout({ auth, children }: { auth: AuthContextType; children: React.ReactNode }) {
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
      {/* Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="font-extrabold text-white text-lg">A</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">AIT Tracker</h1>
              <p className="text-[10px] text-slate-400">He thong giam sat tien do nghien cuu</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800">
              <UserIcon className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-300">{auth.user?.fullName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 capitalize">
                {auth.user?.role}
              </span>
            </div>
            <NotificationBell />
            <button
              onClick={() => auth.logout()}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/80 transition-colors"
              title="Dang xuat"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col md:flex-row gap-5">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-52 shrink-0 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Danh muc</div>

          <button
            onClick={() => go('/')}
            onMouseEnter={() => { import('../../views/MemberHomeView'); warmRoute('/'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname === '/'
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <UserIcon className="h-4 w-4 shrink-0" />
            Trang chu ca nhan
          </button>

          <button
            onClick={() => go('/check-in')}
            onMouseEnter={() => { import('../../app/CheckInView'); warmRoute('/check-in'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname === '/check-in'
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Nop bao cao
          </button>

          <button
            onClick={() => go('/projects')}
            onMouseEnter={() => { import('../../components/projects/ProjectsView'); warmRoute('/projects'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname.startsWith('/projects')
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <Briefcase className="h-4 w-4 shrink-0" />
            Du an cua toi
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
            Lich va cong
          </button>

          <button
            onClick={() => go('/personnel')}
            onMouseEnter={() => { import('../../components/personnel/MemberPersonnelView'); warmRoute('/personnel'); }}
            className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-medium flex items-center gap-2.5 transition-colors ${location.pathname.startsWith('/personnel')
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
              }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            Nhan su
          </button>
        </aside>

        {/* Member Content Area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-12 text-center text-xs text-slate-500">
        <p>2026 AIT Work Tracker. All rights reserved.</p>
      </footer>
    </div>
  );
}
