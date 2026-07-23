/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createNonWorkingDaySchema } from '@ait/validation';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';
import { rejectInvalidMutation } from '../../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

    const parseResult = createNonWorkingDaySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parseResult.error.flatten().fieldErrors });
    }

    const { workDate, name } = parseResult.data;

    let inserted: any;
    try {
      await sql.begin(async (tx) => {
        const result = await tx`
          INSERT INTO non_working_days (work_date, name, created_by)
          VALUES (${workDate}, ${name}, ${session.user.id})
          RETURNING id, work_date, name, created_by, created_at
        `;
        const row = result[0];
        if (!row) {
          throw new Error('Failed to create non-working day record');
        }

        await tx`
          INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, new_values)
          VALUES (${session.user.id}, 'user', 'non_working_day', ${row.id}, 'create', ${JSON.stringify({ workDate, name })})
        `;

        inserted = row;
      });
    } catch (e: any) {
      if (e.code === '23505') { // Unique violation
        return res.status(400).json({ error: 'Non-working day already exists for this date.' });
      }
      throw e;
    }

    if (!inserted) {
      return res.status(500).json({ error: 'Failed to create non-working day record' });
    }

    return res.status(201).json({ success: true, data: inserted });
  } catch (error) {
    console.error('Create non-working day error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
