import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';
import { rejectInvalidMutation } from '../../_shared/http.js';

const deleteNonWorkingDaySchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    const session = await getSession(req);
    if (!session || session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parseResult = deleteNonWorkingDaySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parseResult.error.flatten().fieldErrors });
    }

    const { workDate } = parseResult.data;

    let deleted: any[] = [];
    await sql.begin(async (tx) => {
      const rows = await tx`
        DELETE FROM non_working_days
        WHERE work_date = ${workDate}
        RETURNING id, work_date, name
      `;

      if (rows.length === 0) {
        return [];
      }

      await tx`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values)
        VALUES (${session.user.id}, 'user', 'non_working_day', ${rows[0]!.id}, 'delete', ${JSON.stringify(rows[0])})
      `;

      deleted = rows;
      return rows;
    });

    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Not Found' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Delete non-working day error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
