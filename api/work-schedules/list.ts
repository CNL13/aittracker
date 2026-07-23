/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

const listSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limit: z.coerce.number().int().min(1).max(2000).default(1000),
  offset: z.coerce.number().int().min(0).default(0),
});

function ensureAllowedRange(startDate: string, endDate: string) {
  if (startDate < '2025-01-01') return 'Không thể xem lịch trước năm 2025.';
  if (endDate < startDate) return 'Ngày kết thúc không thể trước ngày bắt đầu.';
  return '';
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

    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parsed.error.flatten().fieldErrors });
    }

    const { startDate, endDate, limit, offset } = parsed.data;
    const rangeError = ensureAllowedRange(startDate, endDate);
    if (rangeError) {
      return res.status(400).json({ error: rangeError });
    }

    const users = await sql`
      SELECT id, username, full_name, email, role, status, avatar_url, department, position
      FROM users
      WHERE status = ${'active'}::user_status
      ORDER BY
        CASE WHEN id = ${session.user.id} THEN 0 ELSE 1 END,
        full_name ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const entries = await sql`
      SELECT
        ws.id,
        ws.user_id,
        u.username,
        u.full_name,
        u.department,
        u.position,
        TO_CHAR(ws.work_date, 'YYYY-MM-DD') as work_date,
        ws.shift,
        ws.custom_start,
        ws.custom_end,
        ws.updated_at
      FROM work_schedules ws
      JOIN users u ON u.id = ws.user_id
      WHERE ws.work_date >= ${startDate}::date
        AND ws.work_date <= ${endDate}::date
      ORDER BY ws.work_date ASC, u.full_name ASC
    `;

    const nonWorkingDays = await sql`
      SELECT id, TO_CHAR(work_date, 'YYYY-MM-DD') as work_date, name, created_by, created_at
      FROM non_working_days
      WHERE work_date >= ${startDate}::date
        AND work_date <= ${endDate}::date
      ORDER BY work_date ASC
    `;

    return res.status(200).json({
      users: users.map((u) => ({
        id: u['id'],
        username: u['username'],
        fullName: u['full_name'],
        email: u['email'],
        role: u['role'],
        status: u['status'],
        avatarUrl: u['avatar_url'] || null,
        department: u['department'] || null,
        position: u['position'] || null,
      })),
      entries: entries.map((entry) => ({
        id: entry['id'],
        userId: entry['user_id'],
        username: entry['username'],
        userFullName: entry['full_name'],
        department: entry['department'] || null,
        position: entry['position'] || null,
        workDate: entry['work_date'],
        shift: entry['shift'],
        customStart: entry['custom_start'] || null,
        customEnd: entry['custom_end'] || null,
        updatedAt: entry['updated_at'],
      })),
      nonWorkingDays: nonWorkingDays.map((day) => ({
        id: day['id'],
        workDate: day['work_date'],
        name: day['name'],
        createdBy: day['created_by'],
        createdAt: day['created_at'],
      })),
      limit,
      offset,
    });
  } catch (error) {
    console.error('List work schedules error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
