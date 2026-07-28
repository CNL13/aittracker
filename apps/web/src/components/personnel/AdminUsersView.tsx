/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import SessionManagerModal from './SessionManagerModal';
import { PasswordChangeForm } from '../../views/ChangePasswordView';
import { cachedFetch, readCachedData, refreshCachedData, subscribeCache } from '../../utils/apiCache';
import { useAppRefresh } from '../../hooks/useAppRefresh';

export default function AdminUsersView({ auth }: { auth: AuthContextType }) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handler);
  }, [search]);

  const usersUrl = useMemo(() => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      role,
      status,
      page: page.toString(),
      limit: limit.toString(),
    });
    return `/api/users/list?${params}`;
  }, [debouncedSearch, role, status, page]);

  // Modals state
  const [createModal, setCreateModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [passwordModal, setPasswordModal] = useState(false);

  // Temp Password reveal state
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Fetch Users function
  const fetchUsers = useCallback(async (force = false) => {
    const cached = readCachedData(usersUrl);
    setLoading(!cached);
    try {
      const data = force
        ? await refreshCachedData(usersUrl)
        : await cachedFetch(usersUrl, 30 * 1000);
      setUsersList(data.users || []);
      setTotalUsers(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [usersUrl]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    return subscribeCache(usersUrl, (data) => {
      setUsersList(data.users || []);
      setTotalUsers(data.total || 0);
    });
  }, [usersUrl]);

  useAppRefresh(() => fetchUsers(true), { minIntervalMs: 6000 });

  // Handle Create User
  const [createForm, setCreateForm] = useState({
    username: '',
    fullName: '',
    email: '',
    department: '',
    position: '',
    role: 'member' as 'admin' | 'member',
  });
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username.trim() || !createForm.fullName.trim()) {
      setCreateError('Vui lòng điền Username và Họ tên.');
      return;
    }
    setCreateError(null);
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: createForm.username,
          fullName: createForm.fullName,
          email: createForm.email || null,
          role: createForm.role,
          department: createForm.department || null,
          position: createForm.position || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTempPassword(data.temporaryPassword || data.tempPassword);
        fetchUsers(true);
        // Clear create form
        setCreateForm({ username: '', fullName: '', email: '', department: '', position: '', role: 'member' });
      } else {
        setCreateError(data.error || 'Không thể tạo thành viên.');
      }
    } catch {
      setCreateError('Không thể kết nối máy chủ.');
    }
  };

  // Handle Edit User
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    department: '',
    position: '',
  });
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (editUser) {
      setEditForm({
        fullName: editUser.fullName,
        email: editUser.email || '',
        department: editUser.department || editUser.unit || '',
        position: editUser.position || editUser.title || '',
      });
    }
  }, [editUser]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!editForm.fullName.trim()) {
      setEditError('Họ tên không được để trống.');
      return;
    }
    setEditError(null);
    try {
      const isSelf = editUser.id === auth?.user?.id;
      if (isSelf) {
        // Member tự sửa thông tin của chính mình
        const res = await fetch('/api/users/update-self', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: editForm.fullName,
            email: editForm.email || null,
            department: editForm.department || null,
            position: editForm.position || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setEditUser(null);
          fetchUsers(true);
        } else {
          setEditError(data.error || 'Cập nhật thất bại.');
        }
      } else {
        // Admin sửa thông tin người khác
        const res = await fetch('/api/users/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editUser.id,
            fullName: editForm.fullName,
            email: editForm.email || null,
            department: editForm.department || null,
            position: editForm.position || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setEditUser(null);
          fetchUsers(true);
        } else {
          setEditError(data.error || 'Cập nhật thất bại.');
        }
      }
    } catch {
      setEditError('Lỗi kết nối.');
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (user: User, nextStatus: User['status']) => {
    const actionText = nextStatus === 'active' ? 'mở khóa' : nextStatus === 'locked' ? 'khóa' : 'vô hiệu hóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} thành viên này?`)) return;

    try {
      const res = await fetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchUsers(true);
      } else {
        alert(data.error || 'Thao tác trạng thái thất bại.');
      }
    } catch {
      alert('Không thể kết nối máy chủ.');
    }
  };

  // Handle Reset Password
  const handleResetPassword = async (user: User) => {
    if (!window.confirm(`Mật khẩu cũ của ${user.fullName} sẽ bị hủy và thay bằng mật khẩu tạm. Tiếp tục?`)) return;
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetUser(user);
        setTempPassword(data.temporaryPassword || data.tempPassword);
        fetchUsers(true);
      } else {
        alert(data.error || 'Reset mật khẩu thất bại.');
      }
    } catch {
      alert('Lỗi kết nối.');
    }
  };

  const totalPages = Math.ceil(totalUsers / limit);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Danh sách nhân sự</h2>
          <p className="text-xs text-slate-400 mt-1">Quản lý hồ sơ, nhóm, tài khoản và mật khẩu nhân sự</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => setPasswordModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <KeyRound className="h-4 w-4" /> Đổi mật khẩu của tôi
          </button>
          <button
            onClick={() => {
              setCreateModal(true);
              setTempPassword(null);
              setCreateError(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/10"
          >
            <Plus className="h-4 w-4" /> Thêm nhân sự
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row gap-4 items-center">
        {/* Search */}
        <div className="w-full sm:flex-1 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên, username, email hoặc nhóm..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
        </div>

        {/* Role Filter */}
        <div className="w-full sm:w-40 relative">
          <Filter className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer appearance-none"
          >
            <option value="">Tất cả Vai trò</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="member">Nhân sự (Member)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-40 relative">
          <CircleDot className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-500" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer appearance-none"
          >
            <option value="">Tất cả Trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khóa</option>
            <option value="inactive">Vô hiệu hóa</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Họ tên</th>
                <th className="py-4 px-4">Vai trò / loại</th>
                <th className="py-4 px-4">Nhóm</th>
                <th className="py-4 px-4">Email</th>
                <th className="py-4 px-4">Trạng thái</th>
                <th className="py-4 px-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto mb-2" />
                    <span>Đang tải danh sách nhân sự...</span>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Không tìm thấy nhân sự nào phù hợp.
                  </td>
                </tr>
              ) : (
                usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-300 font-bold shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            user.fullName.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">{user.fullName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${user.role === 'admin'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                          {user.role === 'admin' ? 'Admin/Sếp' : 'Nhân sự'}
                        </span>
                        <div className="text-[10px] text-slate-500">{user.position || 'Chưa có loại/chức vụ'}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">{user.department || 'Chưa phân nhóm'}</td>
                    <td className="py-4 px-4 text-slate-400">{user.email || '-'}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${user.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : user.status === 'locked'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-400' : user.status === 'locked' ? 'bg-amber-400' : 'bg-red-400'
                          }`}></span>
                        {user.status === 'active' ? 'Hoạt động' : user.status === 'locked' ? 'Bị khóa' : 'Vô hiệu hóa'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-1 whitespace-nowrap">
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditUser(user);
                          setEditError(null);
                        }}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Chỉnh sửa hồ sơ"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Sessions query */}
                      <button
                        onClick={() => setSessionUser(user)}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Quản lý phiên"
                      >
                        <History className="h-3.5 w-3.5" />
                      </button>

                      {/* Reset password */}
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Khởi tạo lại mật khẩu"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>

                      {/* Unlock if locked */}
                      {user.status === 'locked' && (
                        <button
                          onClick={() => handleToggleStatus(user, 'active')}
                          className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors"
                          title="Mở khóa tài khoản"
                        >
                          <Unlock className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Disable status */}
                      {user.status === 'active' && (
                        <button
                          onClick={() => handleToggleStatus(user, 'inactive')}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                          title="Khóa/Vô hiệu hóa"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Activate status if inactive */}
                      {user.status === 'inactive' && (
                        <button onClick={() => handleToggleStatus(user, "active")} className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 transition-colors" title="Kích hoạt"><Check className="h-3.5 w-3.5" /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-800/80 px-5 py-4 flex justify-between items-center bg-slate-900/10">
            <span className="text-xs text-slate-400">
              Trang {page} / {totalPages} (Tổng số {totalUsers} nhân sự)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30 disabled:hover:text-slate-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SELF PASSWORD MODAL */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-5 w-5 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Đổi mật khẩu của tôi</h3>
                  <p className="text-[10px] text-slate-400">Chỉ thay đổi mật khẩu tài khoản đang đăng nhập.</p>
                </div>
              </div>
              <button onClick={() => setPasswordModal(false)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>
            <PasswordChangeForm auth={auth} compact onSuccess={() => setPasswordModal(false)} />
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {createModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Thêm thành viên mới</h3>
              </div>
              <button onClick={() => setCreateModal(false)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {tempPassword ? (
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 text-center space-y-4">
                <div className="h-10 w-10 bg-indigo-500/15 rounded-full flex items-center justify-center text-indigo-400 mx-auto">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-200 text-sm">Thành viên đã được khởi tạo thành công!</h4>
                  <p className="text-xs text-slate-500 mt-1">Dưới đây là mật khẩu tạm thời (Chỉ hiển thị một lần duy nhất):</p>
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl max-w-xs mx-auto">
                  <span className="font-mono text-sm font-bold text-white selection:bg-indigo-500">{tempPassword}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      alert('Đã sao chép mật khẩu tạm.');
                    }}
                    className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copy mật khẩu"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  onClick={() => setCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold"
                >
                  Hoàn tất & đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Username</label>
                    <input
                      type="text"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      placeholder="vd: nguyenvana"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Vai trò</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value === 'admin' ? 'admin' : 'member' })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                    >
                      <option value="member">Thành viên (Member)</option>
                      <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Họ và tên</label>
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    placeholder="Nhập họ và tên..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nhóm</label>
                    <input
                      type="text"
                      value={createForm.department}
                      onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                      placeholder="vd: Phòng nghiên cứu"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Loại nhân sự / chức vụ</label>
                    <input
                      type="text"
                      value={createForm.position}
                      onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })}
                      placeholder="vd: Thực tập sinh"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Địa chỉ Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="nguyenvana@example.com (Tùy chọn)"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => setCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10"
                  >
                    Tạo thành viên
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <UserCog className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Chỉnh sửa thông tin</h3>
              </div>
              <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Username (Không thể sửa)</label>
                <input
                  type="text"
                  value={editUser.username}
                  disabled
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-900 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Họ và tên</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Nhập họ và tên..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Nhập địa chỉ Email..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Nhóm</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    placeholder="vd: Phòng nghiên cứu"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Loại nhân sự / chức vụ</label>
                  <input
                    type="text"
                    value={editForm.position}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    placeholder="vd: Thực tập sinh"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD TEMP POPUP */}
      {resetUser && tempPassword && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in text-center space-y-4">
            <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-400 mx-auto">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Reset mật khẩu cho {resetUser.fullName}</h3>
              <p className="text-xs text-slate-500 mt-1">Dưới đây là mật khẩu tạm thời mới. Thành viên sẽ phải đổi mật khẩu sau khi đăng nhập.</p>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl max-w-xs mx-auto">
              <span className="font-mono text-sm font-bold text-white selection:bg-indigo-500">{tempPassword}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  alert('Đã sao chép mật khẩu tạm.');
                }}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Copy mật khẩu"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => {
                setResetUser(null);
                setTempPassword(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold"
            >
              Đóng lại
            </button>
          </div>
        </div>
      )}

      {/* SESSIONS MODAL */}
      {sessionUser && (
        <SessionManagerModal user={sessionUser} onClose={() => setSessionUser(null)} />
      )}
    </div>
  );
}

