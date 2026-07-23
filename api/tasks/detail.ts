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
    const { taskId } = req.query;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid taskId' });
    }

    // Get task basic info and check existence
    const taskRes = await sql`
      SELECT 
        id, project_id as "projectId", title, description, status, priority,
        percent_complete as "percentComplete",
        TO_CHAR(start_date, 'YYYY-MM-DD') as "startDate",
        TO_CHAR(due_date, 'YYYY-MM-DD') as "dueDate",
        version,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt",
        completed_at as "completedAt",
        archived_at as "archivedAt"
      FROM tasks 
      WHERE id = ${taskId}
    `;

    if (taskRes.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes[0] as any;
    const projectId = task.projectId;

    // Authorization
    if (user.role !== 'admin') {
      const authCheckRes = await sql`
        SELECT 
          (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = ${projectId} AND pm.user_id = ${user.id} AND pm.removed_at IS NULL) as is_project_member,
          (SELECT COUNT(*) FROM task_members tm WHERE tm.task_id = ${taskId} AND tm.user_id = ${user.id} AND tm.removed_at IS NULL) as is_task_member
      `;
      const { is_project_member, is_task_member } = authCheckRes[0] as any;
      
      if (Number(is_project_member) === 0 && Number(is_task_member) === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // Fetch related data in parallel
    const [members, blockers, activityLogs] = await Promise.all([
      sql`
        SELECT id, task_id as "taskId", user_id as "userId", assignment_role as "assignmentRole",
               report_required as "reportRequired", assigned_at as "assignedAt", removed_at as "removedAt"
        FROM task_members
        WHERE task_id = ${taskId} AND removed_at IS NULL
      `,
      sql`
        SELECT id, task_id as "taskId", reported_by as "reportedBy", description, 
               status, created_at as "createdAt", resolved_at as "resolvedAt"
        FROM task_blockers
        WHERE task_id = ${taskId}
        ORDER BY created_at DESC
      `,
      sql`
        SELECT id, actor_id as "actorId", actor_type as "actorType", entity_type as "entityType",
               entity_id as "entityId", action, new_values as "newValues", created_at as "createdAt"
        FROM activity_logs
        WHERE entity_type = 'task' AND entity_id = ${taskId}
        ORDER BY created_at DESC
      `
    ]);

    return res.status(200).json({
      task,
      members,
      blockers,
      activityLogs
    });

  } catch (error: any) {
    console.error('Task detail error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
