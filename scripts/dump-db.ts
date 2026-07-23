import { sql } from '../api/_shared/db.js';

async function main() {
  try {
    const projects = await sql`SELECT id, name, description, manager_id FROM projects`;
    console.log('=== DB PROJECTS ===');
    console.log(JSON.stringify(projects, null, 2));

    const tasks = await sql`SELECT id, project_id, title, status, created_at FROM tasks`;
    console.log('=== DB TASKS ===');
    console.log(JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
