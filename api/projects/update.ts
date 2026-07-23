import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateProjectSchema } from '@ait/validation';
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

    const adminId = sessionContext.user.id;
    const isAdmin = sessionContext.user.role === 'admin';

    // 2. Validate projectId
    const projectId = req.body.projectId || req.query.projectId;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(projectId)) {
      return res.status(400).json({ error: 'Project ID must be a valid UUID.' });
    }

    // 3. Retrieve existing project
    const existingProjects = await sql`
      SELECT id, name, description, status, start_date as "startDate", due_date as "dueDate",
             manager_id as "managerId", created_by as "createdBy", archived_at as "archivedAt"
      FROM projects
      WHERE id = ${projectId}
    `;

    if (!existingProjects || existingProjects.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy dự án.' });
    }

    const oldProject = existingProjects[0]!;

    // Permission: Admin or Project Manager
    const isProjectManager = oldProject.managerId === adminId;
    if (!isAdmin && !isProjectManager) {
      return res.status(403).json({ error: 'Bạn không có quyền chỉnh sửa dự án này.' });
    }

    // 4. Validate update fields
    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, description, status, startDate, dueDate, managerId } = parseResult.data;

    // 5. Business logic rule: Block set status to completed if there are active tasks
    if (status === 'completed') {
      const activeTasks = await sql`
        SELECT COUNT(*)::int as count
        FROM tasks
        WHERE project_id = ${projectId} AND status != 'done' AND archived_at IS NULL
      `;
      const activeTasksCount = activeTasks[0]?.count || 0;
      if (activeTasksCount > 0) {
        return res.status(400).json({
          error: 'Không thể hoàn thành dự án khi vẫn còn các công việc chưa hoàn thành (active tasks).',
        });
      }
    }

    // 6. Run update in transaction
    await sql.begin(async (sqlTrans) => {
      // If managerId changed and is not null, check if active
      if (managerId && managerId !== oldProject.managerId) {
        const managerUser = await sqlTrans`
          SELECT status FROM users WHERE id = ${managerId}
        `;
        const mUser = managerUser[0];
        if (!mUser) {
          throw new Error('Manager not found');
        }
        if (mUser.status !== 'active') {
          throw new Error('Manager user must be active');
        }

        // Upsert manager membership
        const existingMember = await sqlTrans`
          SELECT id, removed_at FROM project_members
          WHERE project_id = ${projectId} AND user_id = ${managerId}
        `;
        const memberToUpdate = existingMember[0];
        if (memberToUpdate) {
          await sqlTrans`
            UPDATE project_members
            SET project_role = 'manager',
                removed_at = NULL
            WHERE id = ${memberToUpdate.id}
          `;
        } else {
          await sqlTrans`
            INSERT INTO project_members (project_id, user_id, project_role)
            VALUES (${projectId}, ${managerId}, 'manager')
          `;
        }
      }

      // Update project record (ensure correct archived_at value based on status)
      await sqlTrans`
        UPDATE projects
        SET name = ${name.trim()},
            description = ${description || null},
            status = ${status},
            start_date = ${startDate || null},
            due_date = ${dueDate || null},
            manager_id = ${managerId || null},
            archived_at = CASE WHEN ${status} = 'archived'::project_status THEN COALESCE(archived_at, CURRENT_TIMESTAMP) ELSE NULL END
        WHERE id = ${projectId}
      `;

      // Log in audit logs
      const oldValues = {
        name: oldProject.name,
        description: oldProject.description,
        status: oldProject.status,
        startDate: oldProject.startDate ? new Date(oldProject.startDate).toISOString().split('T')[0] : null,
        dueDate: oldProject.dueDate ? new Date(oldProject.dueDate).toISOString().split('T')[0] : null,
        managerId: oldProject.managerId,
      };

      const newValues = {
        name: name.trim(),
        description: description || null,
        status,
        startDate: startDate || null,
        dueDate: dueDate || null,
        managerId: managerId || null,
      };
      const actorType = 'user';
      const entityType = 'project';
      const action = oldProject.status === 'planning' && status === 'active' ? 'approve_project' : 'update_project';

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, ${actorType}, ${entityType}, ${projectId}, ${action}, ${JSON.stringify(oldValues)}, ${JSON.stringify(newValues)})
      `;
    });

    // 7. Retrieve updated project and return
    const updatedProjects = await sql`
      SELECT id, name, description, status, start_date as "startDate", due_date as "dueDate",
             manager_id as "managerId", created_by as "createdBy", created_at as "createdAt",
             updated_at as "updatedAt", archived_at as "archivedAt"
      FROM projects
      WHERE id = ${projectId}
    `;

    const project = updatedProjects[0]!;
    return res.status(200).json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : null,
        dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : null,
        managerId: project.managerId,
        createdBy: project.createdBy,
        createdAt: new Date(project.createdAt).toISOString(),
        updatedAt: new Date(project.updatedAt).toISOString(),
        archivedAt: project.archivedAt ? new Date(project.archivedAt).toISOString() : null,
      },
    });
  } catch (error: unknown) {
    console.error('Update project error:', error);
    if (error instanceof Error && (error.message === 'Manager not found' || error.message === 'Manager user must be active')) {
      return res.status(400).json({ error: 'Người quản lý dự án không hợp lệ hoặc không hoạt động.' });
    }
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
