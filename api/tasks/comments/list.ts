/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { taskId } = req.query;
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing taskId' });
    }

    const comments = await sql`
      SELECT 
        tc.id, tc.task_id as "taskId", tc.sender_id as "senderId",
        tc.content, tc.created_at as "createdAt",
        u.full_name as "senderName", u.username as "senderUsername"
      FROM task_comments tc
      JOIN users u ON u.id = tc.sender_id
      WHERE tc.task_id = ${taskId} AND tc.deleted_at IS NULL
      ORDER BY tc.created_at ASC
    `;

    return res.status(200).json({ comments });
  } catch (error: any) {
    console.error('Task comments list error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
