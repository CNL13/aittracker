/* eslint-disable */
// @ts-nocheck
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const { taskId, proposedPercent, description, evidenceUrl } = req.body;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ error: 'Missing taskId' });
    }
    if (typeof proposedPercent !== 'number' || proposedPercent < 0 || proposedPercent > 100) {
      return res.status(400).json({ error: 'proposedPercent must be 0-100' });
    }

    // Check task exists and user is a member
    const taskRes = await sql`
      SELECT t.id, t.project_id, t.percent_complete, t.status,
             p.manager_id as project_manager_id
      FROM tasks t
      JOIN task_members tm ON tm.task_id = t.id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = ${taskId} AND t.archived_at IS NULL
    `;

    if (taskRes.length === 0) {
      return res.status(404).json({ error: 'Task not found or you are not assigned' });
    }
    const task = taskRes[0] as any;
    if (Number(task.percent_complete || 0) >= 100 || task.status === 'done') {
      return res.status(400).json({ error: 'Task da hoan thanh 100% va khong can cap nhat tien do them.' });
    }

    // AUTO-APPROVE: Admin hoặc Project Manager tự động được duyệt ngay, không cần chờ
    const isAdminOrPM = user.role === 'admin' || task.project_manager_id === user.id;
    if (isAdminOrPM) {
      const approvedPercent = proposedPercent;
      await sql.begin(async (tx: any) => {
        const result = await tx`
          INSERT INTO progress_updates (task_id, submitted_by, proposed_percent, description, evidence_url, status, reviewed_by, reviewed_at, final_percent)
          VALUES (${taskId}, ${user.id}, ${approvedPercent}, ${description || null}, ${evidenceUrl || null},
                  'approved', ${user.id}, CURRENT_TIMESTAMP, ${approvedPercent})
          RETURNING id
        `;
        await tx`
          UPDATE tasks
          SET percent_complete = ${approvedPercent},
              status = CASE
                WHEN ${approvedPercent} = 100 THEN 'done'::task_workflow_status
                WHEN ${approvedPercent} > 0 THEN 'in_progress'::task_workflow_status
                ELSE 'todo'::task_workflow_status
              END,
              completed_at = CASE WHEN ${approvedPercent} = 100 THEN CURRENT_TIMESTAMP ELSE NULL END,
              version = version + 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${taskId}
        `;
        await tx`
          INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, new_values)
          VALUES (${user.id}, 'user', 'task', ${taskId}, 'review_progress',
            ${JSON.stringify({ action: 'approved', proposedPercent: approvedPercent, finalPercent: approvedPercent, autoApproved: true, submittedBy: user.id })}
          )
        `;
      });
      return res.status(201).json({
        message: `Đã cập nhật & tự động phê duyệt tiến độ ${approvedPercent}%.`,
        autoApproved: true,
        approvedPercent,
      });
    }

    // Nhân viên thường: kiểm tra không có request đang chờ duyệt
    const pendingRes = await sql`
      SELECT id FROM progress_updates
      WHERE task_id = ${taskId} AND submitted_by = ${user.id} AND status = 'pending'
    `;

    if (pendingRes.length > 0) {
      return res.status(400).json({ error: 'Bạn đã có yêu cầu đang chờ duyệt cho task này.' });
    }

    // Insert progress update
    const result = await sql`
      INSERT INTO progress_updates (task_id, submitted_by, proposed_percent, description, evidence_url)
      VALUES (${taskId}, ${user.id}, ${proposedPercent}, ${description || null}, ${evidenceUrl || null})
      RETURNING id
    `;

    return res.status(201).json({
      message: 'Yêu cầu cập nhật tiến độ đã được gửi. PM sẽ duyệt.',
      id: result[0].id,
    });
  } catch (error: any) {
    console.error('Progress submit error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
