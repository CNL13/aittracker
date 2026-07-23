import { sql } from '../api/_shared/db.js';

async function testEndpoint() {
  try {
    const users = await sql`SELECT id, username, role FROM users LIMIT 10`;
    for (const u of users) {
      const isOnlyMine = false;
      let permissionWhere = sql`1=1`;
      if (u.role !== 'admin') {
        permissionWhere = sql`(
          tm.id IS NOT NULL
          OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = t.project_id AND pm.user_id = ${u.id} AND pm.removed_at IS NULL)
          OR EXISTS (SELECT 1 FROM projects p2 WHERE p2.id = t.project_id AND p2.manager_id = ${u.id})
        )`;
      }

      const tasks = await sql`
        SELECT 
          t.id, t.parent_id as "parentId", t.project_id as "projectId", p.name as "projectName", t.title, t.status
        FROM tasks t
        LEFT JOIN task_members tm ON t.id = tm.task_id AND tm.user_id = ${u.id} AND tm.removed_at IS NULL
        INNER JOIN projects p ON t.project_id = p.id
        WHERE t.archived_at IS NULL AND ${permissionWhere}
      `;
      console.log(`User ${u.username} (${u.role}, id=${u.id}): ${tasks.length} tasks found`);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testEndpoint();
