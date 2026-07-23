import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext || sessionContext.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const status = req.query.status as string || '';
    const search = req.query.search as string || '';

    const offset = (page - 1) * limit;

    // Build dynamic filter fragments
    const statusFilter = status
      ? sql`AND n.status = ${status}`
      : sql``;
    const searchFilter = search
      ? sql`AND (u.username ILIKE ${`%${search.trim()}%`} OR u.full_name ILIKE ${`%${search.trim()}%`} OR u.email ILIKE ${`%${search.trim()}%`})`
      : sql``;

    // We query notifications_log joined with users
    const logs = await sql`
      SELECT 
        n.id,
        n.recipient_user_id as "recipientUserId",
        n.notification_date as "notificationDate",
        n.notification_type as "notificationType",
        n.channel,
        n.status,
        n.dedupe_key as "dedupeKey",
        n.provider_message_id as "providerMessageId",
        n.error_code as "errorCode",
        n.error_message as "errorMessage",
        n.original_notification_id as "originalNotificationId",
        n.created_at as "createdAt",
        n.sent_at as "sentAt",
        u.username as "recipientUsername",
        u.full_name as "recipientFullName",
        u.email as "recipientEmail"
      FROM notifications_log n
      LEFT JOIN users u ON n.recipient_user_id = u.id
      WHERE 1=1
        ${statusFilter}
        ${searchFilter}
      ORDER BY n.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [totalCount] = await sql`
      SELECT COUNT(*)::int as count
      FROM notifications_log n
      LEFT JOIN users u ON n.recipient_user_id = u.id
      WHERE 1=1
        ${statusFilter}
        ${searchFilter}
    `;

    return res.status(200).json({
      data: logs,
      total: totalCount ? totalCount.count : 0,
    });
  } catch (error) {
    console.error('Email log retrieval error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
