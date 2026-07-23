import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const users = await sql`
      SELECT id, username, full_name, email, role, status, must_change_password,
             avatar_url, department, position, last_login_at, created_at, updated_at
      FROM users
      WHERE id = ${user.id}
    `;

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng' });
    }

    const dbUser = users[0]!;
    return res.status(200).json({
      user: {
        id: dbUser['id'],
        username: dbUser['username'],
        fullName: dbUser['full_name'],
        email: dbUser['email'],
        role: dbUser['role'],
        status: dbUser['status'],
        mustChangePassword: dbUser['must_change_password'],
        avatarUrl: dbUser['avatar_url'] || null,
        department: dbUser['department'] || null,
        position: dbUser['position'] || null,
        lastLoginAt: toIsoOrNull(dbUser['last_login_at']),
        createdAt: toIsoOrNull(dbUser['created_at']),
        updatedAt: toIsoOrNull(dbUser['updated_at']),
      },
    });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
