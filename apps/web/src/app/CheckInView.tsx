/* eslint-disable */
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  CheckCircle2, AlertTriangle, Save, X, Search, 
  Calendar as CalendarIcon, Edit, ChevronLeft, ChevronRight, 
  Filter, AlertCircle, User as UserIcon, HelpCircle, Check, Eye, Maximize2, Minimize2, CalendarDays, Plus, Trash2, FileText
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  status: string;
  role: 'owner' | 'admin' | 'collaborator' | 'reviewer';
}

interface CustomTask {
  id: string;
  title: string;
  hasBlocker: boolean;
  blockerDetails: string;
}

interface CheckInContext {
  isExempt: boolean;
  isNonWorkingDay: boolean;
  existingCheckIn: any | null;
  activeTasks: Task[];
  hasScheduleToday?: boolean;
}

export default function CheckInView({ auth }: { auth: any }) {
  const isAdmin = auth?.user?.role === 'admin';
  
  // Tabs & Form collapse state
  const [context, setContext] = useState<CheckInContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  
  // Form State (Member only)
  const [noActivity, setNoActivity] = useState(false);
  const [noActivityReason, setNoActivityReason] = useState('');

  // Direct Work Items (Nhập công việc đã làm)
  const [customTasks, setCustomTasks] = useState<CustomTask[]>([
    { id: '1', title: '', hasBlocker: false, blockerDetails: '' }
  ]);
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Calendar Matrix State
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [filterDept, setFilterDept] = useState('');
  
  // Detail Modal State
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);
  const [viewingUser, setViewingUser] = useState<any | null>(null);
  const [viewingDate, setViewingDate] = useState<string>('');

  // Calculate 7 days of the selected week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday
    const distanceToMon = (currentDay === 0 ? -6 : 1 - currentDay) + weekOffset * 7;
    
    const mon = new Date(today);
    mon.setDate(today.getDate() + distanceToMon);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      const isoStr = d.toISOString().split('T')[0];
      const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      days.push({
        dateStr: isoStr,
        dayName: dayNames[d.getDay()],
        dayNum: `${d.getDate()}/${d.getMonth() + 1}`,
        isToday: isoStr === new Date().toISOString().split('T')[0]
      });
    }
    return days;
  }, [weekOffset]);

  // Fetch Member Context (Form data)
  const fetchContext = async () => {
    try {
      setLoadingContext(true);
      const res = await fetch('/api/checkins/context');
      if (res.ok) {
        const data = await res.json();
        setContext(data);
        if (data.existingCheckIn) {
          prefillForm(data.existingCheckIn);
          setIsFormCollapsed(true); // Auto-collapse if already submitted today
        } else {
          loadDraft();
          setIsFormCollapsed(false);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContext(false);
    }
  };

  // Fetch Calendar Matrix Data & Users List
  const fetchMatrixData = async () => {
    setMatrixLoading(true);
    try {
      const startDate = weekDays[0].dateStr;
      const endDate = weekDays[6].dateStr;
      
      const [histRes, userRes] = await Promise.all([
        fetch(`/api/checkins/history?startDate=${startDate}&endDate=${endDate}&limit=500`),
        fetch('/api/users/list?limit=100&status=active')
      ]);

      if (histRes.ok) {
        const hData = await histRes.json();
        setMatrixData(Array.isArray(hData) ? hData : hData.data || []);
      }
      if (userRes.ok) {
        const uData = await userRes.json();
        setUsersList(uData.users || []);
      }
    } catch (e) {
      console.error('Fetch matrix error:', e);
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    fetchContext();
  }, []);

  useEffect(() => {
    fetchMatrixData();
  }, [weekDays]);

  const prefillForm = (data: any) => {
    setNoActivity(data.noActivity || false);
    setNoActivityReason(data.noActivityReason || '');
    
    // Parse summaryToday into customTasks list if available
    if (data.summaryToday) {
      const lines = data.summaryToday.split('\n').filter((l: string) => l.trim().length > 0);
      const parsedItems: CustomTask[] = [];
      lines.forEach((line: string, idx: number) => {
        let cleanText = line.replace(/^[•\-\*]\s*/, '').trim();
        let hasBlocker = false;
        let blockerDetails = '';
        const blockerMatch = cleanText.match(/\(🚨\s*Vướng mắc:\s*(.*?)\)/i) || cleanText.match(/\(🚨\s*(.*?)\)/i);
        if (blockerMatch) {
          hasBlocker = true;
          blockerDetails = blockerMatch[1].trim();
          cleanText = cleanText.replace(/\(🚨.*?\)/i, '').trim();
        }
        if (cleanText && !cleanText.startsWith('[Công việc đã làm]')) {
          parsedItems.push({
            id: (idx + 1).toString(),
            title: cleanText,
            hasBlocker,
            blockerDetails
          });
        }
      });

      if (parsedItems.length > 0) {
        setCustomTasks(parsedItems);
      }
    }
  };

  const loadDraft = () => {
    if (!auth?.user?.id) return;
    const draftStr = localStorage.getItem(`checkin_draft_${auth.user.id}`);
    if (draftStr) {
      try {
        const draft = JSON.parse(draftStr);
        setNoActivity(draft.noActivity || false);
        setNoActivityReason(draft.noActivityReason || '');
        if (draft.customTasks && Array.isArray(draft.customTasks) && draft.customTasks.length > 0) {
          setCustomTasks(draft.customTasks);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (!isAdmin && !context?.existingCheckIn && auth?.user?.id) {
      const draft = {
        noActivity, noActivityReason, customTasks
      };
      localStorage.setItem(`checkin_draft_${auth.user.id}`, JSON.stringify(draft));
    }
  }, [noActivity, noActivityReason, customTasks, context, auth?.user?.id, isAdmin]);

  // Add work item
  const addCustomTask = () => {
    setCustomTasks(prev => [
      ...prev,
      { id: Date.now().toString(), title: '', hasBlocker: false, blockerDetails: '' }
    ]);
  };

  // Remove work item
  const removeCustomTask = (id: string) => {
    setCustomTasks(prev => prev.length > 1 ? prev.filter(t => t.id !== id) : prev);
  };

  // Update work item
  const updateCustomTask = (id: string, field: keyof CustomTask, val: any) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const validCustomTasks = customTasks.filter(ct => ct.title.trim().length > 0);
    
    if (!noActivity && validCustomTasks.length === 0) {
      setErrorMsg('Vui lòng nhập nội dung ít nhất 1 công việc đã làm hôm nay, hoặc chọn "Không phát sinh công việc".');
      return;
    }

    if (noActivity) {
      if (!noActivityReason.trim()) {
        setErrorMsg('Vui lòng nhập lý do không phát sinh công việc.');
        return;
      }
      if (noActivityReason.trim().length < 10) {
        setErrorMsg('Lý do không phát sinh công việc phải có ít nhất 10 ký tự.');
        return;
      }
    }

    // Check if any checked blocker is missing details
    const missingBlocker = validCustomTasks.find(ct => ct.hasBlocker && !ct.blockerDetails.trim());
    if (missingBlocker) {
      setErrorMsg('Vui lòng điền chi tiết vướng mắc cho công việc bạn đã chọn "Gặp vướng mắc".');
      return;
    }

    // Build summaryToday from customTasks list
    const customStr = validCustomTasks.map((ct) => `• ${ct.title}${ct.hasBlocker && ct.blockerDetails ? ` (🚨 Vướng mắc: ${ct.blockerDetails})` : ''}`).join('\n');
    const customBlockerStr = validCustomTasks.filter(ct => ct.hasBlocker && ct.blockerDetails).map(ct => `${ct.title}: ${ct.blockerDetails}`).join('; ');

    try {
      setSubmitting(true);
      const payload = {
        noActivity,
        noActivityReason,
        summaryToday: customStr,
        generalDifficulties: customBlockerStr ? `🚨 ${customBlockerStr}` : '',
        helpNeeded: '',
        planTomorrow: '',
        tasks: []
      };

      const res = await fetch('/api/checkins/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg('Nộp báo cáo công việc thành công!');
        localStorage.removeItem(`checkin_draft_${auth?.user?.id}`);
        await fetchContext();
        await fetchMatrixData();
        setIsFormCollapsed(true); // Auto-collapse form after submit
      } else {
        const d = await res.json();
        setErrorMsg(d.error || 'Có lỗi xảy ra.');
      }
    } catch (e) {
      setErrorMsg('Lỗi kết nối mạng.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered users for Matrix
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchSearch = !searchMember || 
        (u.fullName || '').toLowerCase().includes(searchMember.toLowerCase()) || 
        (u.username || '').toLowerCase().includes(searchMember.toLowerCase());
      const matchDept = !filterDept || (u.department || '').toLowerCase() === filterDept.toLowerCase();
      return matchSearch && matchDept;
    });
  }, [usersList, searchMember, filterDept]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    usersList.forEach(u => {
      if (u.department) set.add(u.department);
    });
    return Array.from(set);
  }, [usersList]);

  // Fast lookup map for checkins by userId and dateStr
  const matrixMap = useMemo(() => {
    const map = new Map<string, any>();
    matrixData.forEach(r => {
      const dStr = typeof r.checkinDate === 'string' ? r.checkinDate.split('T')[0] : r.checkinDate;
      const key = `${r.userId}_${dStr}`;
      map.set(key, r);
    });
    return map;
  }, [matrixData]);

  // Hover timer & Mini Tooltip (Bảng tạm xem nhanh)
  const hoverTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{
    user: any;
    dateStr: string;
    record: any;
    x: number;
    y: number;
  } | null>(null);

  // Handle cell click (Full modal with [X] close button)
  const handleCellClick = (user: any, dateStr: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoverTooltip(null);
    const key = `${user.id}_${dateStr}`;
    const record = matrixMap.get(key) || null;
    setViewingUser(user);
    setViewingDate(dateStr);
    setViewingRecord(record);
  };

  const handleCellMouseEnter = (e: React.MouseEvent, user: any, dateStr: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const posX = rect.left + rect.width / 2;
    const posY = rect.top;

    hoverTimerRef.current = setTimeout(() => {
      const key = `${user.id}_${dateStr}`;
      const record = matrixMap.get(key) || null;
      setHoverTooltip({ user, dateStr, record, x: posX, y: posY });
    }, 250);
  };

  const handleCellMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoverTooltip(null);
  };

  return (
    <div className="flex-1 overflow-auto p-3 md:p-6 custom-scrollbar">
      <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-indigo-400" />
              {isAdmin ? 'Quản lý Báo cáo hằng ngày' : 'Báo cáo hằng ngày'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAdmin 
                ? 'Theo dõi, tổng hợp và giám sát tình hình báo cáo công việc của toàn bộ nhân sự.' 
                : 'Nộp báo cáo công việc cá nhân và theo dõi tình hình làm việc của toàn nhóm.'}
            </p>
          </div>

          {/* Today stats summary */}
          <div className="flex items-center gap-3 bg-slate-900/60 p-2 px-3.5 rounded-2xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400">Đã báo cáo hôm nay:</span>
              <span className="font-bold text-white">
                {matrixData.filter(r => (r.checkinDate || '').startsWith(new Date().toISOString().split('T')[0])).length} / {usersList.length}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: MEMBER SUBMIT FORM (Rendered ONLY for Members) */}
        {!isAdmin && (
          <div className="space-y-4">
            {loadingContext ? (
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                Đang tải dữ liệu báo cáo...
              </div>
            ) : (
              <>
                {/* Form Collapsed Banner */}
                {isFormCollapsed ? (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl transition-all hover:border-indigo-500/50">
                    <div className="flex items-center gap-3.5">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white">Bạn đã hoàn thành nộp báo cáo hôm nay</span>
                          {context?.existingCheckIn?.firstSubmittedAt && (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20">
                              lúc {new Date(context.existingCheckIn.firstSubmittedAt || context.existingCheckIn.first_submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {context?.existingCheckIn?.noActivity 
                            ? `Không phát sinh: ${context.existingCheckIn.noActivityReason}` 
                            : (context?.existingCheckIn?.summaryToday || 'Nội dung báo cáo công việc đã được ghi nhận.')}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsFormCollapsed(false)}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 shrink-0"
                    >
                      <Edit className="h-4 w-4" />
                      <span>✏️ Chỉnh sửa báo cáo</span>
                    </button>
                  </div>
                ) : (
                  /* Form Expanded - ULTRA MINIMAL EXACTLY MATCHING USER SCREENSHOT */
                  <div className="space-y-4 bg-slate-900/60 p-4 md:p-6 rounded-3xl border border-slate-800 shadow-2xl relative">
                    
                    <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-white">
                          {context?.existingCheckIn ? 'Chỉnh sửa báo cáo hằng ngày' : 'Nhập báo cáo công việc hôm nay'}
                        </h2>
                      </div>
                      
                      {context?.existingCheckIn && (
                        <button
                          onClick={() => setIsFormCollapsed(true)}
                          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Minimize2 className="h-3.5 w-3.5" />
                          Thu nhỏ form
                        </button>
                      )}
                    </div>

                    {context?.isExempt && (
                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Bạn được miễn báo cáo hằng ngày, tuy nhiên bạn vẫn có thể nộp nếu muốn.</span>
                      </div>
                    )}

                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                    {successMsg && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                      
                      {/* Option No Activity */}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={noActivity}
                            onChange={(e) => setNoActivity(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 bg-slate-950 focus:ring-0 cursor-pointer h-4 w-4"
                          />
                          Không phát sinh công việc hôm nay
                        </label>
                      </div>

                      {noActivity ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1.5">Lý do không phát sinh công việc *</label>
                          <textarea
                            value={noActivityReason}
                            onChange={(e) => setNoActivityReason(e.target.value)}
                            required
                            rows={3}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                            placeholder="Nhập lý do chi tiết..."
                          />
                        </div>
                      ) : (
                        /* Main Work Entry Section (ONLY WORK ITEMS LIST) */
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              1. NHẬP CÔNG VIỆC ĐÃ THỰC HIỆN HÔM NAY
                            </h3>
                            <button
                              type="button"
                              onClick={addCustomTask}
                              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-md shadow-indigo-600/20"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Thêm công việc
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {customTasks.map((ct, idx) => (
                              <div key={ct.id} className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800/50 shrink-0">
                                    Công việc #{idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={ct.title}
                                    onChange={(e) => updateCustomTask(ct.id, 'title', e.target.value)}
                                    placeholder="Gõ nội dung công việc bạn đã làm hôm nay..."
                                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                                  />
                                  {customTasks.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeCustomTask(ct.id)}
                                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                                      title="Xóa công việc này"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>

                                <div className="pl-2">
                                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
                                    <input
                                      type="checkbox"
                                      checked={ct.hasBlocker}
                                      onChange={(e) => updateCustomTask(ct.id, 'hasBlocker', e.target.checked)}
                                      className="rounded border-slate-700 text-red-600 bg-slate-900 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                                    />
                                    <span className="text-red-400">
                                      🚨 Gặp vướng mắc ở việc này <span className="text-slate-500 font-normal text-[10px]">(Không bắt buộc)</span>
                                    </span>
                                  </label>
                                  {ct.hasBlocker && (
                                    <input
                                      type="text"
                                      value={ct.blockerDetails}
                                      onChange={(e) => updateCustomTask(ct.id, 'blockerDetails', e.target.value)}
                                      placeholder="Chi tiết vướng mắc gặp phải..."
                                      className="mt-1.5 w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-red-900/40 text-xs text-slate-200 focus:outline-none"
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Submit Actions */}
                      <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                        {context?.existingCheckIn && (
                          <button
                            type="button"
                            onClick={() => setIsFormCollapsed(true)}
                            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                          >
                            Hủy
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 transition-all"
                        >
                          <Save className="h-4 w-4" />
                          {submitting ? 'Đang lưu...' : context?.existingCheckIn ? 'Cập nhật báo cáo' : 'Nộp báo cáo'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* SECTION 2: CALENDAR MATRIX VIEW (Rendered for ALL Users - Optimized 100% width, No Sunday Cut-off) */}
        <div className="space-y-3 bg-slate-900/40 p-3 md:p-5 rounded-3xl border border-slate-800 shadow-2xl w-full">
          
          {/* Controls Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-indigo-400" />
                Bảng lịch báo cáo nhân sự
              </h2>
              
              {/* Week Navigation */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Tuần trước"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                <span className="px-2.5 text-xs font-semibold text-slate-200">
                  {weekDays[0]?.dayNum} - {weekDays[6]?.dayNum} ({weekOffset === 0 ? 'Tuần này' : weekOffset < 0 ? `${Math.abs(weekOffset)}t trước` : `${weekOffset}t sau`})
                </span>

                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  title="Tuần sau"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {weekOffset !== 0 && (
                <button
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-500/30 transition-all"
                >
                  Hôm nay
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:flex-none">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Tìm nhân sự..."
                  value={searchMember}
                  onChange={(e) => setSearchMember(e.target.value)}
                  className="pl-8 pr-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50 w-full lg:w-36"
                />
              </div>

              {departments.length > 0 && (
                <select
                  value={filterDept}
                  onChange={(e) => setFilterDept(e.target.value)}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">Tất cả phòng ban</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-0.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đã báo cáo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span> Không phát sinh
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span> Chưa báo cáo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Vướng mắc 🚨
            </span>
          </div>

          {/* Calendar Matrix Grid - Fits inside frame cleanly (100% table-fixed) */}
          {matrixLoading ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-2"></div>
              Đang tải dữ liệu bảng lịch...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs bg-slate-950/30 rounded-2xl border border-slate-800">
              Không tìm thấy nhân sự nào.
            </div>
          ) : (
            <div className="w-full overflow-hidden border border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800">
                    <th className="p-2 text-xs font-bold text-slate-400 w-[18%] border-r border-slate-800/80">
                      Nhân sự
                    </th>
                    {weekDays.map((d) => (
                      <th 
                        key={d.dateStr} 
                        className={`p-1.5 text-center border-r border-slate-800/60 w-[11.7%] ${
                          d.isToday ? 'bg-indigo-950/50 text-indigo-300' : 'text-slate-400'
                        }`}
                      >
                        <div className="text-[10px] font-semibold uppercase tracking-tight">{d.dayName}</div>
                        <div className={`text-[11px] font-bold ${d.isToday ? 'text-indigo-400' : 'text-slate-200'}`}>{d.dayNum}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                      
                      {/* User Info Column */}
                      <td className="p-2 border-r border-slate-800/80 bg-slate-950/50">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="h-7 w-7 rounded-lg bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/20">
                            {user.fullName ? user.fullName.charAt(0).toUpperCase() : (user.username || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-slate-200 truncate" title={user.fullName || user.username}>{user.fullName || user.username}</div>
                            <div className="text-[9px] text-slate-500 truncate" title={user.department || 'Nhân sự'}>{user.department || 'Nhân sự'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Day Cells (7 Days fit completely) */}
                      {weekDays.map(d => {
                        const key = `${user.id}_${d.dateStr}`;
                        const record = matrixMap.get(key);
                        const isPastOrToday = new Date(d.dateStr) <= new Date(new Date().toISOString().split('T')[0]);
                        
                        let cellContent = null;

                        if (record) {
                          const hasBlocker = record.generalDifficulties || record.helpNeeded || (record.items && record.items.some((i: any) => i.helpNeeded));
                          
                          if (record.noActivity) {
                            cellContent = (
                              <div className="p-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-300 hover:border-slate-400 transition-all cursor-pointer text-center">
                                <div className="font-semibold truncate">💤 Không việc</div>
                              </div>
                            );
                          } else {
                            cellContent = (
                              <div className={`p-1.5 rounded-xl border text-[10px] transition-all cursor-pointer ${hasBlocker ? 'bg-red-950/40 border-red-500/50 text-red-200 hover:border-red-400' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 hover:border-emerald-400'}`}>
                                <div className="font-bold flex items-center justify-between gap-0.5">
                                  <span className="truncate">✅ Đã nộp</span>
                                  {hasBlocker && <span className="text-[10px] shrink-0" title="Có vướng mắc">🚨</span>}
                                </div>
                                <div className="text-[9px] opacity-75 truncate mt-0.5">
                                  {record.summaryToday || (record.tasks && record.tasks.length ? `${record.tasks.length} task` : 'Đã nộp')}
                                </div>
                              </div>
                            );
                          }
                        } else if (isPastOrToday) {
                          cellContent = (
                            <div className="p-1.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[10px] text-amber-400/80 hover:border-amber-500/40 transition-all cursor-pointer text-center">
                              <span className="font-medium text-[9px] block truncate">⚠️ Chưa nộp</span>
                            </div>
                          );
                        } else {
                          cellContent = (
                            <div className="p-1 text-center text-slate-700 text-[10px]">
                              -
                            </div>
                          );
                        }

                        return (
                          <td 
                            key={d.dateStr} 
                            onClick={() => handleCellClick(user, d.dateStr)}
                            onMouseEnter={(e) => handleCellMouseEnter(e, user, d.dateStr)}
                            onMouseLeave={handleCellMouseLeave}
                            className="p-1 border-r border-slate-800/60 align-top cursor-pointer hover:bg-indigo-500/10 transition-colors"
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* DETAIL MODAL (Opens when clicking any matrix cell) */}
      {viewingUser && viewingDate && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-xl w-full max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl animate-fade-in">
            
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Chi tiết Báo cáo công việc</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    {new Date(viewingDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nhân sự: <strong className="text-slate-200">{viewingUser.fullName || viewingUser.username}</strong> ({viewingUser.department || 'Nhân sự'})
                </p>
              </div>

              <button 
                onClick={() => setViewingRecord(null) || setViewingUser(null)} 
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            {!viewingRecord ? (
              <div className="p-6 text-center text-slate-400 text-xs space-y-2 bg-slate-950/40 rounded-2xl border border-slate-800">
                <AlertCircle className="h-6 w-6 text-amber-400 mx-auto" />
                <p>Nhân sự chưa nộp báo cáo cho ngày {new Date(viewingDate).toLocaleDateString('vi-VN')}.</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-300">
                
                {viewingRecord.noActivity ? (
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="font-bold text-slate-300 block mb-1">💤 Không phát sinh công việc</span>
                    <p className="text-slate-400 italic">Lý do: {viewingRecord.noActivityReason}</p>
                  </div>
                ) : (
                  <>
                    {/* Summary Today / Custom Work Items */}
                    {viewingRecord.summaryToday && (
                      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
                        <span className="font-bold text-indigo-400 block mb-1 uppercase tracking-wider text-[10px]">Nội dung công việc đã thực hiện</span>
                        <p className="text-slate-200 text-xs whitespace-pre-line leading-relaxed">{viewingRecord.summaryToday}</p>
                      </div>
                    )}

                    {/* Tasks Detail */}
                    {viewingRecord.tasks && viewingRecord.tasks.length > 0 && (
                      <div className="space-y-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">Task phân công trên hệ thống</span>
                        <div className="space-y-2">
                          {viewingRecord.tasks.map((t: any, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-semibold text-slate-200 text-xs">Mô tả: {t.workDone || t.progress_note}</span>
                                {t.percentCompleteProposed !== undefined && (
                                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-bold">
                                    Tiến độ: {t.percentCompleteProposed}%
                                  </span>
                                )}
                              </div>
                              {t.helpNeeded && (
                                <div className="mt-1.5 text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/30 text-[11px]">
                                  🚨 Vướng mắc: {t.helpNeeded}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Submission Timestamp */}
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 flex justify-between">
                  <span>Thời gian nộp: {new Date(viewingRecord.firstSubmittedAt || viewingRecord.first_submitted_at || Date.now()).toLocaleString('vi-VN')}</span>
                  {viewingRecord.updatedAt && <span>Cập nhật: {new Date(viewingRecord.updatedAt).toLocaleString('vi-VN')}</span>}
                </div>

              </div>
            )}

            {/* Modal Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button 
                onClick={() => setViewingRecord(null) || setViewingUser(null)} 
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Mini Tooltip (Bảng tạm xem nhanh khi Hover 0.25s) */}
      {hoverTooltip && (
        <div
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full mb-2 w-64 p-3 rounded-2xl bg-slate-900/95 border border-indigo-500/50 shadow-2xl backdrop-blur-md space-y-2 animate-fade-in"
          style={{ left: `${hoverTooltip.x}px`, top: `${hoverTooltip.y}px` }}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-xs font-bold text-white truncate max-w-[140px]">
              {hoverTooltip.user.fullName || hoverTooltip.user.username}
            </span>
            <span className="text-[10px] text-indigo-300 font-mono">
              {new Date(hoverTooltip.dateStr).toLocaleDateString('vi-VN')}
            </span>
          </div>

          {hoverTooltip.record ? (
            hoverTooltip.record.noActivity ? (
              <p className="text-[11px] text-slate-400 italic">💤 Không phát sinh công việc</p>
            ) : (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  ✅ Đã nộp báo cáo
                  {(hoverTooltip.record.generalDifficulties || hoverTooltip.record.helpNeeded) && (
                    <span className="text-[10px] text-red-400 font-bold">🚨 Vướng mắc</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-300 line-clamp-2">
                  {hoverTooltip.record.summaryToday ||
                    (hoverTooltip.record.tasks?.length
                      ? `${hoverTooltip.record.tasks.length} công việc đã thực hiện`
                      : 'Đã hoàn thành công việc')}
                </p>
              </div>
            )
          ) : (
            <p className="text-[11px] text-amber-400 font-medium">⚠️ Chưa nộp báo cáo</p>
          )}

          <div className="text-[9px] text-slate-500 text-center border-t border-slate-800/60 pt-1 font-sans">
            💡 Click chuột vào ô để mở xem toàn bộ chi tiết có nút [X] đóng
          </div>
        </div>
      )}
    </div>
  );
}
