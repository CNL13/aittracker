import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  // POST: send a nudge notification
  if (req.method === 'POST') {
    if (session.user.role !== 'admin') {
      return res.status(403).json({ error: 'Chỉ admin mới có thể gửi thông báo đốc thúc.' });
    }

    const { recipientUserId, type, title, message, link } = req.body || {};

    if (!recipientUserId || !type || !title) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc: recipientUserId, type, title.' });
    }

    const validTypes = ['nudge_report', 'nudge_task', 'project_approved', 'project_rejected', 'task_assigned', 'system'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Loại thông báo không hợp lệ. Hợp lệ: ${validTypes.join(', ')}` });
    }

    try {
      await sql`
        INSERT INTO in_app_notifications (recipient_user_id, sender_user_id, type, title, message, link)
        VALUES (${recipientUserId}, ${session.user.id}, ${type}, ${title}, ${message || null}, ${link || null})
      `;
      return res.status(201).json({ message: 'Đã gửi thông báo thành công.' });
    } catch (error) {
      console.error('Send notification error:', error);
      return res.status(500).json({ error: 'Lỗi hệ thống.' });
    }
  }

  // GET: list notifications for current user
  if (req.method === 'GET') {
    const { unreadOnly, limit = '20' } = req.query as Record<string, string>;

    try {
      const limitNum = Math.min(parseInt(limit) || 20, 50);

      let notifications;
      if (unreadOnly === 'true') {
        notifications = await sql`
          SELECT n.*, u.full_name as sender_name
          FROM in_app_notifications n
          LEFT JOIN users u ON n.sender_user_id = u.id
          WHERE n.recipient_user_id = ${session.user.id} AND n.read_at IS NULL
          ORDER BY n.created_at DESC
          LIMIT ${limitNum}
        `;
      } else {
        notifications = await sql`
          SELECT n.*, u.full_name as sender_name
          FROM in_app_notifications n
          LEFT JOIN users u ON n.sender_user_id = u.id
          WHERE n.recipient_user_id = ${session.user.id}
          ORDER BY n.created_at DESC
          LIMIT ${limitNum}
        `;
      }

      const unreadCountResult = await sql`
        SELECT COUNT(*)::int as count FROM in_app_notifications
        WHERE recipient_user_id = ${session.user.id} AND read_at IS NULL
      `;

      return res.status(200).json({
        notifications: notifications.map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          link: n.link,
          senderName: n.sender_name,
          readAt: n.read_at,
          createdAt: n.created_at,
        })),
        unreadCount: unreadCountResult[0]?.count || 0,
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Lỗi hệ thống.' });
    }
  }

  // PATCH: mark notifications as read
  if (req.method === 'PATCH') {
    const { notificationId, markAllRead } = req.body || {};

    try {
      if (markAllRead) {
        await sql`
          UPDATE in_app_notifications SET read_at = NOW()
          WHERE recipient_user_id = ${session.user.id} AND read_at IS NULL
        `;
      } else if (notificationId) {
        await sql`
          UPDATE in_app_notifications SET read_at = NOW()
          WHERE id = ${notificationId} AND recipient_user_id = ${session.user.id}
        `;
      } else {
        return res.status(400).json({ error: 'Cần notificationId hoặc markAllRead.' });
      }
      return res.status(200).json({ message: 'Đã đánh dấu đã đọc.' });
    } catch (error) {
      console.error('Mark read error:', error);
      return res.status(500).json({ error: 'Lỗi hệ thống.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
