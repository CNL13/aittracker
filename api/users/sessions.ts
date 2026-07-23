import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

const sessionsQuerySchema = z.object({
  userId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
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

    // 2. Validate request query
    const parseResult = sessionsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { userId, limit, offset } = parseResult.data;

    // 3. Fetch user sessions
    const sessions = await sql`
      SELECT id, created_at, last_seen_at, expires_at, revoked_at, user_agent, ip_hash
      FROM auth_sessions
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // 4. Fetch total count of user sessions
    const countResult = await sql`
      SELECT COUNT(*)::int as count
      FROM auth_sessions
      WHERE user_id = ${userId}
    `;

    const total = countResult[0]?.count || 0;

    return res.status(200).json({
      sessions: sessions.map((s) => ({
        id: s['id'],
        createdAt: new Date(s['created_at']).toISOString(),
        lastSeenAt: new Date(s['last_seen_at']).toISOString(),
        expiresAt: new Date(s['expires_at']).toISOString(),
        revokedAt: s['revoked_at'] ? new Date(s['revoked_at']).toISOString() : null,
        userAgent: s['user_agent'] || null,
        ipHash: s['ip_hash'] || null,
      })),
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    console.error('List sessions error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
