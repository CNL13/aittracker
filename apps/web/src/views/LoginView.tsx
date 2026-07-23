/* eslint-disable */
// @ts-nocheck
import React, { useState } from 'react';
import {
  User as UserIcon, Users, Lock, Unlock, KeyRound, LogOut, Plus, Edit2, RefreshCw, Search, Filter, Check,
  AlertTriangle, Copy, History, Laptop, Smartphone, ChevronLeft, ChevronRight, Shield, Loader2, CheckCircle2,
  UserCheck, Briefcase, X, UserCog, CircleDot, LayoutDashboard, Mail, ListTodo, CalendarDays, Bell, FileText,
  Trash2, MessageSquare, Calendar, Flag, Tag, Layers, ChevronDown, Clock, Paperclip, AtSign, Smile, Send,
  MoreHorizontal, MoreVertical, CheckSquare, Eye, ShieldCheck
} from 'lucide-react';
import {
  User, Task, TaskStatus, TaskPriority, TaskBlocker, TaskMember, AuthSession, AuthContextType, Project, ProjectMember
} from '../types';

export default function LoginView({ login }: { login: AuthContextType['login'] }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await login(username, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative z-10 animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
            <span className="text-2xl font-extrabold text-white">A</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">AIT Work Tracker</h2>
          <p className="text-xs text-slate-400 mt-1.5 text-center">Đăng nhập hệ thống giám sát tiến độ nghiên cứu</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors"
              placeholder="Nhập tên đăng nhập..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 transition-colors"
              placeholder="Nhập mật khẩu..."
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

