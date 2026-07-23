import { sql } from '../api/_shared/db.js';

async function debugJoin() {
  try {
    const rawTasks = await sql`SELECT id, title, project_id, archived_at FROM tasks`;
    console.log('RAW TASKS:', rawTasks);

    const rawProjects = await sql`SELECT id, name, archived_at FROM projects`;
    console.log('RAW PROJECTS:', rawProjects);

    const joined = await sql`
      SELECT t.id, t.title, p.name 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id
    `;
    console.log('JOINED RESULT:', joined);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

debugJoin();
