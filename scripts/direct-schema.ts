import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load .env.local
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
    if (key) process.env[key] = value;
  }
}

const dbUrl = process.env.DATABASE_URL || '';

async function directCheck() {
  console.log('Connecting to DB URL:', dbUrl.replace(/:[^:@]+@/, ':***@'));
  const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in public schema:', tables.map((t: any) => t.table_name));

    for (const t of tables) {
      const name = t.table_name;
      const cols = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = ${name}
      `;
      console.log(`\nTable [${name}]:`);
      console.log(cols.map((c: any) => `  ${c.column_name}: ${c.data_type}`).join('\n'));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

directCheck();
