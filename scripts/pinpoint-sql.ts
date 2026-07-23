import { sql } from '../api/_shared/db.js';

async function pinpoint() {
  try {
    const q1 = await sql`SELECT * FROM tasks WHERE archived_at IS NULL`;
    console.log('Q1 (tasks where archived_at null):', q1.length);

    const q2 = await sql`SELECT t.id, p.name FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.archived_at IS NULL`;
    console.log('Q2 (tasks join projects):', q2.length);

    try {
      const q3 = await sql`
        SELECT (SELECT pu.proposed_percent FROM progress_updates pu WHERE pu.task_id = t.id AND pu.status = 'pending' ORDER BY pu.created_at DESC LIMIT 1) as pending
        FROM tasks t JOIN projects p ON t.project_id = p.id
      `;
      console.log('Q3 (progress_updates subquery):', q3.length);
    } catch (err3) {
      console.error('Q3 ERROR:', err3);
    }
  } catch (e) {
    console.error('General Error:', e);
  } finally {
    process.exit(0);
  }
}

pinpoint();
