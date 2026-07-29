/* eslint-disable */
// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  Save,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { cachedFetch, readCachedData, refreshCachedData, subscribeCache } from '../utils/apiCache';
import { useAppRefresh } from '../hooks/useAppRefresh';

type ShiftKey = 'morning' | 'afternoon' | 'full' | 'overtime' | 'online' | 'off' | 'custom';

interface WorkScheduleUser {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  role: 'admin' | 'member';
  status: string;
  department?: string | null;
  position?: string | null;
  avatarUrl?: string | null;
}

interface WorkScheduleEntry {
  id: string;
  userId: string;
  username: string;
  userFullName: string;
  department?: string | null;
  position?: string | null;
  workDate: string;
  shift: ShiftKey;
  customStart?: string | null;
  customEnd?: string | null;
  updatedAt?: string | null;
}

interface NonWorkingDay {
  id?: string;
  workDate: string;
  name: string;
  createdBy?: string | null;
  createdAt?: string;
}

const MIN_SCHEDULE_DATE = '2025-01-01';
const PAGE_SIZE = 20;
const STAFF_SCHEDULE_TABLE_MIN_WIDTH = 1240;
const STAFF_SCHEDULE_PERSON_COLUMN_WIDTH = 240;
const STAFF_SCHEDULE_DAY_COLUMN_WIDTH = `calc((100% - ${STAFF_SCHEDULE_PERSON_COLUMN_WIDTH}px) / 7)`;

const SHIFT_OPTIONS: Record<ShiftKey, { label: string; shortLabel: string; display: string; tone: string; worked: boolean }> = {
  morning: { label: 'Ca sáng', shortLabel: 'Sáng', display: '7:30-11:30', tone: 'emerald', worked: true },
  afternoon: { label: 'Ca chiều', shortLabel: 'Chiều', display: '13:00-17:00', tone: 'amber', worked: true },
  full: { label: 'Cả ngày', shortLabel: 'Cả ngày', display: '7:30-17:00', tone: 'indigo', worked: true },
  overtime: { label: 'Tăng ca', shortLabel: 'Tăng ca', display: '17:00-20:00', tone: 'rose', worked: true },
  online: { label: 'Online', shortLabel: 'Online', display: 'Online', tone: 'sky', worked: true },
  off: { label: 'Nghỉ', shortLabel: 'Nghỉ', display: 'Nghỉ', tone: 'slate', worked: false },
  custom: { label: 'Tùy chỉnh', shortLabel: 'Tùy chỉnh', display: 'Tùy chỉnh', tone: 'violet', worked: true },
};

const ATTENDANCE_GROUPS: { key: ShiftKey; title: string; description: string }[] = [
  { key: 'morning', title: 'Ca sáng', description: '7:30-11:30' },
  { key: 'afternoon', title: 'Ca chiều', description: '13:00-17:00' },
  { key: 'full', title: 'Cả ngày', description: '7:30-17:00' },
  { key: 'overtime', title: 'Tăng ca', description: '17:00-20:00' },
  { key: 'online', title: 'Online', description: 'Làm từ xa' },
  { key: 'off', title: 'Nghỉ', description: 'Không tính công' },
  { key: 'custom', title: 'Tùy chỉnh', description: 'Giờ riêng' },
];

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return formatDateKey(new Date());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(value: string) {
  const date = parseDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(value: string) {
  const date = parseDate(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function daysInMonth(value: string) {
  return endOfMonth(value).getDate();
}

function formatShortDate(value: string) {
  return parseDate(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

function formatLongDate(value: string) {
  return parseDate(value).toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function weekdayShort(value: string) {
  const day = parseDate(value).getDay();
  if (day === 0) return 'CN';
  return `T${day + 1}`;
}

function clampWeekStart(date: Date) {
  const minWeek = startOfWeek(parseDate(MIN_SCHEDULE_DATE));
  return date < minWeek ? minWeek : date;
}

function minDate(a: Date, b: Date) {
  return a < b ? a : b;
}

function maxDate(a: Date, b: Date) {
  return a > b ? a : b;
}

function shiftDisplay(entry?: WorkScheduleEntry | null) {
  if (!entry) return 'Trống';
  if (entry.shift === 'custom') {
    return `${entry.customStart || '08:00'}-${entry.customEnd || '17:00'}`;
  }
  return SHIFT_OPTIONS[entry.shift]?.display || 'Trống';
}

function shiftToneClasses(shift?: ShiftKey | null) {
  switch (shift) {
    case 'morning':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25';
    case 'afternoon':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/25';
    case 'full':
      return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/25';
    case 'overtime':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/25';
    case 'online':
      return 'bg-sky-500/10 text-sky-300 border-sky-500/25';
    case 'off':
      return 'bg-slate-700/30 text-slate-400 border-slate-700';
    case 'custom':
      return 'bg-violet-500/10 text-violet-300 border-violet-500/25';
    default:
      return 'bg-slate-950/35 text-slate-500 border-slate-800 border-dashed';
  }
}

export default function CalendarView({ auth }: { auth: any }) {
  const user = auth.user;
  const isAdmin = user?.role === 'admin';
  const initialToday = todayKey() < MIN_SCHEDULE_DATE ? MIN_SCHEDULE_DATE : todayKey();

  const [weekStart, setWeekStart] = useState(() => clampWeekStart(startOfWeek(parseDate(initialToday))));
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [registrationDates, setRegistrationDates] = useState<string[]>([initialToday]);
  const [detailDate, setDetailDate] = useState('');
  const [targetUserId, setTargetUserId] = useState(user?.id || '');
  const [people, setPeople] = useState<WorkScheduleUser[]>([]);
  const [entries, setEntries] = useState<WorkScheduleEntry[]>([]);
  const [nonWorkingDays, setNonWorkingDays] = useState<NonWorkingDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedShift, setSelectedShift] = useState<ShiftKey>('full');
  const [customStart, setCustomStart] = useState('08:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peoplePage, setPeoplePage] = useState(1);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(weekStart, index);
      const key = formatDateKey(date);
      return { key, date };
    });
  }, [weekStart]);

  const fetchStart = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    return formatDateKey(minDate(monthStart, weekStart));
  }, [selectedDate, weekStart]);

  const fetchEnd = useMemo(() => {
    const monthEnd = endOfMonth(selectedDate);
    const weekEnd = addDays(weekStart, 6);
    return formatDateKey(maxDate(monthEnd, weekEnd));
  }, [selectedDate, weekStart]);
  const scheduleUrl = useMemo(() => {
    const params = new URLSearchParams({
      startDate: fetchStart,
      endDate: fetchEnd,
      limit: '1000',
    });
    return `/api/work-schedules/list?${params.toString()}`;
  }, [fetchStart, fetchEnd]);

  const entryByUserDate = useMemo(() => {
    const map = new Map<string, WorkScheduleEntry>();
    entries.forEach((entry) => map.set(`${entry.userId}|${entry.workDate}`, entry));
    return map;
  }, [entries]);

  const holidayByDate = useMemo(() => {
    const map = new Map<string, NonWorkingDay>();
    nonWorkingDays.forEach((day) => map.set(day.workDate, day));
    return map;
  }, [nonWorkingDays]);

  const filteredPeople = useMemo(() => {
    const query = peopleSearch.trim().toLowerCase();
    if (!query) return people;
    return people.filter((person) =>
      [person.fullName, person.username, person.email, person.department, person.position]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [people, peopleSearch]);

  const peopleTotalPages = Math.max(1, Math.ceil(filteredPeople.length / PAGE_SIZE));
  const pagedPeople = filteredPeople.slice((peoplePage - 1) * PAGE_SIZE, peoplePage * PAGE_SIZE);
  const targetPerson = people.find((person) => person.id === targetUserId) || people.find((person) => person.id === user?.id);
  const selectedHoliday = holidayByDate.get(selectedDate);
  const detailHoliday = detailDate ? holidayByDate.get(detailDate) : null;

  const selectedDateEntries = entries
    .filter((entry) => entry.workDate === selectedDate)
    .sort((a, b) => a.userFullName.localeCompare(b.userFullName, 'vi'));

  const selectedDateWorkCount = selectedDateEntries.filter((entry) => SHIFT_OPTIONS[entry.shift]?.worked).length;
  const selectedRegistrationDates = useMemo(
    () => registrationDates.filter((date) => date >= MIN_SCHEDULE_DATE).sort((a, b) => a.localeCompare(b)),
    [registrationDates],
  );
  const registrationHolidayCount = selectedRegistrationDates.filter((date) => holidayByDate.has(date)).length;
  const detailDateEntries = detailDate
    ? entries
        .filter((entry) => entry.workDate === detailDate)
        .sort((a, b) => a.userFullName.localeCompare(b.userFullName, 'vi'))
    : [];
  const detailDateWorkCount = detailDateEntries.filter((entry) => SHIFT_OPTIONS[entry.shift]?.worked).length;

  const selectedMonth = selectedDate.slice(0, 7);
  const canManageSelected = targetUserId === user?.id;
  const targetWorkedDays = useMemo(() => {
    if (!targetUserId) return 0;
    const worked = new Set(
      entries
        .filter((entry) => entry.userId === targetUserId && entry.workDate.startsWith(selectedMonth) && SHIFT_OPTIONS[entry.shift]?.worked)
        .map((entry) => entry.workDate),
    );
    return worked.size;
  }, [entries, targetUserId, selectedMonth]);

  const selectedTargetEntry = targetUserId ? entryByUserDate.get(`${targetUserId}|${selectedDate}`) : null;

  const fetchData = useCallback(async (force = false) => {
    const cached = readCachedData(scheduleUrl);
    setLoading(!cached);
    setError('');
    try {
      const freshOrCachedData = force
        ? await refreshCachedData(scheduleUrl)
        : await cachedFetch(scheduleUrl, 20 * 1000);
      setPeople(freshOrCachedData.users || []);
      setEntries(freshOrCachedData.entries || []);
      setNonWorkingDays(freshOrCachedData.nonWorkingDays || []);
      if (!targetUserId && user?.id) setTargetUserId(user.id);
    } catch (err: any) {
      setError(err.message || 'Không thể tải lịch làm.');
    } finally {
      setLoading(false);
    }
  }, [scheduleUrl, targetUserId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return subscribeCache(scheduleUrl, (data) => {
      setPeople(data.users || []);
      setEntries(data.entries || []);
      setNonWorkingDays(data.nonWorkingDays || []);
      if (!targetUserId && user?.id) setTargetUserId(user.id);
    });
  }, [scheduleUrl, targetUserId, user?.id]);

  useAppRefresh(() => fetchData(true), { minIntervalMs: 5000 });

  useEffect(() => {
    if (peoplePage > peopleTotalPages) setPeoplePage(peopleTotalPages);
  }, [peoplePage, peopleTotalPages]);

  useEffect(() => {
    if (selectedTargetEntry) {
      setSelectedShift(selectedTargetEntry.shift);
      setCustomStart(selectedTargetEntry.customStart || '08:00');
      setCustomEnd(selectedTargetEntry.customEnd || '17:00');
    }
  }, [selectedTargetEntry?.id, selectedTargetEntry?.shift, selectedTargetEntry?.customStart, selectedTargetEntry?.customEnd]);

  const moveWeek = (offset: number) => {
    const nextStart = clampWeekStart(addDays(weekStart, offset * 7));
    setWeekStart(nextStart);
    setDetailDate('');
    const nextSelected = formatDateKey(nextStart);
    const nextKey = nextSelected < MIN_SCHEDULE_DATE ? MIN_SCHEDULE_DATE : nextSelected;
    setSelectedDate(nextKey);
    setRegistrationDates([nextKey]);
  };

  const jumpToday = () => {
    const key = todayKey() < MIN_SCHEDULE_DATE ? MIN_SCHEDULE_DATE : todayKey();
    setWeekStart(clampWeekStart(startOfWeek(parseDate(key))));
    setDetailDate('');
    setSelectedDate(key);
    setRegistrationDates([key]);
  };

  const selectDateForRegistration = (date: string, userId = targetUserId || user?.id) => {
    if (date < MIN_SCHEDULE_DATE) return;
    setSelectedDate(date);
    setRegistrationDates([date]);
    const nextTargetUserId = isAdmin || userId === user?.id ? userId : user?.id;
    setTargetUserId(nextTargetUserId);
    const entry = entryByUserDate.get(`${nextTargetUserId}|${date}`);
    setSelectedShift(entry?.shift || 'full');
    setCustomStart(entry?.customStart || '08:00');
    setCustomEnd(entry?.customEnd || '17:00');
  };

  const toggleRegistrationDate = (date: string) => {
    if (date < MIN_SCHEDULE_DATE) return;
    setSelectedDate(date);
    setRegistrationDates((current) => {
      if (current.includes(date)) {
        return current.filter((item) => item !== date);
      }
      return [...current, date].sort((a, b) => a.localeCompare(b));
    });
  };

  const showDayDetails = (date: string) => {
    if (detailDate === date) {
      setDetailDate('');
      return;
    }
    setSelectedDate(date);
    setDetailDate(date);
  };

  const saveSchedule = async () => {
    if (!targetUserId || selectedRegistrationDates.length === 0 || !canManageSelected) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      for (const workDate of selectedRegistrationDates) {
        const res = await fetch('/api/work-schedules/upsert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: targetUserId,
            workDate,
            shift: selectedShift,
            customStart: selectedShift === 'custom' ? customStart : undefined,
            customEnd: selectedShift === 'custom' ? customEnd : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || `Không thể lưu lịch ngày ${formatShortDate(workDate)}.`);
        }
      }
      setSuccess(
        `Đã đăng ký ${SHIFT_OPTIONS[selectedShift].label} cho ${selectedRegistrationDates.length} ngày.` +
          (registrationHolidayCount ? ` Có ${registrationHolidayCount} ngày nghỉ lễ vẫn được ghi nhận riêng.` : ''),
      );
      await fetchData(true);
    } catch (err: any) {
      setError(err.message || 'Không thể lưu lịch.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSchedule = async () => {
    if (!targetUserId || !selectedTargetEntry || !canManageSelected) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const params = new URLSearchParams({ userId: targetUserId, workDate: selectedDate });
      const res = await fetch(`/api/work-schedules/delete?${params.toString()}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không thể xóa lịch.');
      }
      setSuccess('Đã xóa lịch của ngày đã chọn.');
      await fetchData(true);
    } catch (err: any) {
      setError(err.message || 'Không thể xóa lịch.');
    } finally {
      setSaving(false);
    }
  };

  const exportMonth = async () => {
    setError('');
    try {
      const res = await fetch(`/api/work-schedules/export?month=${selectedMonth}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Không thể xuất Excel.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cham-cong-${selectedMonth}.xls`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Không thể xuất Excel.');
    }
  };

  const groupedEntries = ATTENDANCE_GROUPS.map((group) => ({
    ...group,
    entries: detailDateEntries.filter((entry) => entry.shift === group.key),
  }));

  const previousDisabled = formatDateKey(addDays(weekStart, -7)) < formatDateKey(startOfWeek(parseDate(MIN_SCHEDULE_DATE)));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400">Lịch & công</p>
          <h2 className="text-xl font-bold text-white tracking-tight">Lịch làm và chấm công chung</h2>
          <p className="text-xs text-slate-400 mt-1">Đăng ký ca làm, xem danh sách theo ngày và xuất công theo tháng.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => moveWeek(-1)}
            disabled={previousDisabled}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Tuần trước
          </button>
          <button
            onClick={jumpToday}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Hôm nay
          </button>
          <button
            onClick={() => moveWeek(1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Tuần sau <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={exportMonth}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/10"
          >
            <Download className="h-4 w-4" /> Xuất Excel tháng {selectedMonth}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold mb-2">
            <Users className="h-4 w-4 text-indigo-400" /> Nhân sự đang xem
          </div>
          <div className="text-sm font-bold text-white">{targetPerson?.fullName || user?.fullName || 'Chưa xác định'}</div>
          <div className="text-xs text-slate-500 mt-1">{targetPerson?.position || targetPerson?.department || 'Chưa có chức danh'}</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold mb-2">
            <Briefcase className="h-4 w-4 text-emerald-400" /> Công tháng này
          </div>
          <div className="text-2xl font-extrabold text-white">{targetWorkedDays}/{daysInMonth(selectedDate)} ngày</div>
          <div className="text-xs text-slate-500 mt-1">Tính theo số ngày có đăng ký ca làm, không tính ca Nghỉ.</div>
        </div>
        <div className="glass-panel p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-bold mb-2">
            <CalendarDays className="h-4 w-4 text-amber-400" /> Ngày đang chọn
          </div>
          <div className="text-sm font-bold text-white">{formatLongDate(selectedDate)}</div>
          <div className={`text-xs mt-1 ${selectedHoliday ? 'text-red-300' : 'text-slate-500'}`}>
            {selectedHoliday ? `Nghỉ lễ: ${selectedHoliday.name}` : `${selectedDateWorkCount} người đăng ký làm việc`}
          </div>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`p-4 rounded-2xl border text-sm flex gap-3 ${
            error
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}
        >
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error || success}</span>
        </div>
      )}

      <section className="glass-panel p-4 md:p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              Tuần {formatShortDate(weekDays[0].key)} - {formatShortDate(weekDays[6].key)}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Bấm vào từng ngày để xem danh sách đi làm chi tiết.</p>
          </div>
          {loading && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> Đang tải lịch...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayEntries = entries.filter((entry) => entry.workDate === day.key);
            const holiday = holidayByDate.get(day.key);
            const isSelected = detailDate === day.key;
            const isBeforeMin = day.key < MIN_SCHEDULE_DATE;
            const morning = dayEntries.filter((entry) => entry.shift === 'morning').length;
            const afternoon = dayEntries.filter((entry) => entry.shift === 'afternoon').length;
            const full = dayEntries.filter((entry) => entry.shift === 'full').length;
            const online = dayEntries.filter((entry) => entry.shift === 'online').length;
            const totalWork = dayEntries.filter((entry) => SHIFT_OPTIONS[entry.shift]?.worked).length;

            return (
              <button
                key={day.key}
                type="button"
                disabled={isBeforeMin}
                onClick={() => showDayDetails(day.key)}
                aria-pressed={isSelected}
                className={`min-h-[96px] rounded-xl border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : holiday
                    ? 'border-red-500/35 bg-red-500/10 hover:border-red-500/50'
                    : 'border-slate-800 bg-slate-950/35 hover:border-slate-700'
                } ${isBeforeMin ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-400">{weekdayShort(day.key)}</span>
                  {holiday && <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 text-[10px] font-bold">Nghỉ lễ</span>}
                </div>
                <div className="mt-2 text-2xl font-extrabold text-white">{totalWork}</div>
                <div className="mt-2 text-[10px] leading-4 text-slate-400">
                  Sáng {morning} · Chiều {afternoon} · Cả ngày {full} · Online {online}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {detailDate && (
        <section className="glass-panel p-4 md:p-5 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Danh sách đi làm {formatLongDate(detailDate)}</h3>
            <p className="text-xs text-slate-400 mt-1">Tổng số: {detailDateWorkCount} người đăng ký làm việc.</p>
          </div>

          {detailHoliday && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              Đây là ngày nghỉ lễ: <strong>{detailHoliday.name}</strong>. Hệ thống vẫn cho phép đăng ký để ghi nhận người làm/trực ngày lễ.
            </div>
          )}

          <div className="space-y-3">
            {groupedEntries.map((group) => (
              <div key={group.key} className="rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-[108px] shrink-0">
                    <h4 className="text-xs font-bold text-slate-200">{group.title}</h4>
                    <p className="text-[10px] text-slate-500">{group.description}</p>
                  </div>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-slate-800 bg-slate-900 px-2 text-[10px] font-bold text-slate-400">
                    {group.entries.length}
                  </span>
                </div>

                {group.entries.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-600">Chưa có người đăng ký nhóm này.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.entries.map((entry) => (
                      <button
                        type="button"
                        key={`${entry.userId}-${entry.workDate}`}
                        onClick={() => selectDateForRegistration(entry.workDate, entry.userId)}
                        className="inline-flex min-h-[36px] max-w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-left hover:border-slate-700"
                        title={`${entry.userFullName} - ${entry.position || entry.department || entry.username}`}
                      >
                        <span className="max-w-[180px] truncate text-xs font-bold text-slate-100">{entry.userFullName}</span>
                        <span className="hidden max-w-[120px] truncate text-[10px] text-slate-500 sm:inline">
                          {entry.position || entry.department || entry.username}
                        </span>
                        {entry.shift === 'custom' && (
                          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${shiftToneClasses(entry.shift)}`}>
                            {shiftDisplay(entry)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel p-4 md:p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Lịch đăng ký</p>
            <h3 className="text-base font-bold text-white">{targetPerson?.fullName || user?.fullName}</h3>
            <p className="text-xs text-slate-400 mt-1">{targetPerson?.position || targetPerson?.department || 'Chọn ngày để đăng ký nhanh.'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1">Đã chọn: {selectedRegistrationDates.length} ngày</span>
              <span className="rounded-lg border border-slate-800 bg-slate-950/40 px-2.5 py-1">Ngày xem: {formatShortDate(selectedDate)}</span>
              <span className={`rounded-lg border px-2.5 py-1 ${shiftToneClasses(selectedTargetEntry?.shift)}`}>{shiftDisplay(selectedTargetEntry)}</span>
              {registrationHolidayCount > 0 && (
                <span className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-red-300">
                  {registrationHolidayCount} ngày lễ
                </span>
              )}
            </div>
          </div>

          <div className="w-full lg:max-w-xl rounded-xl border border-slate-800 bg-slate-950/35 p-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <label className="min-w-0">
                <span className="sr-only">Ca đăng ký</span>
                <select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value as ShiftKey)}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs font-bold text-slate-200 outline-none focus:border-indigo-500/70"
                >
                  {(['full', 'morning', 'afternoon', 'online', 'overtime', 'off', 'custom'] as ShiftKey[]).map((key) => (
                    <option key={key} value={key}>
                      {SHIFT_OPTIONS[key].label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={saveSchedule}
                disabled={saving || selectedRegistrationDates.length === 0 || !canManageSelected}
                className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Đăng ký lịch
              </button>
            </div>

            {selectedShift === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Bắt đầu
                  <input
                    type="time"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                  />
                </label>
                <label className="text-[10px] font-bold uppercase text-slate-500">
                  Kết thúc
                  <input
                    type="time"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                  />
                </label>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-slate-500">
              <span>
                {selectedRegistrationDates.length
                  ? `Áp dụng ${SHIFT_OPTIONS[selectedShift].label} cho ${selectedRegistrationDates.length} ngày đã chọn.`
                  : 'Chọn một hoặc nhiều ngày phía dưới rồi đăng ký.'}
              </span>
              {selectedTargetEntry && (
                <button
                  type="button"
                  onClick={deleteSchedule}
                  disabled={saving || !canManageSelected}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1.5 font-bold text-red-300 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Xóa
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const entry = entryByUserDate.get(`${targetUserId}|${day.key}`);
            const holiday = holidayByDate.get(day.key);
            const isRegistrationSelected = selectedRegistrationDates.includes(day.key);
            return (
              <button
                type="button"
                key={day.key}
                disabled={day.key < MIN_SCHEDULE_DATE}
                onClick={() => toggleRegistrationDate(day.key)}
                aria-pressed={isRegistrationSelected}
                className={`min-h-[64px] rounded-xl border px-3 py-2 text-center transition-colors ${
                  isRegistrationSelected
                    ? holiday
                      ? 'border-red-300 bg-red-500/15 ring-1 ring-red-300/30'
                      : 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-400/25'
                    : holiday
                      ? 'border-red-500/25 bg-red-500/10 hover:border-red-500/45'
                      : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
                }`}
              >
                <span className={`block text-[10px] font-bold ${holiday ? 'text-red-300' : 'text-slate-500'}`}>{weekdayShort(day.key)}</span>
                {holiday && <span className="mt-1 inline-flex rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold text-red-300">Lễ</span>}
                <span className={`mt-1 inline-flex max-w-full rounded-md border px-2 py-1 text-[11px] font-bold ${shiftToneClasses(entry?.shift)}`}>
                  {shiftDisplay(entry)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">Bảng lịch nhân sự</h3>
            <p className="text-xs text-slate-400 mt-1">Hiển thị 20 nhân sự mỗi trang. Bấm vào ô để xem/sửa lịch nếu có quyền.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={peopleSearch}
                onChange={(e) => {
                  setPeopleSearch(e.target.value);
                  setPeoplePage(1);
                }}
                placeholder="Tìm theo tên nhân sự..."
                className="w-full sm:w-72 rounded-xl border border-slate-800 bg-slate-950/60 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500/60"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={peoplePage <= 1}
                onClick={() => setPeoplePage((page) => Math.max(1, page - 1))}
                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white disabled:opacity-40"
                title="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[92px] text-center text-xs font-bold text-slate-400">
                {peoplePage}/{peopleTotalPages}
              </span>
              <button
                type="button"
                disabled={peoplePage >= peopleTotalPages}
                onClick={() => setPeoplePage((page) => Math.min(peopleTotalPages, page + 1))}
                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white disabled:opacity-40"
                title="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed border-collapse text-left"
            style={{ minWidth: STAFF_SCHEDULE_TABLE_MIN_WIDTH }}
          >
            <colgroup>
              <col style={{ width: STAFF_SCHEDULE_PERSON_COLUMN_WIDTH }} />
              {weekDays.map((day) => (
                <col key={`staff-day-col-${day.key}`} style={{ width: STAFF_SCHEDULE_DAY_COLUMN_WIDTH }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-4 whitespace-nowrap">Nhân sự</th>
                {weekDays.map((day) => {
                  const holiday = holidayByDate.get(day.key);
                  return (
                    <th key={day.key} className={`px-2 py-4 text-center ${holiday ? 'bg-red-500/10 text-red-300' : ''}`}>
                      <span className="block font-bold">{weekdayShort(day.key)}</span>
                      <span className="block text-[11px] normal-case">{formatShortDate(day.key)}</span>
                      {holiday && <span className="mt-1 inline-block rounded bg-red-500/15 px-1.5 py-0.5 text-[9px]">Nghỉ lễ</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-400" />
                    Đang tải bảng lịch...
                  </td>
                </tr>
              ) : pagedPeople.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">Không tìm thấy nhân sự phù hợp.</td>
                </tr>
              ) : (
                pagedPeople.map((person) => (
                  <tr key={person.id} className={person.id === user?.id ? 'bg-indigo-500/5' : ''}>
                    <th className="px-4 py-3 align-middle">
                      <div className="truncate text-sm font-bold text-slate-100">{person.fullName}</div>
                      <div className="mt-1 truncate text-xs text-slate-500">{person.position || person.department || `@${person.username}`}</div>
                    </th>
                    {weekDays.map((day) => {
                      const entry = entryByUserDate.get(`${person.id}|${day.key}`);
                      const canEdit = isAdmin || person.id === user?.id;
                      const holiday = holidayByDate.get(day.key);
                      return (
                        <td key={`${person.id}-${day.key}`} className="px-1.5 py-2 align-middle">
                          <button
                            type="button"
                            disabled={!canEdit || day.key < MIN_SCHEDULE_DATE}
                            onClick={() => selectDateForRegistration(day.key, person.id)}
                            className={`h-16 w-full overflow-hidden rounded-lg border px-2 py-2 text-center text-xs font-semibold leading-tight ${shiftToneClasses(entry?.shift)} ${
                              holiday ? 'ring-1 ring-red-500/30' : ''
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                            title={holiday ? `${holiday.name} - bấm để sửa lịch ngày này` : 'Bấm để sửa lịch ngày này'}
                          >
                            {shiftDisplay(entry)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-800 bg-slate-900/20 px-4 py-3 text-xs text-slate-500">
          Hiển thị {pagedPeople.length} / {filteredPeople.length} nhân sự phù hợp.
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <div className="glass-panel rounded-2xl border border-slate-800 p-4 space-y-4">
          <div>
            <h3 className="font-bold text-white">Quy tắc chấm công</h3>
            <p className="text-xs text-slate-400 mt-1">Cách hệ thống đang tính số ngày làm trong tháng.</p>
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Một ngày có ca Sáng, Chiều, Cả ngày, Tăng ca, Online hoặc Tùy chỉnh được tính là 1 ngày công.</span>
            </div>
            <div className="flex gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Ca Nghỉ không tính vào số ngày đi làm.</span>
            </div>
            <div className="flex gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-red-200">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>Ngày nghỉ lễ được bôi đỏ nhưng vẫn cho đăng ký; file Excel sẽ đánh dấu riêng ngày lễ.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
