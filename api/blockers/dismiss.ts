import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resolveBlockerSchema } from '@ait/validation';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = sessionContext.user;

    const parsedBody = resolveBlockerSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsedBody.error.flatten() });
    }
    const { blockerId, resolutionNote } = parsedBody.data;

    if (user.role !== 'admin') {
      // Allow project manager to dismiss blockers in their projects
      const pmCheck = await sql`
        SELECT p.manager_id
        FROM task_blockers b
        JOIN tasks t ON t.id = b.task_id
        JOIN projects p ON p.id = t.project_id
        WHERE b.id = ${blockerId}
      `;
      if (!pmCheck[0] || pmCheck[0].manager_id !== user.id) {
        return res.status(403).json({ error: 'Bạn không có quyền bác bỏ vướng mắc này.' });
      }
    }

    const [blocker] = await sql`
      SELECT id, status
      FROM task_blockers
      WHERE id = ${blockerId}
    `;

    if (!blocker) {
      return res.status(404).json({ error: 'Blocker not found' });
    }
    if (blocker.status !== 'open') {
      return res.status(400).json({ error: 'Blocker is not open' });
    }

    const result = await sql.begin(async (tx) => {
      const [updated] = await tx`
        UPDATE task_blockers
        SET status = 'dismissed',
            resolved_at = NOW(),
            resolved_by = ${user.id},
            resolved_note = ${resolutionNote}
        WHERE id = ${blockerId}
        RETURNING *
      `;

      await tx`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action)
        VALUES (${user.id}, 'user', 'task_blocker', ${blockerId}, 'dismiss_blocker')
      `;

      return updated;
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Dismiss blocker error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
