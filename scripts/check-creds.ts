import { sql } from '../api/_shared/db.js';

async function checkCreds() {
  const adminUser = (await sql`SELECT id, username, normalized_username FROM users WHERE username = 'admin'`)[0];
  console.log('ADMIN USER:', adminUser);

  const creds = await sql`SELECT * FROM user_credentials WHERE user_id = ${adminUser.id}`;
  console.log('CREDS:', creds);

  process.exit(0);
}

checkCreds();
