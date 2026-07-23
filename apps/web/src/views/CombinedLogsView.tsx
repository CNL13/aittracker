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
import EmailLogView from '../app/EmailLogView';
import AuditLogView from '../app/AuditLogView';

export default function CombinedLogsView({ auth }: { auth: AuthContextType }) {
  const [activeTab, setActiveTab] = useState<'email' | 'audit'>('email');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📋 Nhật ký hệ thống</h2>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-0">
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors ${activeTab === 'email'
            ? 'bg-indigo-600/10 border border-b-0 border-indigo-500/20 text-indigo-400'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          📧 Nhật ký Email
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-colors ${activeTab === 'audit'
            ? 'bg-indigo-600/10 border border-b-0 border-indigo-500/20 text-indigo-400'
            : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          🔍 Nhật ký Audit
        </button>
      </div>

      {activeTab === 'email' ? (
        <EmailLogView auth={auth} />
      ) : (
        <AuditLogView auth={auth} />
      )}
    </div>
  );
}

