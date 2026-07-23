import { sql } from '../api/_shared/db.js';

async function testClauses() {
  const userId = 'a1111111-1111-1111-1111-111111111111';

  try {
    const r1 = await sql`
      SELECT t.id FROM tasks t JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
    `;
    console.log('R1 (basic join):', r1.length);

    const r2 = await sql`
      SELECT t.id FROM tasks t 
      LEFT JOIN task_members tm ON t.id = tm.task_id AND tm.user_id = ${userId} AND tm.removed_at IS NULL
      JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
    `;
    console.log('R2 (with tm join):', r2.length);

    const r3 = await sql`
      SELECT t.id, COALESCE(tm.assignment_role::text, CASE WHEN p.manager_id = ${userId} THEN 'manager' ELSE 'viewer' END) as memberRole
      FROM tasks t 
      LEFT JOIN task_members tm ON t.id = tm.task_id AND tm.user_id = ${userId} AND tm.removed_at IS NULL
      JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
    `;
    console.log('R3 (with COALESCE memberRole):', r3.length);

    const r4 = await sql`
      SELECT t.id FROM tasks t JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
      ORDER BY p.name ASC, CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC, t.due_date ASC NULLS LAST
    `;
    console.log('R4 (with ORDER BY):', r4.length);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testClauses();
