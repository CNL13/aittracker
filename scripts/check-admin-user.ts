import { sql } from '../api/_shared/db.js';

async function checkAdminUser() {
  const users = await sql`SELECT * FROM users WHERE username = 'admin' OR normalized_username = 'admin'`;
  console.log('ADMIN USERS:', users);
  process.exit(0);
}

checkAdminUser();
