import { sql } from '../api/_shared/db.js';

async function testProjectsList() {
  try {
    const projects = await sql`
      SELECT p.id, p.name, p.description, p.status, p.start_date as "startDate", p.due_date as "dueDate",
             p.manager_id as "managerId", u.full_name as "managerName", p.created_at as "createdAt"
      FROM projects p
      LEFT JOIN users u ON p.manager_id = u.id
      WHERE p.archived_at IS NULL
      ORDER BY p.created_at DESC
    `;
    console.log('Projects from SQL:', projects);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testProjectsList();
