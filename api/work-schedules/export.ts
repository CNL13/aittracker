/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

const exportSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

const SHIFT_LABELS: Record<string, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  full: 'Cả ngày',
  overtime: 'Tăng ca',
  online: 'Online',
  off: 'Nghỉ',
  custom: 'Tùy chỉnh',
};

const WORKED_SHIFTS = new Set(['morning', 'afternoon', 'full', 'overtime', 'online', 'custom']);

function escapeCell(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function shiftText(entry: any) {
  if (!entry) return '';
  if (entry.shift === 'custom') {
    return `${SHIFT_LABELS.custom} ${entry.custom_start || '08:00'}-${entry.custom_end || '17:00'}`;
  }
  return SHIFT_LABELS[entry.shift] || entry.shift;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = exportSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parsed.error.flatten().fieldErrors });
    }

    const { month } = parsed.data;
    if (month < '2025-01') {
      return res.status(400).json({ error: 'Không thể xuất dữ liệu trước năm 2025.' });
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const totalDays = daysInMonth(year, monthNumber);
    const startDate = dateKey(year, monthNumber, 1);
    const endDate = dateKey(year, monthNumber, totalDays);

    const users = await sql`
      SELECT id, username, full_name, email, role, status, department, position
      FROM users
      WHERE status = ${'active'}::user_status
      ORDER BY full_name ASC
    `;

    const entries = await sql`
      SELECT user_id, work_date, shift, custom_start, custom_end
      FROM work_schedules
      WHERE work_date >= ${startDate}::date
        AND work_date <= ${endDate}::date
      ORDER BY work_date ASC
    `;

    const holidays = await sql`
      SELECT work_date, name
      FROM non_working_days
      WHERE work_date >= ${startDate}::date
        AND work_date <= ${endDate}::date
      ORDER BY work_date ASC
    `;

    // Normalize work_date to YYYY-MM-DD string (PostgreSQL may return Date objects)
    const normalizeDate = (d: any): string => {
      if (!d) return '';
      if (typeof d === 'string') return d.split('T')[0];
      if (d instanceof Date) return d.toISOString().split('T')[0];
      return String(d).split('T')[0];
    };

    const entryMap = new Map(entries.map((entry) => [`${entry['user_id']}|${normalizeDate(entry['work_date'])}`, entry]));
    const holidayMap = new Map(holidays.map((holiday) => [normalizeDate(holiday['work_date']), holiday['name']]));
    const dayHeaders = Array.from({ length: totalDays }, (_, index) => dateKey(year, monthNumber, index + 1));

    const rows = users.map((user) => {
      const workedCount = dayHeaders.filter((day) => {
        const entry = entryMap.get(`${user['id']}|${day}`);
        return entry && WORKED_SHIFTS.has(entry['shift']);
      }).length;
      const offCount = dayHeaders.filter((day) => entryMap.get(`${user['id']}|${day}`)?.['shift'] === 'off').length;
      const onlineCount = dayHeaders.filter((day) => entryMap.get(`${user['id']}|${day}`)?.['shift'] === 'online').length;
      const holidayWorkCount = dayHeaders.filter((day) => {
        const entry = entryMap.get(`${user['id']}|${day}`);
        return holidayMap.has(day) && entry && WORKED_SHIFTS.has(entry['shift']);
      }).length;

      return `
        <tr>
          <td>${escapeCell(user['full_name'])}</td>
          <td>${escapeCell(user['username'])}</td>
          <td>${escapeCell(user['position'] || '')}</td>
          <td>${escapeCell(user['department'] || '')}</td>
          <td>${workedCount}</td>
          <td>${offCount}</td>
          <td>${onlineCount}</td>
          <td>${holidayWorkCount}</td>
          ${dayHeaders
            .map((day) => {
              const entry = entryMap.get(`${user['id']}|${day}`);
              const holiday = holidayMap.get(day);
              return `<td>${escapeCell(`${shiftText(entry)}${holiday ? ` (${holiday})` : ''}`)}</td>`;
            })
            .join('')}
        </tr>
      `;
    });

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th, td { border: 1px solid #999; padding: 6px 8px; mso-number-format:"\\@"; }
          th { background: #d9e8ff; font-weight: 700; }
          .holiday { background: #ffd9d9; color: #a10000; }
        </style>
      </head>
      <body>
        <h2>Chấm công tháng ${escapeCell(month)}</h2>
        <table>
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Username</th>
              <th>Chức danh</th>
              <th>Bộ phận</th>
              <th>Tổng ngày công</th>
              <th>Ngày nghỉ</th>
              <th>Ngày online</th>
              <th>Làm ngày lễ</th>
              ${dayHeaders
                .map((day) => `<th class="${holidayMap.has(day) ? 'holiday' : ''}">${escapeCell(day.slice(8))}${holidayMap.has(day) ? ' *' : ''}</th>`)
                .join('')}
            </tr>
          </thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="cham-cong-${month}.xls"`);
    return res.status(200).send(html);
  } catch (error) {
    console.error('Export work schedules error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
