import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const reqUserId = req.query.userId as string | undefined;
    const targetUserId = reqUserId || null;

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    
    const limit = Math.min(parseInt(req.query.limit as string || '200', 10), 500);
    const offset = parseInt(req.query.offset as string || '0', 10);

    const checkins = await sql`
      SELECT * FROM daily_checkins
      WHERE ${targetUserId ? sql`user_id = ${targetUserId}` : sql`1=1`}
        ${startDate ? sql`AND checkin_date >= ${startDate}` : sql``}
        ${endDate ? sql`AND checkin_date <= ${endDate}` : sql``}
      ORDER BY checkin_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const allUsers = await sql`SELECT id, username, full_name, department FROM users`;
    const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

    const result = [];
    for (const row of checkins) {
      const items = await sql`
        SELECT 
          task_id as "taskId",
          progress_note as "workDone",
          proposed_task_percent as "percentCompleteProposed",
          proposed_task_status as "proposedTaskStatus",
          help_needed as "helpNeeded"
        FROM daily_checkin_items
        WHERE checkin_id = ${row.id}
          AND removed_at IS NULL
      `;

      const user = userMap.get(row.user_id) || {};

      result.push({
        id: row.id,
        userId: row.user_id,
        username: (user as any).username || null,
        fullName: (user as any).full_name || null,
        department: (user as any).department || null,
        checkinDate: row.checkin_date,
        summaryToday: row.summary_today,
        noActivity: row.no_activity,
        noActivityReason: row.no_activity_reason,
        generalDifficulties: row.general_difficulties,
        helpNeeded: row.help_needed,
        planTomorrow: row.plan_tomorrow,
        firstSubmittedAt: row.first_submitted_at,
        first_submitted_at: row.first_submitted_at,
        updatedAt: row.updated_at,
        items,
        tasks: items,
      });
    }

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Error fetching check-in history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
