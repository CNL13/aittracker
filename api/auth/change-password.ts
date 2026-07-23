import type { VercelRequest, VercelResponse } from '@vercel/node';
import { changePasswordSchema } from '@ait/validation';
import bcrypt from 'bcryptjs';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';
import { rejectInvalidMutation } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for password change
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (rejectInvalidMutation(req, res)) {
    return;
  }

  try {
    // 1. Authenticate user
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user, session } = sessionContext;

    // 2. Validate request body
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { currentPassword, newPassword } = parseResult.data;

    // 3. Verify current password
    const credentials = await sql`
      SELECT password_hash
      FROM user_credentials
      WHERE user_id = ${user.id}
    `;

    if (!credentials || credentials.length === 0) {
      return res.status(401).json({ error: 'Không tìm thấy thông tin xác thực của người dùng.' });
    }

    const currentHash = credentials[0]!['password_hash'];
    const passwordMatch = await bcrypt.compare(currentPassword, currentHash);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không chính xác.' });
    }

    // 4. Hash new password and update credentials
    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();

    // Use transaction if possible, or execute queries sequentially
    await sql.begin(async (sqlTrans) => {
      // Update credentials
      await sqlTrans`
        UPDATE user_credentials
        SET password_hash = ${newHash},
            password_changed_at = ${now}
        WHERE user_id = ${user.id}
      `;

      // Update must_change_password flag
      await sqlTrans`
        UPDATE users
        SET must_change_password = ${false}
        WHERE id = ${user.id}
      `;

      // Force logout other active sessions
      await sqlTrans`
        UPDATE auth_sessions
        SET revoked_at = ${now}
        WHERE user_id = ${user.id} AND id != ${session.id} AND revoked_at IS NULL
      `;
    });

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    console.error('Change password error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
