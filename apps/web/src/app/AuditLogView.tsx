/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, RefreshCw, ChevronLeft, ChevronRight, Loader2, Eye, EyeOff } from 'lucide-react';

interface AuditLog {
  id: string;
  actorId: string;
  actorType: 'user' | 'system';
  entityType: string;
  entityId: string;
  action: string;
  oldValues: any | null;
  newValues: any | null;
  createdAt: string;
  actorUsername: string | null;
  actorFullName: string | null;
}

export default function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        action: actionFilter,
        entityType: entityFilter,
        search: search.trim(),
      });
      const res = await fetch(`/api/admin/audit?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'login': return 'Đăng nhập';
      case 'logout': return 'Đăng xuất';
      case 'create_user': return 'Tạo tài khoản';
      case 'update_user': return 'Cập nhật tài khoản';
      case 'reset_password': return 'Đặt lại mật khẩu';
      case 'change_password': return 'Đổi mật khẩu';
      case 'create_project': return 'Tạo dự án';
      case 'update_project': return 'Cập nhật dự án';
      case 'archive_project': return 'Lưu trữ dự án';
      case 'create_task': return 'Tạo công việc';
      case 'update_task': return 'Cập nhật công việc';
      case 'archive_task': return 'Lưu trữ công việc';
      case 'create_blocker': return 'Báo cáo vướng mắc';
      case 'resolve_blocker': return 'Giải quyết vướng mắc';
      case 'dismiss_blocker': return 'Hủy bỏ vướng mắc';
      case 'create_absence': return 'Đăng ký nghỉ/vắng';
      case 'delete_absence': return 'Xóa đăng ký nghỉ/vắng';
      case 'create_non_working_day': return 'Thêm ngày nghỉ lễ';
      case 'delete_non_working_day': return 'Xóa ngày nghỉ lễ';
      case 'submit_checkin': return 'Nộp check-in';
      case 'update_checkin': return 'Sửa check-in';
      default: return action;
    }
  };

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'user': return 'Thành viên';
      case 'project': return 'Dự án';
      case 'task': return 'Công việc';
      case 'task_blocker': return 'Vướng mắc';
      case 'user_absence': return 'Lịch vắng';
      case 'non_working_days': return 'Ngày nghỉ lễ';
      case 'daily_checkins': return 'Check-in';
      default: return type;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="h-5.5 w-5.5 text-indigo-400" />
            Nhật ký Hoạt động (Audit Log)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi mọi hoạt động thay đổi cấu hình, thông tin và nghiệp vụ của hệ thống (Bất biến và Chỉ đọc).
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Tìm theo tên người thực hiện hoặc hành động..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 w-full md:w-48"
        >
          <option value="">Tất cả hành động</option>
          <option value="login">Đăng nhập</option>
          <option value="create_user">Tạo tài khoản</option>
          <option value="update_user">Cập nhật tài khoản</option>
          <option value="reset_password">Đặt lại mật khẩu</option>
          <option value="create_project">Tạo dự án</option>
          <option value="create_task">Tạo công việc</option>
          <option value="create_blocker">Báo cáo vướng mắc</option>
          <option value="resolve_blocker">Giải quyết vướng mắc</option>
          <option value="submit_checkin">Nộp check-in</option>
        </select>

        <select
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 w-full md:w-48"
        >
          <option value="">Tất cả đối tượng</option>
          <option value="user">Thành viên</option>
          <option value="project">Dự án</option>
          <option value="task">Công việc</option>
          <option value="task_blocker">Vướng mắc</option>
          <option value="daily_checkins">Check-in</option>
        </select>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Logs Table */}
      {loading && logs.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/10 border border-slate-800 rounded-3xl">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Đang tải nhật ký hoạt động...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <Shield className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Không tìm thấy nhật ký hoạt động nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/35 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40">
                    <th className="py-4 px-6">Người thực hiện</th>
                    <th className="py-4 px-4">Hành động</th>
                    <th className="py-4 px-4">Đối tượng</th>
                    <th className="py-4 px-4">Thời gian</th>
                    <th className="py-4 px-6 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-xs">
                  {logs.map(log => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <>
                        <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                          <td className="py-4 px-6">
                            {log.actorType === 'system' ? (
                              <span className="font-semibold text-amber-400">Hệ thống (System)</span>
                            ) : (
                              <div>
                                <span className="font-semibold text-slate-200 block">
                                  {log.actorFullName || 'N/A'}
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  @{log.actorUsername || 'unknown'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 font-semibold text-indigo-400">
                            {getActionLabel(log.action)}
                          </td>
                          <td className="py-4 px-4 text-slate-300">
                            {getEntityLabel(log.entityType)}
                            <span className="text-[9px] font-mono text-slate-500 block">{log.entityId}</span>
                          </td>
                          <td className="py-4 px-4 text-slate-400">
                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1 text-[10px] font-bold border border-slate-800"
                            >
                              {isExpanded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              {isExpanded ? 'Ẩn' : 'Xem'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-950/40">
                            <td colSpan={5} className="py-4 px-6 border-t border-slate-900/65">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dữ liệu trước thay đổi (Old Values)</div>
                                  {log.oldValues ? (
                                    <pre className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-[10px] font-mono text-slate-400 overflow-x-auto max-h-40">
                                      {JSON.stringify(log.oldValues, null, 2)}
                                    </pre>
                                  ) : (
                                    <span className="text-slate-500 italic">Không có dữ liệu</span>
                                  )}
                                </div>
                                <div>
                                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Dữ liệu sau thay đổi (New Values)</div>
                                  {log.newValues ? (
                                    <pre className="p-3 bg-slate-950 border border-slate-900 rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40">
                                      {JSON.stringify(log.newValues, null, 2)}
                                    </pre>
                                  ) : (
                                    <span className="text-slate-500 italic">Không có dữ liệu</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center bg-slate-900/10 px-4 py-3 rounded-xl border border-slate-800/60">
            <span className="text-xs text-slate-400">
              Hiển thị {logs.length} / {total} dòng
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-opacity"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-300 font-semibold px-3 flex items-center">
                Trang {page} / {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-opacity"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
