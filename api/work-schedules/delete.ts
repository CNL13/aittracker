/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { rejectInvalidMutation } from '../_shared/http.js';
import { sql } from '../_shared/db.js';

const deleteSchema = z.object({
  userId: z.string().min(1).max(128),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (rejectInvalidMutation(req, res)) return;

  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = deleteSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parsed.error.flatten().fieldErrors });
    }

    const { userId, workDate } = parsed.data;
    if (userId !== session.user.id) {
      return res.status(403).json({ error: 'Bạn chỉ có thể xóa lịch của chính mình.' });
    }

    if (workDate < todayKey()) {
      return res.status(400).json({ error: 'Khong the xoa lich cua ngay da qua.' });
    }

    await sql`
      DELETE FROM work_schedules
      WHERE user_id = ${userId}
        AND work_date = ${workDate}::date
    `;

    await sql`
      INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values)
      VALUES (
        ${session.user.id},
        'user',
        'work_schedule',
        ${userId},
        'delete_work_schedule',
        ${JSON.stringify({ userId, workDate })}::jsonb
      )
    `;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Delete work schedule error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
