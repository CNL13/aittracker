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
    if (!sessionContext || sessionContext.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const action = req.query.action as string || '';
    const entityType = req.query.entityType as string || '';
    const search = req.query.search as string || '';

    const offset = (page - 1) * limit;

    // Build dynamic filter fragments
    const actionFilter = action
      ? sql`AND l.action = ${action}`
      : sql``;
    const entityTypeFilter = entityType
      ? sql`AND l.entity_type = ${entityType}`
      : sql``;
    const searchFilter = search
      ? sql`AND (u.username ILIKE ${`%${search.trim()}%`} OR u.full_name ILIKE ${`%${search.trim()}%`} OR l.action ILIKE ${`%${search.trim()}%`})`
      : sql``;

    const logs = await sql`
      SELECT 
        l.id,
        l.actor_id as "actorId",
        l.actor_type as "actorType",
        l.entity_type as "entityType",
        l.entity_id as "entityId",
        l.action,
        l.old_values as "oldValues",
        l.new_values as "newValues",
        l.created_at as "createdAt",
        u.username as "actorUsername",
        u.full_name as "actorFullName"
      FROM activity_logs l
      LEFT JOIN users u ON l.actor_id = u.id
      WHERE 1=1
        ${actionFilter}
        ${entityTypeFilter}
        ${searchFilter}
      ORDER BY l.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [totalCount] = await sql`
      SELECT COUNT(*)::int as count
      FROM activity_logs l
      LEFT JOIN users u ON l.actor_id = u.id
      WHERE 1=1
        ${actionFilter}
        ${entityTypeFilter}
        ${searchFilter}
    `;

    return res.status(200).json({
      data: logs,
      total: totalCount ? totalCount.count : 0,
    });
  } catch (error) {
    console.error('Audit log retrieval error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
