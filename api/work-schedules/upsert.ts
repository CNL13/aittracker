/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { rejectInvalidMutation, currentDateInBusinessTz } from '../_shared/http.js';
import { sql } from '../_shared/db.js';

const shiftSchema = z.enum(['morning', 'afternoon', 'full', 'overtime', 'online', 'off', 'custom']);

const upsertSchema = z.object({
  userId: z.string().min(1).max(128).optional(),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: shiftSchema,
  customStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  customEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (rejectInvalidMutation(req, res)) return;

  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parsed.error.flatten().fieldErrors });
    }

    const { workDate, shift, userId } = parsed.data;

    // Check permission first: everyone (including admin) can only register for themselves
    if (userId && userId !== session.user.id) {
      return res.status(403).json({ error: 'Không được phép đăng ký lịch cho người khác.' });
    }

    const targetUserId = session.user.id;
    const customStart = shift === 'custom' ? parsed.data.customStart || '08:00' : null;
    const customEnd = shift === 'custom' ? parsed.data.customEnd || '17:00' : null;

    const todayStr = currentDateInBusinessTz();
    if (workDate < todayStr) {
      return res.status(400).json({ error: 'Không thể đăng ký lịch cho ngày đã qua.' });
    }
    if (workDate < '2025-01-01') {
      return res.status(400).json({ error: 'Không thể đăng ký lịch trước năm 2025.' });
    }
    if (shift === 'custom' && customEnd <= customStart) {
      return res.status(400).json({ error: 'Giờ kết thúc phải sau giờ bắt đầu.' });
    }

    const targetUsers = await sql`
      SELECT id, status
      FROM users
      WHERE id = ${targetUserId}
      LIMIT 1
    `;

    if (!targetUsers.length || targetUsers[0]['status'] !== 'active') {
      return res.status(400).json({ error: 'Nhân sự không tồn tại hoặc không còn hoạt động.' });
    }

    const rows = await sql`
      INSERT INTO work_schedules (user_id, work_date, shift, custom_start, custom_end, updated_by)
      VALUES (${targetUserId}, ${workDate}::date, ${shift}, ${customStart}, ${customEnd}, ${session.user.id})
      ON CONFLICT (user_id, work_date)
      DO UPDATE SET
        shift = EXCLUDED.shift,
        custom_start = EXCLUDED.custom_start,
        custom_end = EXCLUDED.custom_end,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, user_id, TO_CHAR(work_date, 'YYYY-MM-DD') as work_date, shift, custom_start, custom_end, updated_at
    `;

    await sql`
      INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, new_values)
      VALUES (
        ${session.user.id},
        'user',
        'work_schedule',
        ${targetUserId},
        'upsert_work_schedule',
        ${JSON.stringify({ userId: targetUserId, workDate, shift, customStart, customEnd })}::jsonb
      )
    `;

    const row = rows[0];
    return res.status(200).json({
      entry: {
        id: row['id'],
        userId: row['user_id'],
        workDate: row['work_date'],
        shift: row['shift'],
        customStart: row['custom_start'] || null,
        customEnd: row['custom_end'] || null,
        updatedAt: row['updated_at'],
      },
    });
  } catch (error) {
    console.error('Upsert work schedule error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
