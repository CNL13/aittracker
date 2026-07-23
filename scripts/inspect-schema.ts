import { sql } from '../api/_shared/db.js';

async function inspectSchema() {
  try {
    const tables = ['users', 'user_credentials', 'projects', 'project_members', 'tasks', 'task_members', 'task_comments', 'progress_updates', 'task_blockers'];
    for (const t of tables) {
      const cols = await sql`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${t}
        ORDER BY ordinal_position
      `;
      console.log(`=== TABLE: ${t} ===`);
      console.log(cols.map((c: any) => `${c.column_name} (${c.data_type})`).join(', '));
    }
  } catch (e) {
    console.error('Schema error:', e);
  } finally {
    process.exit(0);
  }
}

inspectSchema();
