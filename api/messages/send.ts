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
    const { projectId, content } = req.body;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing projectId' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống.' });
    }
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Tin nhắn tối đa 2000 ký tự.' });
    }

    // Check user is a member of this project, manager, or admin
    if (user.role !== 'admin') {
      const memberCheck = await sql`
        SELECT 1 FROM project_members
        WHERE project_id = ${projectId} AND user_id = ${user.id} AND removed_at IS NULL
        UNION
        SELECT 1 FROM projects WHERE id = ${projectId} AND manager_id = ${user.id}
      `;
      if (memberCheck.length === 0) {
        return res.status(403).json({ error: 'Bạn không phải thành viên dự án này.' });
      }
    }

    const result = await sql`
      INSERT INTO project_messages (project_id, sender_id, content)
      VALUES (${projectId}, ${user.id}, ${content.trim()})
      RETURNING id, created_at as "createdAt"
    `;

    return res.status(201).json({
      message: 'Đã gửi tin nhắn.',
      id: result[0].id,
      createdAt: result[0].createdAt,
    });
  } catch (error: any) {
    console.error('Message send error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
