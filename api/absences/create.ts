/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createAbsenceSchema } from '@ait/validation';
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
    const session = await getSession(req);
    if (!session || session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parseResult = createAbsenceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parseResult.error.flatten().fieldErrors });
    }

    const { userId, startDate, endDate, reason } = parseResult.data;

    // Check user exists
    const users = await sql`SELECT id FROM users WHERE id = ${userId} AND status = 'active'`;
    if (users.length === 0) {
      return res.status(400).json({ error: 'User not found or not active' });
    }

    let inserted: any;
    try {
      await sql.begin(async (tx) => {
        const result = await tx`
          INSERT INTO user_absences (user_id, start_date, end_date, reason, approved_by)
          VALUES (${userId}, ${startDate}, ${endDate}, ${reason}, ${session.user.id})
          RETURNING id
        `;
        const row = result[0];
        if (!row) {
          throw new Error('Failed to create absence record');
        }

        await tx`
          INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, new_values)
          VALUES (${session.user.id}, 'user', 'user_absence', ${row.id}, 'create', ${JSON.stringify({
            userId, startDate, endDate, reason
          })})
        `;

        inserted = row;
      });
    } catch (e: any) {
      if (e.message && e.message.includes('overlap')) {
        return res.status(400).json({ error: 'Absence periods cannot overlap for the same user.' });
      }
      throw e;
    }

    if (!inserted) {
      return res.status(500).json({ error: 'Failed to create absence record' });
    }

    return res.status(201).json({ success: true, data: inserted });
  } catch (error) {
    console.error('Create absence error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
