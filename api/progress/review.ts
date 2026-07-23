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
    const { progressUpdateId, action, finalPercent, reviewNote } = req.body;

    if (!progressUpdateId || typeof progressUpdateId !== 'string') {
      return res.status(400).json({ error: 'Missing progressUpdateId' });
    }
    if (!action || !['approved', 'adjusted'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approved" or "adjusted"' });
    }

    // Fetch the progress update
    const puRes = await sql`
      SELECT pu.*, t.project_id, t.version as task_version
      FROM progress_updates pu
      JOIN tasks t ON t.id = pu.task_id
      WHERE pu.id = ${progressUpdateId} AND pu.status = 'pending'
    `;

    if (puRes.length === 0) {
      return res.status(404).json({ error: 'Yêu cầu không tồn tại hoặc đã được duyệt.' });
    }

    const pu = puRes[0] as any;

    // Check permission: only admin or project manager can review
    const projRes = await sql`
      SELECT manager_id FROM projects WHERE id = ${pu.project_id}
    `;

    if (user.role !== 'admin' && projRes[0]?.manager_id !== user.id) {
      return res.status(403).json({ error: 'Chỉ admin hoặc quản lý dự án mới được duyệt.' });
    }

    // Determine final percent
    let approvedPercent: number;
    if (action === 'approved') {
      approvedPercent = pu.proposed_percent;
    } else {
      // adjusted
      if (typeof finalPercent !== 'number' || finalPercent < 0 || finalPercent > 100) {
        return res.status(400).json({ error: 'finalPercent must be 0-100 when adjusting' });
      }
      approvedPercent = finalPercent;
    }

    // Transaction: update progress_updates + tasks
    await sql.begin(async (tx) => {
      // Update the progress update record
      await tx`
        UPDATE progress_updates
        SET status = ${action}, reviewed_by = ${user.id}, reviewed_at = CURRENT_TIMESTAMP,
            final_percent = ${approvedPercent}, review_note = ${reviewNote || null}
        WHERE id = ${progressUpdateId}
      `;

      // Update task percent_complete and auto-shift status
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
        WHERE id = ${pu.task_id}
      `;

      // Activity log
      await tx`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, new_values)
        VALUES (${user.id}, 'user', 'task', ${pu.task_id}, 'review_progress',
          ${JSON.stringify({
            action,
            proposedPercent: pu.proposed_percent,
            finalPercent: approvedPercent,
            reviewNote: reviewNote || null,
            submittedBy: pu.submitted_by,
          })}
        )
      `;
    });

    return res.status(200).json({
      message: action === 'approved'
        ? `Đã duyệt tiến độ ${approvedPercent}%.`
        : `Đã điều chỉnh tiến độ thành ${approvedPercent}%.`,
    });
  } catch (error: any) {
    console.error('Progress review error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
