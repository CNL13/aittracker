import type { VercelRequest, VercelResponse } from '@vercel/node';
import { addProjectMemberSchema } from '@ait/validation';
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
      // Allow project manager to add members to their own project
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

    // 2. Validate request body
    const parseResult = addProjectMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { projectId, userId, projectRole } = parseResult.data;

    // 3. Check if project exists
    const projectExists = await sql`
      SELECT id FROM projects WHERE id = ${projectId}
    `;
    if (!projectExists || projectExists.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy dự án.' });
    }

    // 4. Check if user exists and is active
    const user = await sql`
      SELECT id, status FROM users WHERE id = ${userId}
    `;
    const targetUser = user[0];
    if (!targetUser) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }
    if (targetUser.status !== 'active') {
      return res.status(400).json({ error: 'Chỉ có thể thêm người dùng đang hoạt động vào dự án.' });
    }

    // 5. Check duplicate active membership
    const existingMembership = await sql`
      SELECT id, removed_at FROM project_members
      WHERE project_id = ${projectId} AND user_id = ${userId}
    `;

    let memberId = '';

    await sql.begin(async (sqlTrans) => {
      if (existingMembership.length > 0) {
        const member = existingMembership[0]!;
        if (member.removed_at === null) {
          throw new Error('DUPLICATE_ACTIVE_MEMBER');
        }

        // Reactivate removed member
        await sqlTrans`
          UPDATE project_members
          SET project_role = ${projectRole},
              removed_at = NULL,
              joined_at = CURRENT_TIMESTAMP
          WHERE id = ${member.id}
        `;
        memberId = member.id;
      } else {
        // Insert new membership
        const insertRes = await sqlTrans`
          INSERT INTO project_members (project_id, user_id, project_role)
          VALUES (${projectId}, ${userId}, ${projectRole})
          RETURNING id
        `;
        memberId = insertRes[0]!.id;
      }

      // Log action in audit logs
      const newValues = {
        projectId,
        userId,
        projectRole,
      };

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, 'user', 'project', ${projectId}, 'add_project_member', ${null}, ${JSON.stringify(newValues)})
      `;
    });

    return res.status(200).json({
      message: 'Thêm thành viên vào dự án thành công.',
      member: {
        id: memberId,
        projectId,
        userId,
        projectRole,
        joinedAt: new Date().toISOString(),
        removedAt: null,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'DUPLICATE_ACTIVE_MEMBER') {
      return res.status(400).json({ error: 'Thành viên đã hoạt động trong dự án này.' });
    }
    console.error('Add project member error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
