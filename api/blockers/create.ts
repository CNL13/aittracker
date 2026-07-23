import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createBlockerSchema } from '@ait/validation';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { sendEmail } from '../_shared/email.js';
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
    const userId = sessionContext.user.id;

    const parsedBody = createBlockerSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: 'Invalid input', details: parsedBody.error.flatten() });
    }

    const { taskId, description } = parsedBody.data;

    // Check if user is an active participant
    const participants = await sql<{ user_id: string }[]>`
      SELECT tm.user_id
      FROM task_members tm
      JOIN tasks t ON t.id = tm.task_id
      WHERE tm.task_id = ${taskId}
        AND tm.removed_at IS NULL
        AND t.archived_at IS NULL
    `;
    const isParticipant = participants.some((p: any) => p.user_id === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Only task participants can report blockers' });
    }

    // Check max 1 open blocker per task for this user
    const [existingOpen] = await sql`
      SELECT id FROM task_blockers
      WHERE task_id = ${taskId} AND reported_by = ${userId} AND status = 'open'
    `;
    if (existingOpen) {
      return res.status(409).json({ error: 'You already have an open blocker for this task' });
    }

    const result = await sql.begin(async (tx) => {
      // 1. Insert into task_blockers
      const [blocker] = await tx`
        INSERT INTO task_blockers (task_id, reported_by, description, status)
        VALUES (${taskId}, ${userId}, ${description}, 'open')
        RETURNING id, task_id, reported_by as "reporter_id", description, status, created_at
      `;

      // 2. Write audit log
      await tx`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action)
        VALUES (${userId}, 'user', 'task_blocker', ${blocker!.id}, 'create_blocker')
      `;

      return blocker;
    }) as any;

    // 3. Post-transaction email notification to active admins
    const activeAdmins = await sql`
      SELECT id, email, full_name FROM users WHERE role = 'admin' AND status = 'active'
    `;
    const taskRows = await sql`
      SELECT t.title as task_title, p.name as project_name, u.full_name as reporter_name, t.project_id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN users u ON u.id = ${userId}
      WHERE t.id = ${taskId}
    `;
    const taskWithProject = taskRows[0];

    if (taskWithProject) {
      for (const admin of activeAdmins) {
        const dedupeKey = `blocker-alert:${result.id}:${admin.id}`;
        sendEmail({
          recipientUserId: admin.id,
          to: admin.email || '',
          subject: `[Vướng mắc] Công việc "${taskWithProject.task_title}" bị chặn`,
          html: `
            <p>Chào ${admin.full_name},</p>
            <p>Một vướng mắc mới đã được báo cáo:</p>
            <ul>
              <li><strong>Dự án:</strong> ${taskWithProject.project_name}</li>
              <li><strong>Công việc:</strong> ${taskWithProject.task_title}</li>
              <li><strong>Người báo cáo:</strong> ${taskWithProject.reporter_name}</li>
              <li><strong>Mô tả vướng mắc:</strong> ${description}</li>
              <li><strong>Thời điểm:</strong> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</li>
            </ul>
          `,
          type: 'blocker_alert',
          dedupeKey,
        }).catch(err => console.error('Failed to send blocker alert email:', err));
      }
    }

    return res.status(201).json({ data: result });
  } catch (error) {
    console.error('Create blocker error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
