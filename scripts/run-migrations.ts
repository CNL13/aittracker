import path from 'path';
import fs from 'fs';
import postgres from 'postgres';

// Load .env.local
const lines = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n');
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  if (key && !(key in process.env)) process.env[key] = value;
}

const DATABASE_URL = process.env['DATABASE_URL']!;
const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false }, max: 3, connect_timeout: 15 });

async function main() {
  console.log('Checking existing tables...');
  const existing = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `;
  const tableNames = existing.map((r: any) => r.table_name as string);
  console.log('Existing tables:', tableNames.length === 0 ? '(none)' : tableNames.join(', '));

  if (tableNames.includes('users')) {
    console.log('Schema already exists, skipping migrations.');
    await sql.end();
    return;
  }

  const migrationFiles = [
    'supabase/migrations/00000000000000_init.sql',
    'supabase/migrations/00000000000001_work_schedules.sql',
    'supabase/migrations/00000000000002_phone_number.sql',
  ];

  for (const file of migrationFiles) {
    console.log(`\nRunning migration: ${file}`);
    const sqlContent = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    await sql.unsafe(sqlContent);
    console.log(`  Done: ${file}`);
  }

  console.log('\nAll migrations complete!');
  await sql.end();
}

main().catch((e: any) => { console.error('Migration failed:', e.message); process.exit(1); });
