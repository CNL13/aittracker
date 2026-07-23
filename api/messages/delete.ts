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
    const { messageId } = req.body;

    if (!messageId || typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Missing messageId' });
    }

    // Find the message
    const msgRes = await sql`
      SELECT pm.*, p.manager_id
      FROM project_messages pm
      JOIN projects p ON p.id = pm.project_id
      WHERE pm.id = ${messageId} AND pm.deleted_at IS NULL
    `;

    if (msgRes.length === 0) {
      return res.status(404).json({ error: 'Tin nhắn không tồn tại.' });
    }

    const msg = msgRes[0] as any;

    // Only sender, admin, or PM can delete
    if (user.role !== 'admin' && msg.sender_id !== user.id && msg.manager_id !== user.id) {
      return res.status(403).json({ error: 'Bạn không có quyền xóa tin nhắn này.' });
    }

    await sql`
      UPDATE project_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ${messageId}
    `;

    return res.status(200).json({ message: 'Đã xóa tin nhắn.' });
  } catch (error: any) {
    console.error('Message delete error:', error);
    return res.status(500).json({ error: 'Đã xảy ra lỗi hệ thống.' });
  }
}
