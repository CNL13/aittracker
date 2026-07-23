import { sql } from '../api/_shared/db.js';

async function debugMy() {
  try {
    const adminUser = (await sql`SELECT id, username, role FROM users WHERE username = 'admin'`)[0];
    console.log('ADMIN USER:', adminUser);

    const tasksForAdmin = await sql`
      SELECT 
        t.id, t.parent_id as "parentId", t.project_id as "projectId", p.name as "projectName", t.title, t.status
      FROM tasks t
      LEFT JOIN task_members tm ON t.id = tm.task_id AND tm.user_id = ${adminUser.id} AND tm.removed_at IS NULL
      INNER JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL AND 1=1
    `;
    console.log('TASKS FOR ADMIN:', tasksForAdmin);
  } catch (e) {
    console.error('Debug error:', e);
  } finally {
    process.exit(0);
  }
}

debugMy();
