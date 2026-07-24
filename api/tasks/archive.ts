/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
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
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const targetTaskId = req.body?.taskId || req.query?.taskId;

    if (!targetTaskId || typeof targetTaskId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid taskId' });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(targetTaskId)) {
      return res.status(400).json({ error: 'Task ID must be a valid UUID' });
    }

    if (user.role !== 'admin') {
      // Allow project manager or task creator/owner to archive tasks
      const pmCheck = await sql`
        SELECT p.manager_id, t.status, t.percent_complete, t.created_by,
               (SELECT tm.user_id FROM task_members tm WHERE tm.task_id = t.id AND tm.assignment_role = 'owner' AND tm.removed_at IS NULL LIMIT 1) as "ownerId",
               EXISTS (
                 SELECT 1 FROM task_members tm
                 WHERE tm.task_id = t.id
                   AND tm.user_id = ${user.id}
                   AND tm.removed_at IS NULL
               ) as is_task_member
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        WHERE t.id = ${targetTaskId}::uuid
      `;
      const permissionTask = pmCheck[0];
      const canManageTask = permissionTask?.manager_id === user.id;
      const isOwnTodoTask =
        permissionTask?.status === 'todo' &&
        (
          permissionTask?.created_by === user.id ||
          permissionTask?.ownerId === user.id ||
          permissionTask?.is_task_member === true ||
          permissionTask?.is_task_member === 1 ||
          Boolean(permissionTask?.is_task_member)
        );
      if (!permissionTask || (!canManageTask && !isOwnTodoTask)) {
        return res.status(403).json({ error: 'Bạn không có quyền lưu trữ công việc này.' });
      }
    }

    // Check existence and already archived
    const taskRes = await sql`SELECT archived_at FROM tasks WHERE id = ${targetTaskId}::uuid`;
    if (taskRes.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes[0];
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.archived_at) {
      return res.status(400).json({ error: 'Task is already archived' });
    }

    await sql.begin(async (sqlTrans) => {
      await sqlTrans`
        UPDATE tasks
        SET archived_at = CURRENT_TIMESTAMP
        WHERE id = ${targetTaskId}::uuid
      `;

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action)
        VALUES (${user.id}, 'user', 'task', ${targetTaskId}::uuid, 'archive_task')
      `;
    });

    return res.status(200).json({ message: 'Lưu trữ nhiệm vụ thành công.' });
  } catch (error: any) {
    console.error('Archive task error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
