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
    const { taskId } = req.query;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid taskId' });
    }

    const taskRes = await sql`
      SELECT t.*, p.status as project_status, p.archived_at as project_archived_at, p.manager_id as project_manager_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ${taskId}
    `;

    if (taskRes.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskRes[0] as any;
    const action = req.body?.action;
    const isAdmin = user.role === 'admin';
    const isProjectManager = task.project_manager_id === user.id;
    const projectId = task.project_id || task.projectId;

    if (task.archived_at || task.project_archived_at || ['completed', 'archived'].includes(task.project_status)) {
      return res.status(400).json({ error: 'Task hoac du an da dong, khong the cap nhat.' });
    }

    if (req.body?.version !== undefined && Number(req.body.version) !== Number(task.version)) {
      return res.status(409).json({ error: 'Conflict: Dữ liệu đã bị thay đổi bởi người khác.' });
    }

    const [projectMembershipRes, currentMemberRes] = await Promise.all([
      sql`
        SELECT id FROM project_members
        WHERE project_id = ${projectId}
          AND user_id = ${user.id}
          AND removed_at IS NULL
      `,
      sql`
        SELECT assignment_role
        FROM task_members
        WHERE task_id = ${taskId}
          AND user_id = ${user.id}
          AND removed_at IS NULL
      `,
    ]);
    const isProjectMember = projectMembershipRes.length > 0;
    const currentMemberRole = currentMemberRes[0]?.assignment_role || currentMemberRes[0]?.assignmentRole;
    const isTaskMember = !!currentMemberRole;
    const canManageTask = isAdmin || isProjectManager;

    // Handle Quick Action 1: Claim Task (Nhân viên tự bấm dấu + tự nhận việc làm Owner hoặc Collaborator)
    if (action === 'claim_task' || action === 'claim_subtask') {
      if (!canManageTask && !isProjectMember) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await sql`
        UPDATE task_members
        SET removed_at = CURRENT_TIMESTAMP
        WHERE task_id = ${taskId} AND assignment_role = 'owner' AND removed_at IS NULL
      `;
      await sql`
        INSERT INTO task_members (task_id, user_id, assignment_role, report_required)
        VALUES (${taskId}, ${user.id}, 'owner', true)
      `;
      return res.status(200).json({ message: 'Đã nhận việc thành công!' });
    }

    // Handle Quick Action 2: Unclaim Task (Rút khỏi task khi tiến độ = 0%)
    if (action === 'unclaim_task') {
      if (!canManageTask && !isTaskMember) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (task.percent_complete > 0) {
        return res.status(400).json({ error: 'Không thể rút tên khi công việc đã bắt đầu làm (tiến độ > 0%).' });
      }
      await sql`
        UPDATE task_members
        SET removed_at = CURRENT_TIMESTAMP
        WHERE task_id = ${taskId} AND user_id = ${user.id} AND removed_at IS NULL
      `;
      return res.status(200).json({ message: 'Đã rút khỏi công việc.' });
    }

    // Get existing owner
    const existingMembersRes = await sql`
      SELECT user_id, assignment_role
      FROM task_members
      WHERE task_id = ${taskId} AND removed_at IS NULL
    `;
    const existingOwnerRow = existingMembersRes.find((m) => (m.assignment_role || m.assignmentRole) === 'owner');
    const existingOwner = existingOwnerRow?.user_id || existingOwnerRow?.userId;

    if (!canManageTask && !isTaskMember) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const managerOnlyFields = ['title', 'description', 'startDate', 'dueDate', 'ownerId'];
    if (!canManageTask && managerOnlyFields.some((field) => req.body[field] !== undefined)) {
      return res.status(403).json({ error: 'Chi Admin hoac quan ly du an duoc sua thong tin phan cong/cau truc task.' });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (req.body.ownerId && req.body.ownerId !== existingOwner && canManageTask && uuidRegex.test(String(projectId || ''))) {
      const ownerMembership = await sql`
        SELECT pm.id
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ${projectId}
          AND pm.user_id = ${req.body.ownerId}
          AND pm.removed_at IS NULL
          AND u.status = 'active'
      `;
      if (ownerMembership.length === 0) {
        return res.status(400).json({ error: 'Owner moi phai la thanh vien dang hoat dong trong du an.' });
      }
    }

    // Standard task update
    const title = req.body.title ?? task.title;
    const description = req.body.description ?? task.description;
    const priority = req.body.priority ?? task.priority;
    const nextStartDate = req.body.startDate !== undefined ? (req.body.startDate || null) : (task.start_date || null);
    const nextDueDate = req.body.dueDate !== undefined ? (req.body.dueDate || null) : (task.due_date || null);
    let newPercent = req.body.percentComplete !== undefined ? Number(req.body.percentComplete) : Number(task.percent_complete);
    let newStatus = req.body.status ?? task.status;
    let completedAt = task.completed_at;

    // Automatic status shift rule: > 0% = in_progress, 100% = done, 0% = todo
    if (newPercent === 100) {
      newStatus = 'done';
      completedAt = new Date();
    } else if (newPercent > 0 && newPercent < 100) {
      newStatus = 'in_progress';
      completedAt = null;
    } else if (newPercent === 0 && newStatus !== 'done') {
      newStatus = 'todo';
      completedAt = null;
    }

    await sql.begin(async (sqlTrans) => {
      await sqlTrans`
        UPDATE tasks
        SET 
          title = ${title.trim()},
          description = ${description || null},
          status = ${newStatus}::task_workflow_status,
          priority = ${priority},
          percent_complete = ${newPercent},
          start_date = ${nextStartDate},
          due_date = ${nextDueDate},
          completed_at = ${completedAt},
          version = version + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${taskId}
      `;

      // Update owner if specified by Admin or PM
      if (req.body.ownerId && req.body.ownerId !== existingOwner && canManageTask) {
        await sqlTrans`
          UPDATE task_members
          SET removed_at = CURRENT_TIMESTAMP
          WHERE task_id = ${taskId} AND assignment_role = 'owner' AND removed_at IS NULL
        `;
        await sqlTrans`
          INSERT INTO task_members (task_id, user_id, assignment_role, report_required)
          VALUES (${taskId}, ${req.body.ownerId}, 'owner', true)
        `;
      }

      // If task has a parent_id, automatically update parent task progress %
      if (task.parent_id) {
        const subtasks = await sqlTrans`
          SELECT percent_complete FROM tasks WHERE parent_id = ${task.parent_id} AND archived_at IS NULL
        `;
        if (subtasks.length > 0) {
          const totalSubPercent = subtasks.reduce((sum, st) => sum + Number(st.percent_complete || 0), 0);
          const avgPercent = Math.round(totalSubPercent / subtasks.length);
          const parentStatus = avgPercent === 100 ? 'done' : avgPercent > 0 ? 'in_progress' : 'todo';
          await sqlTrans`
            UPDATE tasks
            SET percent_complete = ${avgPercent}, status = ${parentStatus}::task_workflow_status
            WHERE id = ${task.parent_id}
          `;
        }
      }
    });

    return res.status(200).json({
      message: 'Task updated successfully',
      displayMessage: 'Cập nhật công việc thành công!',
    });
  } catch (error: any) {
    console.error('Update task error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
