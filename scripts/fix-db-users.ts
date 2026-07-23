import bcrypt from 'bcryptjs';
import { sql } from '../api/_shared/db.js';

async function fixDbUsers() {
  try {
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated hash for password123:', hash);

    // Fix status for all users
    await sql`UPDATE users SET status = 'active' WHERE status IS NULL OR status != 'active'`;
    console.log('Updated status = active for all users!');

    // Fix credentials for admin
    await sql`
      INSERT INTO user_credentials (user_id, password_hash, failed_login_count)
      VALUES ('a1111111-1111-1111-1111-111111111111', ${hash}, 0)
      ON CONFLICT (user_id) DO UPDATE SET password_hash = ${hash}, failed_login_count = 0, locked_until = NULL
    `;
    console.log('Fixed credentials for admin user!');

    // Fix credentials for member
    await sql`
      INSERT INTO user_credentials (user_id, password_hash, failed_login_count)
      VALUES ('e1111111-1111-1111-1111-111111111111', ${hash}, 0)
      ON CONFLICT (user_id) DO UPDATE SET password_hash = ${hash}, failed_login_count = 0, locked_until = NULL
    `;
    console.log('Fixed credentials for member user!');

    // Also fix all demo users in users table if missing credentials
    const allUsers = await sql`SELECT id FROM users`;
    for (const u of allUsers) {
      await sql`
        INSERT INTO user_credentials (user_id, password_hash, failed_login_count)
        VALUES (${u.id}, ${hash}, 0)
        ON CONFLICT (user_id) DO UPDATE SET password_hash = ${hash}, failed_login_count = 0, locked_until = NULL
      `;
    }
    console.log('Fixed credentials for all users in DB!');
  } catch (e) {
    console.error('Error fixing db users:', e);
  } finally {
    process.exit(0);
  }
}

fixDbUsers();
