import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createTaskSchema } from '@ait/validation';
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

    const currentUserId = sessionContext.user.id;
    const isAdmin = sessionContext.user.role === 'admin';

    if (!isAdmin && !req.body?.projectId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const parseResult = createTaskSchema.safeParse(req.body || {});
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const {
      projectId,
      title,
      description,
      status = 'todo',
      priority = 'medium',
      ownerId,
      parentId,
      startDate,
      dueDate,
      collaborators = [],
      reviewers = [],
    } = parseResult.data;

    if (!projectId || !title?.trim()) {
      return res.status(400).json({ error: 'Dự án và Tiêu đề công việc là bắt buộc.' });
    }

    // 3. Check if project exists
    const projectRes = await sql`
      SELECT status, archived_at, manager_id, start_date, due_date FROM projects WHERE id = ${projectId}
    `;
    const project = projectRes[0];
    if (!project) {
      return res.status(404).json({ error: 'Không tìm thấy dự án.' });
    }
    if (project.status === 'completed' || project.status === 'archived' || project.archived_at) {
      return res.status(400).json({ error: 'Không thể tạo nhiệm vụ cho dự án đã hoàn thành hoặc đã bị lưu trữ.' });
    }

    // Validate task dueDate must be within project date range
    if (dueDate) {
      const projectStart = project.start_date ? String(project.start_date).substring(0, 10) : null;
      const projectEnd = project.due_date ? String(project.due_date).substring(0, 10) : null;
      const taskDue = String(dueDate).substring(0, 10);
      if (projectStart && taskDue < projectStart) {
        return res.status(400).json({ error: `Ngày hoàn thành của công việc không thể sớm hơn ngày bắt đầu dự án (${projectStart}).` });
      }
      if (projectEnd && taskDue > projectEnd) {
        return res.status(400).json({ error: `Ngày hoàn thành của công việc (${taskDue}) vượt quá ngày kết thúc dự án (${projectEnd}).` });
      }
    }

    if (parentId) {
      const parentTaskRes = await sql`
        SELECT id, project_id, parent_id, archived_at
        FROM tasks
        WHERE id = ${parentId}
      `;
      const parentTask = parentTaskRes[0];
      if (!parentTask || parentTask.archived_at) {
        return res.status(400).json({ error: 'Task cha khong ton tai hoac da bi luu tru.' });
      }
      if ((parentTask.project_id || parentTask.projectId) !== projectId) {
        return res.status(400).json({ error: 'Task nho phai thuoc cung du an voi task cha.' });
      }
      if (parentTask.parent_id || parentTask.parentId) {
        return res.status(400).json({ error: 'Khong tao task nho long nhieu tang.' });
      }
    }

    // Permission check: Admin, PM, or Member creating self-task or open task/subtask
    const isProjectManager = project.manager_id === currentUserId;
    const isAssigningOther = ownerId && ownerId !== currentUserId;
    const actorMembership = await sql`
      SELECT id FROM project_members
      WHERE project_id = ${projectId}
        AND user_id = ${currentUserId}
        AND removed_at IS NULL
    `;
    const isProjectMember = actorMembership.length > 0;

    if (!isAdmin && !isProjectManager && !isProjectMember) {
      return res.status(403).json({ error: 'Ban khong thuoc du an nay nen khong the tao cong viec.' });
    }

    // Member cannot force-assign tasks directly to OTHER colleagues upon creation unless they are PM/Admin.
    // Member CAN create tasks for themselves (ownerId === currentUserId) or open unassigned tasks/subtasks (ownerId === null/undefined).
    if (!isAdmin && !isProjectManager && isAssigningOther) {
      return res.status(403).json({ error: 'Nhân viên chỉ được tự giao việc cho chính mình hoặc tạo công việc mở cho nhóm.' });
    }

    if (!isAdmin && !isProjectManager && (collaborators.length > 0 || reviewers.length > 0)) {
      return res.status(403).json({ error: 'Chi Admin hoac quan ly du an duoc phan cong cong tac vien/nguoi duyet khi tao task.' });
    }

    // Helper to check if a user is active member
    const checkActiveMember = async (userId: string) => {
      if (!userId) return false;
      const member = await sql`
        SELECT pm.id FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = ${projectId} 
          AND pm.user_id = ${userId} 
          AND pm.removed_at IS NULL 
          AND u.status = 'active'
      `;
      return member && member.length > 0;
    };

    // If ownerId provided, check active member
    if (ownerId) {
      const isOwnerActive = await checkActiveMember(ownerId);
      if (!isOwnerActive) {
        return res.status(400).json({
          error: 'Người phụ trách (Owner) phải là thành viên đang hoạt động trong dự án.',
        });
      }
    }

    const relatedMemberIds = Array.from(new Set([...collaborators, ...reviewers]));
    for (const relatedMemberId of relatedMemberIds) {
      const isRelatedMemberActive = await checkActiveMember(relatedMemberId);
      if (!isRelatedMemberActive) {
        return res.status(400).json({
          error: 'Cong tac vien/nguoi duyet phai la thanh vien dang hoat dong trong du an.',
        });
      }
    }

    let createdTaskId = '';

    // Perform DB inserts in transaction
    await sql.begin(async (sqlTrans) => {
      const isDone = status === 'done';
      const percent = isDone ? 100 : 0;
      const completedAt = isDone ? new Date() : null;

      // Insert Task
      const insertTaskResult = await sqlTrans`
        INSERT INTO tasks (
          project_id, title, description, parent_id, start_date, due_date, 
          priority, status, percent_complete, version, created_by, completed_at
        )
        VALUES (
          ${projectId}, ${title.trim()}, ${description || null}, ${parentId || null}, ${startDate || null}, ${dueDate || null},
          ${priority}, ${status}, ${percent}, 1, ${currentUserId}, ${completedAt}
        )
        RETURNING id
      `;

      createdTaskId = insertTaskResult[0]!.id;

      // Add Owner if provided
      if (ownerId) {
        await sqlTrans`
          INSERT INTO task_members (task_id, user_id, assignment_role, report_required)
          VALUES (${createdTaskId}, ${ownerId}, 'owner', true)
        `;
      }

      // Add Collaborators
      if (collaborators && collaborators.length > 0) {
        const uniqueCollabs = Array.from(new Set(collaborators)).filter((id: any) => id !== ownerId);
        for (const cId of uniqueCollabs as string[]) {
          await sqlTrans`
            INSERT INTO task_members (task_id, user_id, assignment_role, report_required)
            VALUES (${createdTaskId}, ${cId}, 'collaborator', true)
          `;
        }
      }

      // Add Reviewers
      if (reviewers && reviewers.length > 0) {
        const uniqueReviewers = Array.from(new Set(reviewers)).filter(
          (id: any) => id !== ownerId && !collaborators.includes(id)
        );
        for (const rId of uniqueReviewers as string[]) {
          await sqlTrans`
            INSERT INTO task_members (task_id, user_id, assignment_role, report_required)
            VALUES (${createdTaskId}, ${rId}, 'reviewer', false)
          `;
        }
      }

      // Record Activity Log
      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, new_values)
        VALUES (
          ${currentUserId}, 'user', 'task', ${createdTaskId}, 'create_task',
          ${JSON.stringify({
            projectId,
            title,
            parentId,
            status,
            priority,
            ownerId,
          })}
        )
      `;
    });

    return res.status(201).json({
      message: 'Tạo nhiệm vụ thành công.',
      taskId: createdTaskId,
    });
  } catch (error: unknown) {
    console.error('Create task error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
