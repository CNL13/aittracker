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

    const { taskId } = req.query;
    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'taskId is required' });
    }

    if (sessionContext.user.role !== 'admin') {
      const allowed = await sql`
        SELECT tm.id
        FROM task_members tm
        JOIN tasks t ON t.id = tm.task_id
        WHERE tm.task_id = ${taskId}
          AND tm.user_id = ${sessionContext.user.id}
          AND tm.removed_at IS NULL
          AND t.archived_at IS NULL
      `;
      if (allowed.length === 0) {
        // Fallback: allow project manager
        const pmCheck = await sql`
          SELECT p.manager_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ${taskId}
        `;
        if (!pmCheck[0] || pmCheck[0].manager_id !== sessionContext.user.id) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    const blockers = await sql`
      SELECT 
        b.id,
        b.task_id,
        b.reported_by as reporter_id,
        b.description,
        b.status,
        b.resolved_at,
        b.resolved_by,
        b.resolved_note,
        b.created_at,
        r.username as reporter_username,
        r.full_name as reporter_full_name,
        rs.username as resolver_username,
        rs.full_name as resolver_full_name
      FROM task_blockers b
      LEFT JOIN users r ON r.id = b.reported_by
      LEFT JOIN users rs ON rs.id = b.resolved_by
      WHERE b.task_id = ${taskId}
      ORDER BY b.created_at DESC
    `;

    return res.status(200).json({ data: blockers });
  } catch (error) {
    console.error('List blockers error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
