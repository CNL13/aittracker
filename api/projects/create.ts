import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createProjectSchema } from '@ait/validation';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';
import { sendEmail } from '../_shared/email.js';

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

    // 2. Validate request body
    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { name, description, startDate, dueDate, managerId } = parseResult.data;
    const memberIds = Array.from(new Set(parseResult.data.memberIds || []));

    // 3. If managerId is provided, check if user exists and is active
    if (managerId) {
      const managerUser = await sql`
        SELECT status FROM users WHERE id = ${managerId}
      `;
      const mUser = managerUser[0];
      if (!mUser) {
        return res.status(400).json({ error: 'Không tìm thấy người quản lý dự án.' });
      }
      if (mUser.status !== 'active') {
        return res.status(400).json({ error: 'Người quản lý dự án phải là người dùng đang hoạt động.' });
      }
    }

    if (memberIds.length > 0) {
      const activeUsers = await sql`
        SELECT id, status FROM users WHERE id = ANY(${memberIds as any}::uuid[])
      `;
      const activeUserIds = new Set(activeUsers.filter((u: any) => u.status === 'active').map((u: any) => u.id));
      const invalidMemberId = memberIds.find((id) => !activeUserIds.has(id));
      if (invalidMemberId) {
        return res.status(400).json({ error: 'Danh sách thành viên có người không hợp lệ hoặc không còn hoạt động.' });
      }
    }

    let createdProjectId = '';
    const initialStatus = isAdmin ? 'active' : 'planning';
    const actorType = 'user';
    const entityType = 'project';
    const action = isAdmin ? 'create_project' : 'request_project_approval';

    // 4. Run database inserts in transaction
    await sql.begin(async (sqlTrans) => {
      // Insert project
      const insertProjectResult = await sqlTrans`
        INSERT INTO projects (name, description, status, start_date, due_date, manager_id, created_by)
        VALUES (${name.trim()}, ${description || null}, ${initialStatus}, ${startDate || null}, ${dueDate || null}, ${managerId || null}, ${actorId})
        RETURNING id
      `;

      createdProjectId = insertProjectResult[0]!.id;

      const membershipIds = Array.from(new Set([actorId, managerId, ...memberIds].filter(Boolean) as string[]));
      for (const userId of membershipIds) {
        const projectRole = userId === managerId ? 'manager' : 'member';
        await sqlTrans`
          INSERT INTO project_members (project_id, user_id, project_role)
          VALUES (${createdProjectId}, ${userId}, ${projectRole})
        `;
      }

      // Log action in audit logs
      const newValues = {
        name: name.trim(),
        description: description || null,
        status: initialStatus,
        startDate: startDate || null,
        dueDate: dueDate || null,
        managerId: managerId || null,
        memberIds,
        createdBy: actorId,
        approvalStatus: isAdmin ? 'created_by_admin' : 'pending_admin_approval',
      };

      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${actorId}, ${actorType}, ${entityType}, ${createdProjectId}, ${action}, ${null}, ${JSON.stringify(newValues)})
      `;
    });

    // Send notifications to admins outside the transaction
    if (!isAdmin) {
      try {
        const admins = await sql`
          SELECT id, username, full_name, email
          FROM users
          WHERE role = 'admin' AND status = 'active'
        `;
        const appUrl = process.env.APP_URL || 'http://localhost:5173';
        for (const admin of admins) {
          const subject = `[AIT Work Tracker] Yêu cầu phê duyệt dự án mới`;
          const html = `
            <p>Chào Admin ${admin.full_name},</p>
            <p>Thành viên <strong>${sessionContext.user.fullName}</strong> đã gửi yêu cầu phê duyệt cho dự án mới:</p>
            <ul>
              <li><strong>Tên dự án:</strong> ${name.trim()}</li>
              <li><strong>Mô tả:</strong> ${description || 'Không có'}</li>
            </ul>
            <p>Vui lòng đăng nhập hệ thống và duyệt tại <a href="${appUrl}/admin/projects">Quản lý dự án</a>.</p>
          `;
          sendEmail({
            recipientUserId: admin.id,
            to: admin.email || '',
            subject,
            html,
            type: 'project_approval_request',
            dedupeKey: `project-approval-${createdProjectId}-${admin.id}`,
          }).catch(err => console.error(`Failed to send project approval notification to ${admin.username}:`, err));
        }
      } catch (err) {
        console.error('Failed to notify admins for project approval request:', err);
      }
    }

    // 5. Query and return full project details
    const projects = await sql`
      SELECT id, name, description, status, start_date as "startDate", due_date as "dueDate", 
             manager_id as "managerId", created_by as "createdBy", created_at as "createdAt", 
             updated_at as "updatedAt", archived_at as "archivedAt"
      FROM projects
      WHERE id = ${createdProjectId}
    `;

    const project = projects[0]!;
    return res.status(201).json({
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
    console.error('Create project error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
