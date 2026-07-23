import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Authenticate user
    const sessionContext = await getSession(req);
    if (!sessionContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { user } = sessionContext;
    const userId = user.id;
    const isAdmin = user.role === 'admin';

    // 2. Parse query parameters
    const search = req.query.search ? `%${req.query.search}%` : null;
    const rawStatus = (req.query.status as string) || null;
    const status = rawStatus === 'pending_approval' ? 'planning' : rawStatus;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // 3. Build dynamic filter fragments
    const searchFilter = search
      ? sql`AND (p.name ILIKE ${search} OR p.description ILIKE ${search})`
      : sql``;
    const validStatuses = new Set(['planning', 'active', 'paused', 'completed', 'archived', 'rejected']);
    if (status && !validStatuses.has(status)) {
      return res.status(400).json({ error: 'Invalid project status.' });
    }

    const statusFilter = status
      ? sql`AND p.status = ${status}::project_status`
      : sql``;

    let projects = [];
    let totalCount = 0;

    if (isAdmin) {
      // Query projects for Admin (sees all)
      projects = await sql`
        SELECT p.id, p.name, p.description, p.status, p.start_date as "startDate", p.due_date as "dueDate",
               p.manager_id as "managerId", p.created_by as "createdBy", p.created_at as "createdAt",
               p.updated_at as "updatedAt", p.archived_at as "archivedAt"
        FROM projects p
        WHERE 1=1
          ${searchFilter}
          ${statusFilter}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countRes = await sql`
        SELECT COUNT(*)::int as count
        FROM projects p
        WHERE 1=1
          ${searchFilter}
          ${statusFilter}
      `;
      totalCount = countRes[0]?.count || 0;
    } else {
      // Query projects for Member (sees only those they belong to and aren't removed from)
      projects = await sql`
        SELECT p.id, p.name, p.description, p.status, p.start_date as "startDate", p.due_date as "dueDate",
               p.manager_id as "managerId", p.created_by as "createdBy", p.created_at as "createdAt",
               p.updated_at as "updatedAt", p.archived_at as "archivedAt"
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ${userId} AND pm.removed_at IS NULL
          ${searchFilter}
          ${statusFilter}
        ORDER BY p.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countRes = await sql`
        SELECT COUNT(*)::int as count
        FROM projects p
        JOIN project_members pm ON p.id = pm.project_id
        WHERE pm.user_id = ${userId} AND pm.removed_at IS NULL
          ${searchFilter}
          ${statusFilter}
      `;
      totalCount = countRes[0]?.count || 0;
    }

    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : null,
      dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : null,
      managerId: p.managerId,
      createdBy: p.createdBy,
      createdAt: new Date(p.createdAt).toISOString(),
      updatedAt: new Date(p.updatedAt).toISOString(),
      archivedAt: p.archivedAt ? new Date(p.archivedAt).toISOString() : null,
    }));

    return res.status(200).json({
      projects: formattedProjects,
      total: totalCount,
      page,
      limit,
    });
  } catch (error: unknown) {
    console.error('List projects error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
