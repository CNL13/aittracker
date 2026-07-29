/* eslint-disable */
// @ts-nocheck
import { prefetchData } from './apiCache';

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function calendarUrlForToday() {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const fetchStart = monthStart < weekStart ? monthStart : weekStart;
  const weekEnd = addDays(weekStart, 6);
  const fetchEnd = monthEnd > weekEnd ? monthEnd : weekEnd;
  const params = new URLSearchParams({
    startDate: formatDateKey(fetchStart),
    endDate: formatDateKey(fetchEnd),
    limit: '1000',
  });
  return `/api/work-schedules/list?${params.toString()}`;
}

export function prefetchRouteData(path: string, role?: string) {
  if (path === '/' || path === '/tasks') {
    prefetchData('/api/tasks/my?search=&limit=200', 15 * 1000);
    prefetchData('/api/projects/list', 5 * 60 * 1000);
    return;
  }

  if (path.startsWith('/projects')) {
    prefetchData('/api/projects/list?search=&status=&page=1&limit=6', 20 * 1000);
    prefetchData('/api/users/list?limit=100&status=active', 5 * 60 * 1000);
    return;
  }

  if (path === '/admin/users' || path === '/personnel') {
    prefetchData('/api/users/list?search=&role=&status=&page=1&limit=20', 30 * 1000);
    return;
  }

  if (path === '/calendar') {
    prefetchData(calendarUrlForToday(), 20 * 1000);
    return;
  }

  if (path === '/admin/logs') {
    prefetchData('/api/admin/audit?search=&action=&entity=&page=1&limit=50', 15 * 1000);
    prefetchData('/api/admin/email-log?page=1&limit=50&status=&search=', 15 * 1000);
  }

  if (path === '/check-in') {
    prefetchData('/api/checkins/context', 60 * 1000);
    // Prefetch matrix cho tuần hiện tại
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMon = currentDay === 0 ? -6 : 1 - currentDay;
    const mon = new Date(today);
    mon.setDate(today.getDate() + distanceToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const startDate = mon.toISOString().split('T')[0];
    const endDate = sun.toISOString().split('T')[0];
    prefetchData(`/api/checkins/history?startDate=${startDate}&endDate=${endDate}&limit=500`, 2 * 60 * 1000);
  }

  if (path === '/admin/dashboard') {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    const dateStr = today.toISOString().split('T')[0];
    prefetchData(`/api/dashboard/metrics?date=${dateStr}`, 30 * 1000);
  }
}
