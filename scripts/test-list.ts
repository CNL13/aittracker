import { sql } from '../api/_shared/db.js';

async function testList() {
  const user = (await sql`SELECT id, username, role FROM users WHERE username = 'admin'`)[0];

  try {
    const dataQuery = sql`
      SELECT 
        t.id, t.project_id as "projectId", p.name as "projectName", t.title, t.description, t.status, t.priority
      FROM tasks t
      LEFT JOIN projects p ON p.id = t.project_id
      LEFT JOIN task_members tm_auth ON t.id = tm_auth.task_id 
        AND tm_auth.user_id = ${user.id} AND tm_auth.removed_at IS NULL
      WHERE t.archived_at IS NULL
    `;
    const res = await dataQuery;
    console.log('LIST QUERY RESULT COUNT:', res.length);
    console.log('LIST QUERY RESULT:', res);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testList();
