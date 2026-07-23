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
    // 1. Authenticate
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const actorId = sessionContext.user.id;
    const isAdmin = sessionContext.user.role === 'admin';

    // 2. Validate projectId
    const { projectId } = req.body;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required.' });
    }

    // 3. Fetch the project to verify it exists and check authorization
    const projectRows = await sql`
      SELECT id, name, manager_id as "managerId", status
      FROM projects
      WHERE id = ${projectId}
    `;

    const project = projectRows[0];
    if (!project) {
      return res.status(404).json({ error: 'Không tìm thấy dự án.' });
    }

    // 4. Only admin or the project's manager can delete
    if (!isAdmin && project.managerId !== actorId) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa dự án này.' });
    }

    // 5. Delete the project (CASCADE constraints will clean up project_members, tasks, task_members)
    await sql.begin(async (sqlTrans) => {
      // Write audit log before deletion
      const oldValues = {
        id: project.id,
        name: project.name,
        managerId: project.managerId,
        status: project.status,
      };

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${actorId}, 'user', 'project', ${projectId}, 'delete_project', ${JSON.stringify(oldValues)}, ${null})
      `;

      // Delete the project
      await sqlTrans`
        DELETE FROM projects WHERE id = ${projectId}
      `;
    });

    return res.status(200).json({ message: 'Dự án đã được xóa thành công.' });
  } catch (error: unknown) {
    console.error('Delete project error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
