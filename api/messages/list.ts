/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

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

    const { user } = sessionContext;
    const { projectId, limit, offset } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Missing projectId' });
    }

    // Check user is a member of this project or admin
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

    const parsedLimit = Math.min(parseInt((limit as string) || '50', 10), 100);
    const parsedOffset = parseInt((offset as string) || '0', 10);

    const messages = await sql`
      SELECT 
        pm.id, pm.project_id as "projectId", pm.sender_id as "senderId",
        pm.content, pm.created_at as "createdAt", pm.deleted_at as "deletedAt",
        u.full_name as "senderName", u.username as "senderUsername"
      FROM project_messages pm
      JOIN users u ON u.id = pm.sender_id
      WHERE pm.project_id = ${projectId} AND pm.deleted_at IS NULL
      ORDER BY pm.created_at ASC
      LIMIT ${parsedLimit} OFFSET ${parsedOffset}
    `;

    const countRes = await sql`
      SELECT COUNT(*)::int as total FROM project_messages
      WHERE project_id = ${projectId} AND deleted_at IS NULL
    `;

    return res.status(200).json({
      messages,
      total: countRes[0]?.total || 0,
    });
  } catch (error: any) {
    console.error('Messages list error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
