import fss from 'fs';
import postgres from 'postgres';

async function main() {
  const lines = fss.readFileSync('.env.local', 'utf8').split('\n');
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const k = t.slice(0, i).trim(), v = t.slice(i + 1).trim();
    if (k && !(k in process.env)) process.env[k] = v;
  }
  const sql = postgres(process.env['DATABASE_URL'] as string, { ssl: { rejectUnauthorized: false }, connect_timeout: 15 });

  // Add phone_number column
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20)`;
  console.log('Added phone_number column');

  // Seed fake phone numbers for existing users
  const users = await sql`SELECT id, username FROM users`;
  let i = 1;
  for (const u of users) {
    const phone = '09' + String(i * 11111111 + 10000000).substring(0, 8);
    await sql`UPDATE users SET phone_number = ${phone} WHERE id = ${u.id as string}`;
    console.log('  ' + String(u.username).padEnd(12) + ' -> ' + phone);
    i++;
  }

  await sql.end();
  console.log('Done!');
}
main().catch((e: any) => { console.error(e.message); process.exit(1); });
