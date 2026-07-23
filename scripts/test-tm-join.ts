import { sql } from '../api/_shared/db.js';

async function testTmJoin() {
  const userId = 'a1111111-1111-1111-1111-111111111111';
  try {
    const a = await sql`
      SELECT t.id, tm.id as tm_id
      FROM tasks t
      LEFT JOIN task_members tm ON t.id = tm.task_id AND tm.user_id = ${userId}
    `;
    console.log('LEFT JOIN without removed_at:', a);

    const b = await sql`
      SELECT t.id, tm.id as tm_id
      FROM tasks t
      LEFT JOIN task_members tm ON (t.id = tm.task_id AND tm.user_id = ${userId} AND tm.removed_at IS NULL)
    `;
    console.log('LEFT JOIN with parens:', b);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testTmJoin();
