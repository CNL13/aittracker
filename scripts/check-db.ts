import { sql } from '../api/_shared/db.js';

async function checkSpecific() {
  try {
    const pId = '5fdf2381-dd6e-4168-943d-3fa841a330ba';
    const project = await sql`SELECT * FROM projects WHERE id = ${pId}`;
    console.log('Target Project:', project);

    const tasks = await sql`SELECT * FROM tasks WHERE project_id = ${pId}`;
    console.log('Target Project Tasks:', tasks);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

checkSpecific();
