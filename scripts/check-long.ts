import { sql } from '../api/_shared/db.js';

async function checkUserLong() {
  try {
    const userLong = await sql`SELECT * FROM users WHERE full_name ILIKE '%Cao Ngọc Long%' OR username ILIKE '%long%'`;
    console.log('User Long:', userLong);

    if (userLong.length > 0) {
      const uId = userLong[0].id;
      const pm = await sql`SELECT * FROM project_members WHERE user_id = ${uId}`;
      console.log('Project Memberships for Long:', pm);

      const tm = await sql`SELECT * FROM task_members WHERE user_id = ${uId}`;
      console.log('Task Memberships for Long:', tm);
    }

    const allProjects = await sql`SELECT id, name FROM projects`;
    console.log('All Projects in DB:', allProjects);

    const allTasks = await sql`SELECT id, title, project_id FROM tasks`;
    console.log('All Tasks in DB:', allTasks);

    const allProjectMembers = await sql`SELECT project_id, user_id, project_role FROM project_members`;
    console.log('All Project Members count:', allProjectMembers.length);

    const allTaskMembers = await sql`SELECT task_id, user_id, assignment_role FROM task_members`;
    console.log('All Task Members count:', allTaskMembers.length);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

checkUserLong();
