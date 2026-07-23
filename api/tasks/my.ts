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
    const { search, status, priority, limit, offset, projectId, onlyMine } = req.query;

    const parsedLimit = parseInt((limit as string) || '200', 10);
    const parsedOffset = parseInt((offset as string) || '0', 10);
    const isOnlyMine = onlyMine === 'true';

    let countQuery = sql`
      SELECT COUNT(DISTINCT t.id) as total
      FROM tasks t
      INNER JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
    `;

    let dataQuery = sql`
      SELECT 
        t.id, t.parent_id as "parentId", t.project_id as "projectId", p.name as "projectName", t.title, t.description, t.status, t.priority,
        t.percent_complete as "percentComplete",
        TO_CHAR(t.start_date, 'YYYY-MM-DD') as "startDate",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') as "dueDate",
        t.version,
        t.created_by as "createdBy",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        t.completed_at as "completedAt",
        t.archived_at as "archivedAt",
        COALESCE(
          (SELECT tm.assignment_role::text FROM task_members tm WHERE tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL LIMIT 1),
          CASE WHEN p.manager_id = ${user.id} THEN 'manager' ELSE 'viewer' END
        ) as "memberRole",
        (SELECT tm2.user_id FROM task_members tm2 WHERE tm2.task_id = t.id AND tm2.assignment_role = 'owner' AND tm2.removed_at IS NULL LIMIT 1) as "ownerId",
        (SELECT u.full_name FROM task_members tm2 JOIN users u ON u.id = tm2.user_id WHERE tm2.task_id = t.id AND tm2.assignment_role = 'owner' AND tm2.removed_at IS NULL LIMIT 1) as "ownerName",
        (SELECT count(*)::int FROM task_comments tc WHERE tc.task_id = t.id AND tc.deleted_at IS NULL) as "commentCount",
        (SELECT pu.id FROM progress_updates pu WHERE pu.task_id = t.id AND pu.status = 'pending' ORDER BY pu.created_at DESC LIMIT 1) as "pendingProgressUpdateId",
        (SELECT pu.proposed_percent FROM progress_updates pu WHERE pu.task_id = t.id AND pu.status = 'pending' ORDER BY pu.created_at DESC LIMIT 1) as "pendingPercent"
      FROM tasks t
      INNER JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
    `;

    // Members should never receive unrelated tasks from other projects.
    // Admins keep the broad overview unless they explicitly enable "only mine".
    if (user.role !== 'admin') {
      countQuery = sql`${countQuery} AND (
        EXISTS (
          SELECT 1 FROM task_members tm
          WHERE tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL
        )
        OR p.manager_id = ${user.id}
      )`;
      dataQuery = sql`${dataQuery} AND (
        EXISTS (
          SELECT 1 FROM task_members tm
          WHERE tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL
        )
        OR p.manager_id = ${user.id}
      )`;
    } else if (isOnlyMine) {
      countQuery = sql`${countQuery} AND EXISTS (SELECT 1 FROM task_members tm WHERE tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL)`;
      dataQuery = sql`${dataQuery} AND EXISTS (SELECT 1 FROM task_members tm WHERE tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL)`;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      countQuery = sql`${countQuery} AND (t.title ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern})`;
      dataQuery = sql`${dataQuery} AND (t.title ILIKE ${searchPattern} OR t.description ILIKE ${searchPattern})`;
    }

    if (status && typeof status === 'string' && status.trim()) {
      countQuery = sql`${countQuery} AND t.status = ${status.trim()}`;
      dataQuery = sql`${dataQuery} AND t.status = ${status.trim()}`;
    }

    if (priority && typeof priority === 'string' && priority.trim()) {
      countQuery = sql`${countQuery} AND t.priority = ${priority.trim()}`;
      dataQuery = sql`${dataQuery} AND t.priority = ${priority.trim()}`;
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (projectId && typeof projectId === 'string' && uuidRegex.test(projectId.trim())) {
      countQuery = sql`${countQuery} AND t.project_id = ${projectId.trim()}::uuid`;
      dataQuery = sql`${dataQuery} AND t.project_id = ${projectId.trim()}::uuid`;
    }

    dataQuery = sql`${dataQuery} ORDER BY p.name ASC, CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC, t.due_date ASC NULLS LAST LIMIT ${parsedLimit} OFFSET ${parsedOffset}`;

    const countResult = await countQuery;
    const tasks = await dataQuery;
    const countRow = countResult.find((row: any) => row && (row.total !== undefined || row.count !== undefined)) as any;
    const total = Number(countRow?.total ?? countRow?.count ?? tasks.length);

    return res.status(200).json({
      tasks,
      total,
    });
  } catch (error: any) {
    console.error('My tasks error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
