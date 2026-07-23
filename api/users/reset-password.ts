import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { rejectInvalidMutation } from '../_shared/http.js';

const resetPasswordSchema = z.object({
  id: z.string().uuid(),
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
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { id } = parseResult.data;

    // 3. Fetch target user
    const users = await sql`
      SELECT id, username
      FROM users
      WHERE id = ${id}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    }

    // 4. Generate secure random temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex') + 'a1A';
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const now = new Date();

    // 5. Reset password in database and revoke sessions in transaction
    await sql.begin(async (sqlTrans) => {
      // Set must_change_password flag
      await sqlTrans`
        UPDATE users
        SET must_change_password = ${true}
        WHERE id = ${id}
      `;

      // Update password hash and clear locks/failed attempts
      await sqlTrans`
        UPDATE user_credentials
        SET password_hash = ${passwordHash},
            failed_login_count = 0,
            locked_until = null,
            password_changed_at = ${now}
        WHERE user_id = ${id}
      `;

      // Revoke all sessions for this user
      await sqlTrans`
        UPDATE auth_sessions
        SET revoked_at = ${now}
        WHERE user_id = ${id} AND revoked_at IS NULL
      `;

      // Insert audit log
      await sqlTrans`
        INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
        VALUES (${adminId}, 'user', 'user', ${id}, 'reset_password', ${null}, ${null})
      `;
    });

    return res.status(200).json({
      success: true,
      temporaryPassword: tempPassword,
    });
  } catch (error: unknown) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
