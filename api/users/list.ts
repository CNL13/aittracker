import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

const listQuerySchema = z.object({
  search: z.preprocess(v => (v === '' ? undefined : v), z.string().optional()),
  role: z.preprocess(v => (v === '' ? undefined : v), z.enum(['admin', 'member']).optional()),
  status: z.preprocess(v => (v === '' ? undefined : v), z.enum(['active', 'locked', 'inactive']).optional()),
  sortBy: z.preprocess(v => (v === '' ? undefined : v), z.enum(['username', 'full_name', 'email', 'role', 'status', 'created_at']).default('created_at')),
  sortOrder: z.preprocess(v => (v === '' ? undefined : v), z.enum(['asc', 'desc']).default('desc')),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  page: z.coerce.number().int().min(1).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2. Validate query params
    const parseResult = listQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid Request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { search, role, status, sortBy, sortOrder, limit, page, offset } = parseResult.data;
    const resolvedOffset = page ? (page - 1) * limit : offset;

    const isAdmin = sessionContext.user.role === 'admin';
    if (!isAdmin && (status !== 'active' || role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const searchParam = search ? `%${search.trim()}%` : null;
    const roleParam = role || null;
    const statusParam = isAdmin ? (status || null) : 'active';

    // 3. Build dynamic queries
    let dataQuery = sql`
      SELECT id, username, full_name, email, phone_number, role, status, must_change_password,
             avatar_url, department, position, last_login_at, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    let countQuery = sql`SELECT COUNT(*)::int as count FROM users WHERE 1=1`;

    if (searchParam) {
      dataQuery  = sql`${dataQuery}  AND (username ILIKE ${searchParam} OR full_name ILIKE ${searchParam} OR email ILIKE ${searchParam} OR department ILIKE ${searchParam} OR position ILIKE ${searchParam})`;
      countQuery = sql`${countQuery} AND (username ILIKE ${searchParam} OR full_name ILIKE ${searchParam} OR email ILIKE ${searchParam} OR department ILIKE ${searchParam} OR position ILIKE ${searchParam})`;
    }
    if (roleParam) {
      dataQuery  = sql`${dataQuery}  AND role = ${roleParam}::user_role`;
      countQuery = sql`${countQuery} AND role = ${roleParam}::user_role`;
    }
    if (statusParam) {
      dataQuery  = sql`${dataQuery}  AND status = ${statusParam}::user_status`;
      countQuery = sql`${countQuery} AND status = ${statusParam}::user_status`;
    }

    dataQuery = sql`${dataQuery}
      ORDER BY
        CASE WHEN ${sortBy} = 'username'   AND ${sortOrder} = 'asc'  THEN username    END ASC,
        CASE WHEN ${sortBy} = 'username'   AND ${sortOrder} = 'desc' THEN username    END DESC,
        CASE WHEN ${sortBy} = 'full_name'  AND ${sortOrder} = 'asc'  THEN full_name   END ASC,
        CASE WHEN ${sortBy} = 'full_name'  AND ${sortOrder} = 'desc' THEN full_name   END DESC,
        CASE WHEN ${sortBy} = 'email'      AND ${sortOrder} = 'asc'  THEN email       END ASC,
        CASE WHEN ${sortBy} = 'email'      AND ${sortOrder} = 'desc' THEN email       END DESC,
        CASE WHEN ${sortBy} = 'role'       AND ${sortOrder} = 'asc'  THEN role::text  END ASC,
        CASE WHEN ${sortBy} = 'role'       AND ${sortOrder} = 'desc' THEN role::text  END DESC,
        CASE WHEN ${sortBy} = 'status'     AND ${sortOrder} = 'asc'  THEN status::text END ASC,
        CASE WHEN ${sortBy} = 'status'     AND ${sortOrder} = 'desc' THEN status::text END DESC,
        CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'asc'  THEN created_at  END ASC,
        CASE WHEN ${sortBy} = 'created_at' AND ${sortOrder} = 'desc' THEN created_at  END DESC
      LIMIT ${limit} OFFSET ${resolvedOffset}
    `;

    const users      = await dataQuery;
    const countResult = await countQuery;
    const total = countResult[0]?.count || 0;

    const toIsoOrNull = (value: unknown): string | null => {
      if (!value) return null;
      const date = new Date(value as string | number | Date);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };

    return res.status(200).json({
      users: users.map((u) => ({
        id: u['id'],
        username: u['username'],
        fullName: u['full_name'],
        email: u['email'],
        phone: u['phone_number'] || null,
        role: u['role'],
        status: u['status'],
        mustChangePassword: u['must_change_password'],
        avatarUrl: u['avatar_url'] || null,
        department: u['department'] || null,
        position: u['position'] || null,
        lastLoginAt: toIsoOrNull(u['last_login_at']),
        createdAt: toIsoOrNull(u['created_at']) || new Date().toISOString(),
        updatedAt: toIsoOrNull(u['updated_at']) || new Date().toISOString(),
      })),
      total,
      limit,
      offset: resolvedOffset,
      page: page || Math.floor(resolvedOffset / limit) + 1,
    });
  } catch (error: unknown) {
    console.error('List users error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
