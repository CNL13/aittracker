import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

const toggleStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'locked', 'inactive']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    // 1. Authenticate and check Admin role
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (sessionContext.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const adminId = sessionContext.user.id;

    // 2. Validate request body
    const parseResult = toggleStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { id, status } = parseResult.data;

    // 3. Fetch target user
    const users = await sql`
      SELECT id, role, status
      FROM users
      WHERE id = ${id}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    const targetUser = users[0]!;
    const oldStatus = targetUser['status'];

    // 4. Last Admin Guard: check if locking or deactivating the last active admin
    const isTargetActiveAdmin = targetUser['role'] === 'admin' && oldStatus === 'active';
    if (status !== 'active' && isTargetActiveAdmin) {
      const activeAdminCountResult = await sql`
        SELECT COUNT(*)::int as count FROM users WHERE role = 'admin' AND status = 'active'
      `;
      const activeAdminCount = activeAdminCountResult[0]?.count || 0;
      if (activeAdminCount <= 1) {
        return res.status(400).json({
          error: 'Không thể khóa hoặc vô hiệu hóa quản trị viên hoạt động cuối cùng.',
        });
      }
    }

    const now = new Date();

    // 5. Update user and revoke sessions in transaction
    await sql.begin(async (sqlTrans) => {
      const deactivatedAt = status === 'inactive' ? now : null;

      // Update user status
      await sqlTrans`
        UPDATE users
        SET status = ${status},
            deactivated_at = ${deactivatedAt}
        WHERE id = ${id}
      `;

      // Revoke all sessions if setting status to locked or inactive
      if (status !== 'active') {
        await sqlTrans`
          UPDATE auth_sessions
          SET revoked_at = ${now}
          WHERE user_id = ${id} AND revoked_at IS NULL
        `;
      }

      // Insert audit log
      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, 'user', 'user', ${id}, 'toggle_status', ${JSON.stringify({ status: oldStatus })}, ${JSON.stringify({ status })})
      `;
    });

    return res.status(200).json({
      id,
      status,
      success: true,
    });
  } catch (error: unknown) {
    console.error('Toggle status error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
