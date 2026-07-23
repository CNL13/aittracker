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

export default function TaskCommentModal({
  task,
  currentUser,
  onClose,
}: {
  task: any;
  currentUser: any;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/comments/list?taskId=${task.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSend = async () => {
    if (!content.trim()) return;
    try {
      setSending(true);
      const res = await fetch('/api/tasks/comments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, content: content.trim() }),
      });
      if (res.ok) {
        setContent('');
        fetchComments();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 animate-fade-in flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white truncate max-w-[320px]">
              Bình luận: {task.title}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 min-h-[200px]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-400" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Chưa có bình luận nào cho công việc này. Hãy là người đầu tiên trao đổi!
            </div>
          ) : (
            comments.map((c) => {
              const isMe = c.senderId === currentUser.id;
              return (
                <div key={c.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl ${isMe ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-slate-800/60 border border-slate-700/60'}`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-[11px] font-bold text-indigo-300">{c.senderName}</span>
                      <span className="text-[9px] text-slate-500">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">{c.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-800 shrink-0 space-y-2">
          <div className="flex gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Comment or type '/' for commands and AI actions..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSend}
              disabled={sending || !content.trim()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 shrink-0 flex items-center gap-1.5"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



