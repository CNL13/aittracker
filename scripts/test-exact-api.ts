import { sql } from '../api/_shared/db.js';

async function testExact() {
  try {
    const user = (await sql`SELECT id, username, role FROM users WHERE username = 'admin'`)[0];
    const parsedLimit = 100;
    const parsedOffset = 0;
    const permissionWhere = sql`1=1`;

    const dataQuery = sql`
      SELECT 
        t.id, t.parent_id as "parentId", t.project_id as "projectId", p.name as "projectName", t.title, t.description, t.status, t.priority,
        t.percent_complete as "percentComplete",
        TO_CHAR(t.start_date, 'YYYY-MM-DD') as "startDate",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') as "dueDate",
        t.version,
        t.created_by as "createdBy",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        t.completed_at as "completedAt",
        t.archived_at as "archivedAt",
        COALESCE(tm.assignment_role::text, CASE WHEN p.manager_id = ${user.id} THEN 'manager' ELSE 'viewer' END) as "memberRole",
        (SELECT tm2.user_id FROM task_members tm2 WHERE tm2.task_id = t.id AND tm2.assignment_role = 'owner' AND tm2.removed_at IS NULL LIMIT 1) as "ownerId",
        (SELECT u.full_name FROM task_members tm2 JOIN users u ON u.id = tm2.user_id WHERE tm2.task_id = t.id AND tm2.assignment_role = 'owner' AND tm2.removed_at IS NULL LIMIT 1) as "ownerName",
        (SELECT COUNT(*)::int FROM task_comments tc WHERE tc.task_id = t.id AND tc.deleted_at IS NULL) as "commentCount",
        (SELECT pu.proposed_percent FROM progress_updates pu WHERE pu.task_id = t.id AND pu.status = 'pending' ORDER BY pu.created_at DESC LIMIT 1) as "pendingPercent"
      FROM tasks t
      LEFT JOIN task_members tm ON t.id = tm.task_id AND tm.user_id = ${user.id} AND tm.removed_at IS NULL
      INNER JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL AND ${permissionWhere}
      ORDER BY p.name ASC, CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC, t.due_date ASC NULLS LAST
      LIMIT ${parsedLimit} OFFSET ${parsedOffset}
    `;

    const result = await dataQuery;
    console.log('EXACT QUERY RESULT COUNT:', result.length);
    console.log('EXACT QUERY RESULT:', result);
  } catch (e) {
    console.error('Exact query error:', e);
  } finally {
    process.exit(0);
  }
}

testExact();
