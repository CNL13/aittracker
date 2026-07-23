import { sql } from '../api/_shared/db.js';

async function checkUsers() {
  const users = await sql`SELECT id, username, role, password_hash FROM users LIMIT 5`;
  console.log('USERS IN DB:', users);
  process.exit(0);
}

checkUsers();
