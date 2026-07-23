import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

const listAbsencesSchema = z.object({
  userId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
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

    const parseResult = listAbsencesSchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid Input', details: parseResult.error.flatten().fieldErrors });
    }

    let { userId, limit, offset } = parseResult.data;

    // Admin sees all; PM sees their project members; members see only themselves
    if (session.user.role !== 'admin') {
      if (userId && userId !== session.user.id) {
        // Non-admin trying to view someone else's absences — check if they are PM of a shared project
        const pmCheck = await sql`
          SELECT pm.id FROM project_members pm
          JOIN projects p ON p.id = pm.project_id
          WHERE pm.user_id = ${userId} AND pm.removed_at IS NULL
            AND p.manager_id = ${session.user.id}
          LIMIT 1
        `;
        if (pmCheck.length === 0) {
          userId = session.user.id; // Fallback to own absences
        }
      } else if (!userId) {
        userId = session.user.id;
      }
    }

    const userFilter = userId
      ? sql`AND a.user_id = ${userId}`
      : sql``;

    const absences = await sql`
      SELECT a.id, a.user_id, a.start_date, a.end_date, a.reason, a.approved_by,
             u.username, u.full_name as user_full_name,
             ap.full_name as approver_name
      FROM user_absences a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN users ap ON a.approved_by = ap.id
      WHERE 1=1
        ${userFilter}
      ORDER BY a.start_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*)::int as count
      FROM user_absences a
      WHERE 1=1
        ${userFilter}
    `;

    return res.status(200).json({
      absences: absences.map(a => ({
        id: a['id'],
        userId: a['user_id'],
        startDate: a['start_date'],
        endDate: a['end_date'],
        reason: a['reason'],
        approvedBy: a['approved_by'],
        username: a['username'],
        userFullName: a['user_full_name'],
        approverName: a['approver_name'],
      })),
      total: countResult[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List absences error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
