/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';

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
    const { taskId, content } = req.body;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Nội dung bình luận không được để trống.' });
    }

    const result = await sql`
      INSERT INTO task_comments (task_id, sender_id, content)
      VALUES (${taskId}, ${user.id}, ${content.trim()})
      RETURNING id, created_at as "createdAt"
    `;

    return res.status(201).json({
      message: 'Đã gửi bình luận.',
      id: result[0].id,
      createdAt: result[0].createdAt,
    });
  } catch (error: any) {
    console.error('Task comment create error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
