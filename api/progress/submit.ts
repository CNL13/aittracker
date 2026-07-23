/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const { taskId, proposedPercent, description, evidenceUrl } = req.body;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    if (typeof proposedPercent !== 'number' || proposedPercent < 0 || proposedPercent > 100) {
      return res.status(400).json({ error: 'proposedPercent must be 0-100' });
    }

    // Check task exists and user is a member
    const taskRes = await sql`
      SELECT t.id, t.project_id, t.percent_complete, t.status
      FROM tasks t
      JOIN task_members tm ON tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL
      WHERE t.id = ${taskId} AND t.archived_at IS NULL
    `;

    if (taskRes.length === 0) {
      return res.status(404).json({ error: 'Task not found or you are not assigned' });
    }
    const task = taskRes[0] as any;
    if (Number(task.percent_complete || 0) >= 100 || task.status === 'done') {
      return res.status(400).json({ error: 'Task da hoan thanh 100% va khong can cap nhat tien do them.' });
    }

    // Check no pending request for this task by this user
    const pendingRes = await sql`
      SELECT id FROM progress_updates
      WHERE task_id = ${taskId} AND submitted_by = ${user.id} AND status = 'pending'
    `;

    if (pendingRes.length > 0) {
      return res.status(400).json({ error: 'Bạn đã có yêu cầu đang chờ duyệt cho task này.' });
    }

    // Insert progress update
    const result = await sql`
      INSERT INTO progress_updates (task_id, submitted_by, proposed_percent, description, evidence_url)
      VALUES (${taskId}, ${user.id}, ${proposedPercent}, ${description || null}, ${evidenceUrl || null})
      RETURNING id
    `;

    return res.status(201).json({
      message: 'Yêu cầu cập nhật tiến độ đã được gửi. PM sẽ duyệt.',
      id: result[0].id,
    });
  } catch (error: any) {
    console.error('Progress submit error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
