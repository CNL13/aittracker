import { sql } from '../api/_shared/db.js';

async function listAll() {
  try {
    const projects = await sql`SELECT id, name, status, created_at FROM projects`;
    console.log('--- ALL PROJECTS (' + projects.length + ') ---');
    console.log(projects);

    const tasks = await sql`SELECT id, project_id, title, status FROM tasks`;
    console.log('--- ALL TASKS (' + tasks.length + ') ---');
    console.log(tasks);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

listAll();
