import { sql } from '../api/_shared/db.js';

async function migrate() {
  try {
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE`;
    console.log('Successfully added parent_id column to tasks table!');
  } catch (e) {
    console.error('Migration error:', e);
  } finally {
    process.exit(0);
  }
}

migrate();
