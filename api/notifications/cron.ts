import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { sendEmail } from '../_shared/email.js';

// Get YYYY-MM-DD in Asia/Ho_Chi_Minh
function getTzDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Check if a date string 'YYYY-MM-DD' is a working day
async function isWorkingDay(dateStr: string): Promise<boolean> {
  const date = new Date(dateStr);
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  const isDefaultWeekday = day >= 1 && day <= 5;

  const holiday = await sql`
    SELECT 1 FROM non_working_days WHERE work_date = ${dateStr}
  `;
  if (holiday.length > 0) return false;

  return isDefaultWeekday;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', ['POST', 'GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const cronSecret = process.env.CRON_SECRET || 'dev_secret';
    const reqSecret = req.headers['x-cron-secret'] || req.query.secret;
    if (reqSecret !== cronSecret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dateStr = (req.query.date as string) || getTzDate();
    const isWorkDay = await isWorkingDay(dateStr);

    if (!isWorkDay) {
      return res.status(200).json({ message: 'Skipped: Not a working day.', date: dateStr });
    }

    // --- 1. MEMBER DIGESTS ---
    const activeUsers = await sql`
      SELECT id, username, full_name, email FROM users WHERE status = 'active'
    `;

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const threeDaysLater = new Date(dateStr);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const threeDaysLaterStr = getTzDate(threeDaysLater);

    for (const user of activeUsers) {
      // Check check-in status for today
      const checkins = await sql`
        SELECT id FROM daily_checkins WHERE user_id = ${user.id} AND checkin_date = ${dateStr}
      `;
      const hasCheckedIn = checkins.length > 0;

      // Overdue tasks
      const overdueTasks = await sql`
        SELECT id, title, due_date FROM tasks
        WHERE id IN (
          SELECT tm.task_id
          FROM task_members tm
          WHERE tm.user_id = ${user.id}
            AND tm.removed_at IS NULL
        )
          AND status != 'done'
          AND archived_at IS NULL
          AND due_date < ${dateStr}
      `;

      // Due soon tasks
      const dueSoonTasks = await sql`
        SELECT id, title, due_date FROM tasks
        WHERE id IN (
          SELECT tm.task_id
          FROM task_members tm
          WHERE tm.user_id = ${user.id}
            AND tm.removed_at IS NULL
        )
          AND status != 'done'
          AND archived_at IS NULL
          AND due_date >= ${dateStr}
          AND due_date <= ${threeDaysLaterStr}
      `;

      // Open blockers where user is owner or reporter
      const openBlockers = await sql`
        SELECT b.id, b.description, t.title as task_title
        FROM task_blockers b
        JOIN tasks t ON b.task_id = t.id
        WHERE b.status = 'open'
          AND t.archived_at IS NULL
          AND (
            b.reported_by = ${user.id}
            OR EXISTS (
              SELECT 1
              FROM task_members tm
              WHERE tm.task_id = t.id
                AND tm.user_id = ${user.id}
                AND tm.removed_at IS NULL
            )
          )
      `;

      // Check if user has anything to be notified about
      const hasContent = !hasCheckedIn || overdueTasks.length > 0 || dueSoonTasks.length > 0 || openBlockers.length > 0;

      if (hasContent) {
        const dedupeKey = `member_digest_${user.id}_${dateStr}`;
        const subject = `[AIT Work Tracker] Tóm tắt công việc ngày ${dateStr}`;
        const html = `
          <p>Chào ${user.full_name},</p>
          <p>Dưới đây là tóm tắt công việc của bạn trong ngày hôm nay:</p>
          <ul>
            <li><strong>Điểm danh hôm nay:</strong> ${hasCheckedIn ? 'Đã điểm danh' : '<span style="color: red;">Chưa điểm danh</span>'}</li>
            <li><strong>Công việc quá hạn:</strong> ${overdueTasks.length}</li>
            <li><strong>Công việc sắp đến hạn:</strong> ${dueSoonTasks.length}</li>
            <li><strong>Vướng mắc đang mở:</strong> ${openBlockers.length}</li>
          </ul>
          <p>Vui lòng truy cập <a href="${appUrl}/my-work">Công việc của tôi</a> để cập nhật thông tin.</p>
        `;

        sendEmail({
          recipientUserId: user.id,
          to: user.email || '',
          subject,
          html,
          type: 'member_digest',
          dedupeKey,
        }).catch(err => console.error(`Failed to send member digest to ${user.username}:`, err));
      }
    }

    // --- 2. ADMIN DIGESTS ---
    const activeAdmins = await sql`
      SELECT id, username, full_name, email FROM users WHERE role = 'admin' AND status = 'active'
    `;

    // Gather admin metrics
    const [totalUsersCount] = await sql`
      SELECT COUNT(*)::int as count FROM users WHERE status = 'active'
    `;
    const [checkedInCount] = await sql`
      SELECT COUNT(DISTINCT user_id)::int as count FROM daily_checkins WHERE checkin_date = ${dateStr}
    `;
    const [overdueTasksCount] = await sql`
      SELECT COUNT(*)::int as count FROM tasks WHERE status != 'done' AND due_date < ${dateStr}
    `;
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

    for (const admin of activeAdmins) {
      const dedupeKey = `admin_digest_${admin.id}_${dateStr}`;
      const subject = `[AIT Work Tracker] Tóm tắt hệ thống ngày ${dateStr} (Dành cho Admin)`;
      const html = `
        <p>Chào Admin ${admin.full_name},</p>
        <p>Báo cáo tình hình hệ thống ngày ${dateStr}:</p>
        <ul>
          <li><strong>Thống kê điểm danh:</strong> Đã checkin ${checkedInCount?.count || 0}/${totalUsersCount?.count || 0} thành viên.</li>
          <li><strong>Công việc quá hạn:</strong> ${overdueTasksCount?.count || 0}</li>
          <li><strong>Công việc sắp đến hạn (3 ngày):</strong> ${dueSoonTasksCount?.count || 0}</li>
          <li><strong>Công việc chưa đặt hạn:</strong> ${noDueDateCount?.count || 0}</li>
          <li><strong>Số lượng vướng mắc đang mở:</strong> ${openBlockersCount?.count || 0}</li>
          <li><strong>Thành viên chưa cấu hình email:</strong> ${noEmailUsers.length} người.</li>
          <li><strong>Số email gửi lỗi hôm nay:</strong> ${emailFailuresCount?.count || 0}</li>
        </ul>
        <p>Xem chi tiết tại <a href="${appUrl}/admin/dashboard">Bảng quản trị</a>.</p>
      `;

      sendEmail({
        recipientUserId: admin.id,
        to: admin.email || '',
        subject,
        html,
        type: 'admin_digest',
        dedupeKey,
      }).catch(err => console.error(`Failed to send admin digest to ${admin.username}:`, err));
    }

    return res.status(200).json({ message: 'Cron job executed successfully.', date: dateStr });
  } catch (error) {
    console.error('Cron job execution error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
