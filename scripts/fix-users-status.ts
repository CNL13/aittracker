import { sql } from '../api/_shared/db.js';

async function fixUsersStatus() {
  try {
    const corruptedUsers = await sql`SELECT id, username, role, status FROM users WHERE status != 'active' AND status != 'locked' AND status != 'inactive'`;
    console.log('CORRUPTED USERS:', corruptedUsers);

    const updateRes = await sql`
      UPDATE users 
      SET status = 'active' 
      WHERE status != 'active' AND status != 'locked' AND status != 'inactive'
    `;
    console.log('UPDATED CORRUPTED USERS STATUS TO ACTIVE SUCCESSFULLY!');
  } catch (e) {
    console.error('Fix error:', e);
  } finally {
    process.exit(0);
  }
}

fixUsersStatus();
