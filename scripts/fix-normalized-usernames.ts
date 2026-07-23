import { sql } from '../api/_shared/db.js';

async function fixNormalizedUsernames() {
  try {
    await sql`
      UPDATE users 
      SET normalized_username = LOWER(TRIM(username)) 
      WHERE normalized_username IS NULL OR normalized_username != LOWER(TRIM(username))
    `;
    console.log('Successfully updated normalized_username for all users!');
  } catch (e) {
    console.error('Error fixing normalized usernames:', e);
  } finally {
    process.exit(0);
  }
}

fixNormalizedUsernames();
