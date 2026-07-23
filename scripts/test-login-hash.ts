import bcrypt from 'bcryptjs';
import { sql } from '../api/_shared/db.js';

async function testLoginHash() {
  try {
    const users = await sql`
      SELECT u.id, u.username, u.role, uc.password_hash
      FROM users u
      LEFT JOIN user_credentials uc ON u.id = uc.user_id
      WHERE u.username = 'admin'
    `;
    console.log('USER:', users[0]);
    if (users[0]?.password_hash) {
      const match123 = await bcrypt.compare('password123', users[0].password_hash);
      console.log('Match password123:', match123);
      const matchAdmin = await bcrypt.compare('admin', users[0].password_hash);
      console.log('Match admin:', matchAdmin);
      const matchAdmin123 = await bcrypt.compare('admin123', users[0].password_hash);
      console.log('Match admin123:', matchAdmin123);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testLoginHash();
