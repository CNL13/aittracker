import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(dbUrl);

async function run() {
  const migrationFiles = [
    './supabase/migrations/20260720000002_project_chat_and_progress.sql',
    './supabase/migrations/20260721000001_task_comments.sql'
  ];

  for (const file of migrationFiles) {
    if (fs.existsSync(file)) {
      const m = fs.readFileSync(file, 'utf8');
      try {
        await sql.unsafe(m);
        console.log(`Migration ${file} OK ✅`);
      } catch (e: any) {
        console.error(`Migration ${file} error:`, e.message);
      }
    }
  }
  await sql.end();
  process.exit(0);
}
run();
