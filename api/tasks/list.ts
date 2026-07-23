/* eslint-disable */
// @ts-nocheck
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
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const { projectId, search, status, priority, participantId, limit, offset } = req.query;

    if ((!projectId || typeof projectId !== 'string') && user.role !== 'admin') {
      return res.status(400).json({ error: 'Missing or invalid projectId' });
    }

    const parsedLimit = parseInt((limit as string) || '10', 10);
    const parsedOffset = parseInt((offset as string) || '0', 10);

    let countQuery = sql`
      SELECT COUNT(DISTINCT t.id) as total
      FROM tasks t
      LEFT JOIN task_members tm_auth ON t.id = tm_auth.task_id 
        AND tm_auth.user_id = ${user.id} AND tm_auth.removed_at IS NULL
      WHERE t.archived_at IS NULL
    `;

    let dataQuery = sql`
      SELECT 
        t.id, t.project_id as "projectId", p.name as "projectName", t.title, t.description, t.status, t.priority,
        t.percent_complete as "percentComplete",
        TO_CHAR(t.start_date, 'YYYY-MM-DD') as "startDate",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') as "dueDate",
        t.version,
        t.created_by as "createdBy",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        t.completed_at as "completedAt",
        t.archived_at as "archivedAt",
        (SELECT COUNT(*)::int FROM task_blockers tb WHERE tb.task_id = t.id AND tb.status = 'open') as "openBlockersCount",
        (SELECT tm.user_id FROM task_members tm WHERE tm.task_id = t.id AND tm.assignment_role = 'owner' AND tm.removed_at IS NULL LIMIT 1) as "ownerId",
        (SELECT u.full_name FROM task_members tm JOIN users u ON u.id = tm.user_id WHERE tm.task_id = t.id AND tm.assignment_role = 'owner' AND tm.removed_at IS NULL LIMIT 1) as "ownerName",
        COALESCE(tm_auth.assignment_role::text, 'admin') as "memberRole"
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN task_members tm_auth ON t.id = tm_auth.task_id 
        AND tm_auth.user_id = ${user.id} AND tm_auth.removed_at IS NULL
      WHERE t.archived_at IS NULL
    `;

    if (projectId && typeof projectId === 'string') {
      countQuery = sql`${countQuery} AND t.project_id = ${projectId}`;
      dataQuery = sql`${dataQuery} AND t.project_id = ${projectId}`;
    }

    // Role-based filtering: Admin sees all, PM sees all tasks in managed projects, member sees only assigned
    if (user.role !== 'admin') {
      countQuery = sql`${countQuery} AND (
        tm_auth.id IS NOT NULL
        OR EXISTS (SELECT 1 FROM projects p2 WHERE p2.id = t.project_id AND p2.manager_id = ${user.id})
      )`;
      dataQuery = sql`${dataQuery} AND (
        tm_auth.id IS NOT NULL
        OR EXISTS (SELECT 1 FROM projects p2 WHERE p2.id = t.project_id AND p2.manager_id = ${user.id})
      )`;
    }

    // Dynamic filters
    if (search && typeof search === 'string') {
      const searchPattern = `%${search}%`;
      countQuery = sql`${countQuery} AND t.title ILIKE ${searchPattern}`;
      dataQuery = sql`${dataQuery} AND t.title ILIKE ${searchPattern}`;
    }

    if (status && typeof status === 'string') {
      if (status === 'blocked') {
        countQuery = sql`${countQuery} AND EXISTS (SELECT 1 FROM task_blockers tb WHERE tb.task_id = t.id AND tb.status = 'open')`;
        dataQuery = sql`${dataQuery} AND EXISTS (SELECT 1 FROM task_blockers tb WHERE tb.task_id = t.id AND tb.status = 'open')`;
      } else {
        countQuery = sql`${countQuery} AND t.status = ${status} AND NOT EXISTS (SELECT 1 FROM task_blockers tb WHERE tb.task_id = t.id AND tb.status = 'open')`;
        dataQuery = sql`${dataQuery} AND t.status = ${status} AND NOT EXISTS (SELECT 1 FROM task_blockers tb WHERE tb.task_id = t.id AND tb.status = 'open')`;
      }
    }

    if (priority && typeof priority === 'string') {
      countQuery = sql`${countQuery} AND t.priority = ${priority}`;
      dataQuery = sql`${dataQuery} AND t.priority = ${priority}`;
    }

    if (participantId && typeof participantId === 'string') {
      countQuery = sql`${countQuery} AND EXISTS (
        SELECT 1 FROM task_members tm_part
        WHERE tm_part.task_id = t.id AND tm_part.user_id = ${participantId} AND tm_part.removed_at IS NULL
      )`;
      dataQuery = sql`${dataQuery} AND EXISTS (
        SELECT 1 FROM task_members tm_part
        WHERE tm_part.task_id = t.id AND tm_part.user_id = ${participantId} AND tm_part.removed_at IS NULL
      )`;
    }

    // Add order by, limit, and offset
    dataQuery = sql`${dataQuery} ORDER BY t.created_at DESC LIMIT ${parsedLimit} OFFSET ${parsedOffset}`;

    const countResult = await countQuery;
    const tasks = await dataQuery;
    const countRow = countResult[0] as any;
    const total = Number(countRow?.total ?? countRow?.count ?? tasks.length);

    return res.status(200).json({
      tasks,
      total,
    });
  } catch (error: any) {
    console.error('List tasks error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
