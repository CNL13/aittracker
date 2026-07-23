import { sql } from '../api/_shared/db.js';

async function testMy() {
  try {
    const users = await sql`SELECT id, username, role FROM users LIMIT 10`;
    console.log('USERS:', users);

    const projectMembers = await sql`SELECT * FROM project_members LIMIT 10`;
    console.log('PROJECT MEMBERS:', projectMembers);

    const taskMembers = await sql`SELECT * FROM task_members LIMIT 10`;
    console.log('TASK MEMBERS:', taskMembers);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testMy();
