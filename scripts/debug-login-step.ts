import bcrypt from 'bcryptjs';
import { sql } from '../api/_shared/db.js';

async function debugStep() {
  const normalizedUsername = 'admin';
  const password = 'password123';

  const users = await sql`
    SELECT u.id, u.username, u.normalized_username, u.full_name, u.email, u.role, u.status, u.must_change_password,
           uc.password_hash, uc.failed_login_count, uc.locked_until
    FROM users u
    LEFT JOIN user_credentials uc ON u.id = uc.user_id
    WHERE u.normalized_username = ${normalizedUsername}
  `;

  console.log('USERS FOUND:', users);
  if (users.length > 0) {
    const user = users[0];
    console.log('PASSWORD HASH:', user.password_hash);
    const match = await bcrypt.compare(password, user.password_hash || '');
    console.log('BCRYPT MATCH:', match);
  }
  process.exit(0);
}

debugStep();
