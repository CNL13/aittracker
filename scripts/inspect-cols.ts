import { sql } from '../api/_shared/db.js';

async function inspectCols() {
  try {
    const u = await sql`SELECT * FROM users LIMIT 1`;
    console.log('USERS KEYS:', Object.keys(u[0] || {}));
    console.log('USERS SAMPLE:', u[0]);

    const uc = await sql`SELECT * FROM user_credentials LIMIT 1`;
    console.log('USER_CREDENTIALS KEYS:', Object.keys(uc[0] || {}));
    console.log('USER_CREDENTIALS SAMPLE:', uc[0]);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

inspectCols();
