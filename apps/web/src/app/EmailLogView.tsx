/* eslint-disable */
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Mail, Search, RefreshCw, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';

interface NotificationLog {
  id: string;
  recipientUserId: string;
  notificationDate: string;
  notificationType: string;
  channel: string;
  status: string;
  dedupeKey: string;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  originalNotificationId: string | null;
  createdAt: string;
  sentAt: string | null;
  recipientUsername: string;
  recipientFullName: string;
  recipientEmail: string;
}

export default function EmailLogView() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [resendingId, setResendingId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status: statusFilter,
        search: search.trim(),
      });
      const res = await fetch(`/api/admin/email-log?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResend = async (logId: string) => {
    if (resendingId) return;
    setResendingId(logId);
    try {
      const res = await fetch('/api/admin/email-log/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId: logId }),
      });

      if (res.ok) {
        alert('Gửi lại email thành công!');
        fetchLogs();
      } else {
        const data = await res.json();
        alert(data.error || 'Gửi lại email thất bại.');
      }
    } catch (error) {
      alert('Lỗi kết nối khi gửi lại email.');
    } finally {
      setResendingId(null);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'blocker_alert':
        return 'Cảnh báo vướng mắc';
      case 'member_digest':
        return 'Tóm tắt thành viên';
      case 'admin_digest':
        return 'Tóm tắt hệ thống';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'skipped':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Thành công';
      case 'failed':
        return 'Thất bại';
      case 'skipped':
        return 'Bỏ qua';
      case 'pending':
        return 'Chờ gửi';
      default:
        return status;
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Mail className="h-5.5 w-5.5 text-indigo-400" />
            Nhật ký Gửi Email
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Xem lịch sử gửi email thông báo, tóm tắt và thực hiện gửi lại các email lỗi.
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
            placeholder="Tìm theo tên, email, username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/60 w-full md:w-48"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="sent">Thành công</option>
          <option value="failed">Thất bại</option>
          <option value="skipped">Bỏ qua</option>
          <option value="pending">Chờ gửi</option>
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
          <p className="text-sm text-slate-400">Đang tải nhật ký email...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-3xl">
          <Mail className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Không tìm thấy nhật ký gửi email nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-900/35 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-950/40">
                    <th className="py-4 px-6">Người nhận</th>
                    <th className="py-4 px-4">Loại thông báo</th>
                    <th className="py-4 px-4">Trạng thái</th>
                    <th className="py-4 px-4">Chi tiết lỗi</th>
                    <th className="py-4 px-4">Thời gian</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/40 text-xs">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-200 block">
                          {log.recipientFullName || 'N/A'}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          @{log.recipientUsername || 'unknown'} • {log.recipientEmail || 'no email'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-slate-300 font-medium">{getTypeLabel(log.notificationType)}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${getStatusBadge(log.status)}`}>
                          {getStatusLabel(log.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        {log.status === 'failed' ? (
                          <div>
                            <span className="text-red-400 font-semibold block text-[10px]">{log.errorCode}</span>
                            <span className="text-slate-500 block text-[10px] truncate" title={log.errorMessage || ''}>
                              {log.errorMessage}
                            </span>
                          </div>
                        ) : log.status === 'skipped' ? (
                          <span className="text-slate-500 text-[10px]">Người dùng không có cấu hình email</span>
                        ) : (
                          <span className="text-slate-500 text-[10px] font-mono">{log.providerMessageId || '-'}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        {log.status === 'failed' && (
                          <button
                            onClick={() => handleResend(log.id)}
                            disabled={resendingId === log.id}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-[10px] font-bold text-white transition-colors flex items-center gap-1.5 ml-auto"
                          >
                            <RefreshCw className={`h-3 w-3 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                            Gửi lại
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
