import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';
import { rejectInvalidMutation } from '../../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    // 1. Authenticate and check Admin role
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (sessionContext.user.role !== 'admin') {
      const { projectId } = req.body || {};
      if (projectId) {
        const proj = await sql`SELECT manager_id FROM projects WHERE id = ${projectId}`;
        if (!proj[0] || proj[0].manager_id !== sessionContext.user.id) {
          return res.status(403).json({ error: 'Bạn không có quyền quản lý thành viên dự án này.' });
        }
      } else {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const adminId = sessionContext.user.id;

    // 2. Validate body params
    const { projectId, userId } = req.body;
    if (!projectId || typeof projectId !== 'string' || !userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'Project ID and User ID are required.' });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(projectId) || !uuidRegex.test(userId)) {
      return res.status(400).json({ error: 'Project ID and User ID must be valid UUIDs.' });
    }

    // 3. Find active project membership
    const membership = await sql`
      SELECT id, project_role FROM project_members
      WHERE project_id = ${projectId} AND user_id = ${userId} AND removed_at IS NULL
    `;
    if (!membership || membership.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thành viên đang hoạt động trong dự án.' });
    }

    const memberRecord = membership[0]!;

    // 4. Business logic rule: Block removal if user is owner/collaborator/reviewer of any active task in this project
    const activeTasks = await sql`
      SELECT COUNT(*)::int as count
      FROM task_members tm
      JOIN tasks t ON tm.task_id = t.id
      WHERE t.project_id = ${projectId}
        AND tm.user_id = ${userId}
        AND tm.removed_at IS NULL
        AND t.status != 'done'
        AND t.archived_at IS NULL
    `;

    const activeTasksCount = activeTasks[0]?.count || 0;
    if (activeTasksCount > 0) {
      return res.status(400).json({
        error: 'Không thể gỡ thành viên khỏi dự án vì họ đang được giao thực hiện hoặc review công việc chưa hoàn thành (active tasks) trong dự án.',
      });
    }

    // 5. Update membership to removed in a transaction
    await sql.begin(async (sqlTrans) => {
      await sqlTrans`
        UPDATE project_members
        SET removed_at = CURRENT_TIMESTAMP
        WHERE id = ${memberRecord.id}
      `;

      // Log action in audit logs
      const oldValues = {
        projectId,
        userId,
        projectRole: memberRecord.project_role,
      };

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, 'user', 'project', ${projectId}, 'remove_project_member', ${JSON.stringify(oldValues)}, ${null})
      `;
    });

    return res.status(200).json({
      message: 'Gỡ thành viên khỏi dự án thành công.',
    });
  } catch (error: unknown) {
    console.error('Remove project member error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
