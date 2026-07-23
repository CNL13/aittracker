import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
    const projectId = req.query.projectId;
    if (!projectId || typeof projectId !== 'string' || !uuidRegex.test(projectId)) {
      return res.status(400).json({ error: 'Project ID must be a valid UUID.' });
    }

    const projectRows = await sql`
      SELECT id, manager_id
      FROM projects
      WHERE id = ${projectId}
    `;
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Khong tim thay du an.' });
    }
    const project = projectRows[0]!;

    const isAdmin = user.role === 'admin';
    const isManager = project.manager_id === user.id;
    if (!isAdmin && !isManager) {
      const membershipRows = await sql`
        SELECT id
        FROM project_members
        WHERE project_id = ${projectId}
          AND user_id = ${user.id}
          AND removed_at IS NULL
      `;
      if (membershipRows.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const members = await sql`
      SELECT pm.id, pm.user_id as "userId", u.username, u.full_name as "fullName",
             u.email, pm.project_role as "projectRole", pm.joined_at as "joinedAt"
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ${projectId}
        AND pm.removed_at IS NULL
        AND u.status = 'active'
      ORDER BY
        CASE pm.project_role WHEN 'manager' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
        u.full_name ASC
    `;

    return res.status(200).json({ members });
  } catch (error: unknown) {
    console.error('List project members error:', error);
    return res.status(500).json({
      error: 'Da xay ra loi he thong. Vui long thu lai sau.',
    });
  }
}
