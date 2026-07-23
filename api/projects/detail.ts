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

    // 2. Validate projectId
    const projectId = req.query.projectId;
    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required.' });
    }

    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(projectId)) {
      return res.status(400).json({ error: 'Project ID must be a valid UUID.' });
    }

    // 3. Retrieve project
    const projects = await sql`
      SELECT id, name, description, status, start_date as "startDate", due_date as "dueDate",
             manager_id as "managerId", created_by as "createdBy", created_at as "createdAt",
             updated_at as "updatedAt", archived_at as "archivedAt"
      FROM projects
      WHERE id = ${projectId}
    `;

    if (!projects || projects.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy dự án.' });
    }

    const project = projects[0]!;

    // 4. Verify access permission: Member can only view detail if currently in project
    if (!isAdmin) {
      const membership = await sql`
        SELECT id FROM project_members
        WHERE project_id = ${projectId} AND user_id = ${userId} AND removed_at IS NULL
      `;
      if (!membership || membership.length === 0) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    // 5. Query active members
    const members = await sql`
      SELECT pm.id, pm.user_id as "userId", u.username, u.full_name as "fullName",
             u.email, pm.project_role as "projectRole", pm.joined_at as "joinedAt"
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ${projectId} AND pm.removed_at IS NULL
      ORDER BY pm.joined_at ASC
    `;

    // 6. Query task statistics
    const totalTasksRes = await sql`
      SELECT COUNT(*)::int as count FROM tasks
      WHERE project_id = ${projectId} AND archived_at IS NULL
    `;
    const doneTasksRes = await sql`
      SELECT COUNT(*)::int as count FROM tasks
      WHERE project_id = ${projectId} AND status = 'done' AND archived_at IS NULL
    `;
    const overdueTasksRes = await sql`
      SELECT COUNT(*)::int as count FROM tasks
      WHERE project_id = ${projectId} 
        AND status != 'done' 
        AND archived_at IS NULL 
        AND due_date < CURRENT_DATE
    `;

    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : null,
      dueDate: project.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : null,
      managerId: project.managerId,
      createdBy: project.createdBy,
      createdAt: new Date(project.createdAt).toISOString(),
      updatedAt: new Date(project.updatedAt).toISOString(),
      archivedAt: project.archivedAt ? new Date(project.archivedAt).toISOString() : null,
    };

    const formattedMembers = members.map((m) => ({
      id: m.id,
      userId: m.userId,
      username: m.username,
      fullName: m.fullName,
      email: m.email,
      projectRole: m.projectRole,
      joinedAt: new Date(m.joinedAt).toISOString(),
    }));

    return res.status(200).json({
      project: formattedProject,
      members: formattedMembers,
      taskMetrics: {
        totalTasks: totalTasksRes[0]?.count || 0,
        doneTasks: doneTasksRes[0]?.count || 0,
        overdueTasks: overdueTasksRes[0]?.count || 0,
      },
    });
  } catch (error: unknown) {
    console.error('Get project detail error:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
}
