import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../../_shared/auth.js';
import { sql } from '../../_shared/db.js';
import { rejectInvalidMutation } from '../../_shared/http.js';

const revokeSessionSchema = z.object({
  userId: z.string().uuid(),
  sessionId: z.string().uuid().optional(),
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
    const parseResult = revokeSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { userId, sessionId } = parseResult.data;
    const now = new Date();

    // 3. Revoke sessions inside transaction
    await sql.begin(async (sqlTrans) => {
      if (sessionId) {
        // Revoke a single session
        await sqlTrans`
          UPDATE auth_sessions
          SET revoked_at = ${now}
          WHERE id = ${sessionId} AND user_id = ${userId} AND revoked_at IS NULL
        `;

        // Insert audit log
        await sqlTrans`
          INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
          VALUES (${adminId}, 'user', 'user', ${userId}, 'revoke_session', ${null}, ${JSON.stringify({ sessionId })})
        `;
      } else {
        // Revoke all sessions of user
        await sqlTrans`
          UPDATE auth_sessions
          SET revoked_at = ${now}
          WHERE user_id = ${userId} AND revoked_at IS NULL
        `;

        // Insert audit log
        await sqlTrans`
          INSERT INTO activity_logs (actor_id, actor_type, entity_type, entity_id, action, old_values, new_values)
          VALUES (${adminId}, 'user', 'user', ${userId}, 'revoke_all_sessions', ${null}, ${null})
        `;
      }
    });

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    console.error('Revoke session error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
