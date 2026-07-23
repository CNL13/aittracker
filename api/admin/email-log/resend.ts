import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';
import { sendEmail } from '../../_shared/email.js';
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
    const sessionContext = await getSession(req);
    if (!sessionContext || sessionContext.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { notificationId } = req.body;
    if (!notificationId) {
      return res.status(400).json({ error: 'Missing notificationId' });
    }

    // 1. Fetch original log
    const [originalLog] = await sql`
      SELECT id, recipient_user_id, notification_type, dedupe_key, status
      FROM notifications_log
      WHERE id = ${notificationId}
    `;

    if (!originalLog) {
      return res.status(404).json({ error: 'Notification log not found' });
    }

    // 2. Fetch recipient user details
    const [recipient] = await sql`
      SELECT id, username, full_name, email FROM users WHERE id = ${originalLog.recipient_user_id}
    `;

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient user not found' });
    }

    const dedupeKey = originalLog.dedupe_key;
    let subject = '';
    let html = '';
    const toEmail = recipient.email;

    if (originalLog.notification_type === 'blocker_alert') {
      const parts = dedupeKey.includes(':') ? dedupeKey.split(':') : dedupeKey.split('_');
      const blockerId = dedupeKey.includes(':') ? parts[1] : parts[2];
      const [blocker] = await sql`
        SELECT b.id, b.description, b.created_at, t.title as task_title, p.name as project_name, u.full_name as reporter_name
        FROM task_blockers b
        JOIN tasks t ON b.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        JOIN users u ON b.reported_by = u.id
        WHERE b.id = ${blockerId}
      `;
      if (!blocker) {
        return res.status(404).json({ error: 'Original blocker not found for reconstruction' });
      }
      subject = `[Vướng mắc] Công việc "${blocker.task_title}" bị chặn (Gửi lại)`;
      html = `
        <p>Chào ${recipient.full_name},</p>
        <p>Một vướng mắc mới đã được báo cáo (Gửi lại):</p>
        <ul>
          <li><strong>Dự án:</strong> ${blocker.project_name}</li>
          <li><strong>Công việc:</strong> ${blocker.task_title}</li>
          <li><strong>Người báo cáo:</strong> ${blocker.reporter_name}</li>
          <li><strong>Mô tả vướng mắc:</strong> ${blocker.description}</li>
          <li><strong>Thời điểm:</strong> ${new Date(blocker.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</li>
        </ul>
      `;
    } else if (originalLog.notification_type === 'member_digest') {
      const parts = dedupeKey.includes(':') ? dedupeKey.split(':') : dedupeKey.split('_');
      const dateStr = parts[parts.length - 1];

      // Reconstruct member digest
      const checkins = await sql`
        SELECT id FROM daily_checkins WHERE user_id = ${recipient.id} AND checkin_date = ${dateStr}
      `;
      const hasCheckedIn = checkins.length > 0;

      const overdueTasks = await sql`
        SELECT id, title, due_date FROM tasks
        WHERE id IN (
          SELECT tm.task_id
          FROM task_members tm
          WHERE tm.user_id = ${recipient.id}
            AND tm.removed_at IS NULL
        )
          AND status != 'done'
          AND archived_at IS NULL
          AND due_date < ${dateStr}
      `;

      const threeDaysLater = new Date(dateStr);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const threeDaysLaterStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(threeDaysLater);

      const dueSoonTasks = await sql`
        SELECT id, title, due_date FROM tasks
        WHERE id IN (
          SELECT tm.task_id
          FROM task_members tm
          WHERE tm.user_id = ${recipient.id}
            AND tm.removed_at IS NULL
        )
          AND status != 'done'
          AND archived_at IS NULL
          AND due_date >= ${dateStr}
          AND due_date <= ${threeDaysLaterStr}
      `;

      const openBlockers = await sql`
        SELECT b.id, b.description, t.title as task_title
        FROM task_blockers b
        JOIN tasks t ON b.task_id = t.id
        WHERE b.status = 'open'
          AND t.archived_at IS NULL
          AND (
            b.reported_by = ${recipient.id}
            OR EXISTS (
              SELECT 1
              FROM task_members tm
              WHERE tm.task_id = t.id
                AND tm.user_id = ${recipient.id}
                AND tm.removed_at IS NULL
            )
          )
      `;

      subject = `[AIT Work Tracker] Tóm tắt công việc ngày ${dateStr} (Gửi lại)`;
      html = `
        <p>Chào ${recipient.full_name},</p>
        <p>Dưới đây là tóm tắt công việc của bạn trong ngày ${dateStr} (Gửi lại):</p>
        <ul>
          <li><strong>Điểm danh hôm nay:</strong> ${hasCheckedIn ? 'Đã điểm danh' : '<span style="color: red;">Chưa điểm danh</span>'}</li>
          <li><strong>Công việc quá hạn:</strong> ${overdueTasks.length}</li>
          <li><strong>Công việc sắp đến hạn:</strong> ${dueSoonTasks.length}</li>
          <li><strong>Vướng mắc đang mở:</strong> ${openBlockers.length}</li>
        </ul>
      `;
    } else if (originalLog.notification_type === 'admin_digest') {
      const parts = dedupeKey.includes(':') ? dedupeKey.split(':') : dedupeKey.split('_');
      const dateStr = parts[parts.length - 1];

      // Reconstruct admin digest
      const [totalUsersCount] = await sql`
        SELECT COUNT(*)::int as count FROM users WHERE status = 'active'
      `;
      const [checkedInCount] = await sql`
        SELECT COUNT(DISTINCT user_id)::int as count FROM daily_checkins WHERE checkin_date = ${dateStr}
      `;
      const [overdueTasksCount] = await sql`
        SELECT COUNT(*)::int as count FROM tasks WHERE status != 'done' AND due_date < ${dateStr}
      `;
      const threeDaysLater = new Date(dateStr);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const threeDaysLaterStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(threeDaysLater);

      const [dueSoonTasksCount] = await sql`
        SELECT COUNT(*)::int as count FROM tasks WHERE status != 'done' AND due_date >= ${dateStr} AND due_date <= ${threeDaysLaterStr}
      `;
      const [noDueDateCount] = await sql`
        SELECT COUNT(*)::int as count FROM tasks WHERE status != 'done' AND due_date IS NULL
      `;
      const [openBlockersCount] = await sql`
        SELECT COUNT(*)::int as count FROM task_blockers WHERE status = 'open'
      `;
      const noEmailUsers = await sql`
        SELECT username, full_name FROM users WHERE status = 'active' AND email IS NULL
      `;
      const [emailFailuresCount] = await sql`
        SELECT COUNT(*)::int as count FROM notifications_log 
        WHERE status = 'failed' AND created_at >= ${dateStr + ' 00:00:00'}
      `;

      subject = `[AIT Work Tracker] Tóm tắt hệ thống ngày ${dateStr} (Dành cho Admin) (Gửi lại)`;
      html = `
        <p>Chào Admin ${recipient.full_name},</p>
        <p>Báo cáo tình hình hệ thống ngày ${dateStr} (Gửi lại):</p>
        <ul>
          <li><strong>Thống kê điểm danh:</strong> Đã checkin ${checkedInCount?.count || 0}/${totalUsersCount?.count || 0} thành viên.</li>
          <li><strong>Công việc quá hạn:</strong> ${overdueTasksCount?.count || 0}</li>
          <li><strong>Công việc sắp đến hạn (3 ngày):</strong> ${dueSoonTasksCount?.count || 0}</li>
          <li><strong>Công việc chưa đặt hạn:</strong> ${noDueDateCount?.count || 0}</li>
          <li><strong>Số lượng vướng mắc đang mở:</strong> ${openBlockersCount?.count || 0}</li>
          <li><strong>Thành viên chưa cấu hình email:</strong> ${noEmailUsers.length} người.</li>
          <li><strong>Số email gửi lỗi hôm nay:</strong> ${emailFailuresCount?.count || 0}</li>
        </ul>
      `;
    } else {
      return res.status(400).json({ error: 'Unknown notification type' });
    }

    const newDedupeKey = `resend_${originalLog.id}_${Date.now()}`;
    const result = await sendEmail({
      recipientUserId: recipient.id,
      to: toEmail || '',
      subject,
      html,
      type: originalLog.notification_type,
      dedupeKey: newDedupeKey,
      originalNotificationId: originalLog.id,
    });

    return res.status(200).json({ data: result });
  } catch (error) {
    console.error('Email resend error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
