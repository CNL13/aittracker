import { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Briefcase, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2, 
  ChevronRight,
  ListTodo,
  X,
  User as UserIcon,
  Filter,
  Eye
} from 'lucide-react';
import type { Task, TaskBlocker } from '../types';
import { cachedFetch, refreshCachedData } from '../utils/apiCache';
import { useAppRefresh } from '../hooks/useAppRefresh';

export default function AdminDashboardView() {
  const [date, setDate] = useState(() => {
    // Format YYYY-MM-DD local
    const now = new Date();
    // Offset for local timezone
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  });
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);

  const [metrics, setMetrics] = useState({
    totalActiveProjects: 0,
    totalActiveTasks: 0,
    totalOpenBlockers: 0,
    totalExemptMembers: 0,
  });
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedMemberForCheckIn, setSelectedMemberForCheckIn] = useState<any | null>(null);
  const [selectedMemberForTasks, setSelectedMemberForTasks] = useState<any | null>(null);
  const [memberTasks, setMemberTasks] = useState<Task[]>([]);
  const [memberBlockers, setMemberBlockers] = useState<TaskBlocker[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    cachedFetch('/api/projects/list', 5 * 60 * 1000)
      .then(data => { if (data.projects) setProjects(data.projects); })
      .catch(console.error);
  }, []);

  const dashUrl = (() => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (projectId) params.append('projectId', projectId);
    return `/api/dashboard/metrics?${params.toString()}`;
  })();

  const fetchDashboardData = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const data = force
        ? await refreshCachedData(dashUrl)
        : await cachedFetch(dashUrl, 30 * 1000); // 30 giay
      setMetrics(data.metrics || { totalActiveProjects: 0, totalActiveTasks: 0, totalOpenBlockers: 0, totalExemptMembers: 0 });
      setMembers(data.members || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [dashUrl]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useAppRefresh(() => fetchDashboardData(true), { minIntervalMs: 20000 });

  const openTasksDrillDown = async (member: any) => {
    setSelectedMemberForTasks(member);
    setLoadingTasks(true);
    setMemberTasks([]);
    setMemberBlockers([]);
    try {
      let url = `/api/tasks/list?participantId=${member.id}`;
      if (projectId) url += `&projectId=${projectId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMemberTasks(data.tasks || []);
        setMemberBlockers(data.blockers || []); // Some endpoints might return blockers
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingTasks(false);
  };

  const STATUS_MAP = {
    red: { label: 'Đỏ: quá hạn hoặc vướng mắc', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    yellow: { label: 'Vàng: sắp đến hạn hoặc cần hỗ trợ', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    green: { label: 'Xanh: đã báo cáo', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    blue: { label: 'Miễn báo cáo', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    grey: { label: 'Thiếu báo cáo', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    none: { label: 'Không bắt buộc', color: 'bg-slate-900 text-slate-500 border-slate-800' },
    orange: { label: 'Chưa báo cáo', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  } as Record<string, { label: string; color: string } | undefined>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Bảng điều khiển</h2>
          <p className="text-xs text-slate-400 mt-1">Tổng quan tình hình dự án và báo cáo</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 appearance-none"
            >
              <option value="">Tất cả dự án</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 sm:w-40">
            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60"
            />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Dự án đang chạy', value: metrics.totalActiveProjects, icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          { title: 'Task đang làm', value: metrics.totalActiveTasks, icon: ListTodo, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { title: 'Vướng mắc mở', value: metrics.totalOpenBlockers, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
          { title: 'Thành viên miễn BC', value: metrics.totalExemptMembers, icon: ShieldCheck, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
        ].map((item, idx) => (
          <div key={idx} className={`glass-panel p-5 rounded-2xl border ${item.border} hover:scale-[1.02] transition-transform duration-200 group relative overflow-hidden`}>
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${item.bg} rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{item.title}</p>
                <div className="text-3xl font-extrabold text-white">{item.value}</div>
              </div>
              <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Members Grid/Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex justify-between items-center">
          <h3 className="font-semibold text-white">Tình trạng Báo cáo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 bg-slate-900/20 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Thành viên</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Task đang làm</th>
                <th className="py-3 px-4">Vướng mắc</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto mb-2" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Không có dữ liệu thành viên
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const statusInfo = (STATUS_MAP[member.statusColor] || STATUS_MAP.orange)!;
                  return (
                    <tr key={member.id} className="hover:bg-slate-900/40 transition-colors cursor-pointer" onClick={() => openTasksDrillDown(member)}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                            {member.avatarUrl ? (
                              <img src={member.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              <UserIcon className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200">{member.fullName}</div>
                            <div className="text-[10px] text-slate-500">@{member.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusInfo?.color || ''}`}>
                          {statusInfo?.label || ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">{member.activeTasksCount || member.activeTaskCount || 0}</td>
                      <td className="py-3 px-4">
                        {(member.openBlockersCount || member.openBlockerCount || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            <AlertTriangle className="h-3.5 w-3.5" /> {member.openBlockersCount || member.openBlockerCount}
                          </span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedMemberForCheckIn(member); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Xem chi tiết báo cáo</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-In Modal */}
      {selectedMemberForCheckIn && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-slate-800 shadow-2xl animate-fade-in space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">Chi tiết Báo cáo</h3>
                <p className="text-xs text-slate-400">{selectedMemberForCheckIn.fullName} - {date}</p>
              </div>
              <button onClick={() => setSelectedMemberForCheckIn(null)} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-500 hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Tóm tắt công việc</h4>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{selectedMemberForCheckIn.checkInDetails?.summary || 'Không có nội dung'}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Thời gian đã tiêu tốn</h4>
                <p className="text-sm text-slate-200">{selectedMemberForCheckIn.checkInDetails?.timeSpent || '0h'}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Kế hoạch ngày mai</h4>
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{selectedMemberForCheckIn.checkInDetails?.plan || 'Không có kế hoạch'}</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-1">Cần hỗ trợ</h4>
                <p className="text-sm text-amber-400 whitespace-pre-wrap">{selectedMemberForCheckIn.checkInDetails?.helpNeeded || 'Không'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drill-down Tasks Modal */}
      {selectedMemberForTasks && (
        <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-start justify-end">
          <div className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 shadow-2xl animate-slide-left flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
              <div>
                <h3 className="text-lg font-bold text-white">Công việc hiện tại</h3>
                <p className="text-xs text-slate-400">{selectedMemberForTasks.fullName}</p>
              </div>
              <button onClick={() => setSelectedMemberForTasks(null)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loadingTasks ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-500">
                  <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mb-2" />
                  <span className="text-sm">Đang tải danh sách...</span>
                </div>
              ) : (
                <>
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Danh sách Tasks ({memberTasks.length})</h4>
                  {memberTasks.length === 0 ? (
                    <p className="text-sm text-slate-500">Không có task nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {memberTasks.map(task => (
                        <div key={task.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
                          <h5 className="text-sm font-semibold text-slate-200 mb-2">{task.title}</h5>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase">{task.status.replace('_', ' ')}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              task.priority === 'high' ? 'bg-red-500/10 text-red-400' :
                              task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-emerald-500/10 text-emerald-400'
                            }`}>{task.priority}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${task.percentComplete || 0}%` }}></div>
                          </div>
                          <div className="text-right text-[10px] text-slate-400 mt-1">{task.percentComplete || 0}%</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {memberBlockers.length > 0 && (
                    <>
                      <h4 className="text-xs font-bold text-red-400 uppercase mt-6 mb-2">Blockers Mở ({memberBlockers.length})</h4>
                      <div className="space-y-3">
                        {memberBlockers.map(blocker => (
                          <div key={blocker.id} className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                            <p className="text-sm text-red-400">{blocker.description}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
