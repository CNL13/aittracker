import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';

const listNonWorkingDaysSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parseResult = listNonWorkingDaysSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parseResult.error.flatten().fieldErrors });
    }

    const { startDate, endDate } = parseResult.data;

    const startDateParam = startDate || null;
    const endDateParam = endDate || null;

    const days = await sql`
      SELECT id, work_date, name, created_by, created_at
      FROM non_working_days
      WHERE (${startDateParam}::date IS NULL OR work_date >= ${startDateParam}::date)
        AND (${endDateParam}::date IS NULL OR work_date <= ${endDateParam}::date)
      ORDER BY work_date ASC
    `;

    return res.status(200).json({
      nonWorkingDays: days.map(d => ({
        id: d['id'],
        workDate: d['work_date'],
        name: d['name'],
        createdBy: d['created_by'],
        createdAt: d['created_at'],
      })),
    });
  } catch (error) {
    console.error('List non-working days error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
