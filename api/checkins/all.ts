import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });
  if (session.user.role !== 'admin') return res.status(403).json({ error: 'Only admins can view all check-ins' });

  const { date, userId, page = '1', limit = '20' } = req.query as Record<string, string>;

  try {
    const checkins = await sql`
      SELECT dc.id, dc.user_id, dc.checkin_date, dc.summary_today, dc.no_activity, dc.no_activity_reason,
             dc.general_difficulties, dc.help_needed, dc.plan_tomorrow, dc.total_time_spent_hours,
             dc.edited_by_admin_at, dc.admin_edit_reason, dc.first_submitted_at
      FROM daily_checkins dc
      WHERE 1=1
        ${date ? sql`AND dc.checkin_date = ${date}` : sql``}
        ${userId ? sql`AND dc.user_id = ${userId}` : sql``}
      ORDER BY dc.checkin_date DESC, dc.first_submitted_at DESC
    `;

    // Enrich with user info from users array
    const allUsers = await sql`SELECT id, username, full_name, department FROM users`;
    const userMap = new Map(allUsers.map((u: any) => [u.id, u]));

    const enriched = checkins.map((ci: any) => {
      const user = userMap.get(ci.user_id) || {};
      return {
        id: ci.id,
        userId: ci.user_id,
        checkinDate: ci.checkin_date,
        summaryToday: ci.summary_today,
        noActivity: ci.no_activity,
        noActivityReason: ci.no_activity_reason,
        generalDifficulties: ci.general_difficulties,
        helpNeeded: ci.help_needed,
        planTomorrow: ci.plan_tomorrow,
        totalTimeSpentHours: ci.total_time_spent_hours,
        editedByAdminAt: ci.edited_by_admin_at,
        createdAt: ci.first_submitted_at,
        username: (user as any).username || null,
        fullName: (user as any).full_name || null,
        department: (user as any).department || null,
      };
    });

    // Apply pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    const total = enriched.length;
    const paged = enriched.slice(offset, offset + limitNum);

    return res.status(200).json({ checkins: paged, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Get all checkins error:', error);
    return res.status(500).json({ error: 'Lỗi hệ thống.' });
  }
}
