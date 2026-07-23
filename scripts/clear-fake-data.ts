import fss from 'fs';
import postgres from 'postgres';

async function main() {
  const lines = fss.readFileSync('.env.local', 'utf8').split('\n');
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  }

  const sql = postgres(process.env['DATABASE_URL'] as string, { ssl: { rejectUnauthorized: false }, connect_timeout: 15 });

  await sql`UPDATE users SET department = NULL, position = NULL WHERE role = 'member'`;
  console.log('Cleared department/position for all members');

  const rows = await sql`SELECT username, full_name, department, position FROM users ORDER BY role DESC, username`;
  for (const r of rows) {
    console.log(String(r.username).padEnd(12) + ' | ' + String(r.full_name).padEnd(22) + ' | dept=' + (r.department||'NULL') + ' | pos=' + (r.position||'NULL'));
  }

  await sql.end();
  console.log('Done!');
}

main().catch((e: any) => { console.error('Error:', e.message); process.exit(1); });
