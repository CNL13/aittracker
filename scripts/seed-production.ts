import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres.wbgidshdkxrafcuduzjs:cngclngSPB2312@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 5,
  idle_timeout: 20,
  connect_timeout: 15,
});

// Default temp password for all users
const TEMP_PASSWORD = 'AIT@2026';

interface UserSeed {
  username: string;
  full_name: string;
  role: 'admin' | 'member';
  email?: string;
}

const users: UserSeed[] = [
  // Admin
  { username: 'admin', full_name: 'Administrator', role: 'admin', email: 'admin@ait.local' },
  
  // Members from request
  { username: 'levanvu', full_name: 'Lê Văn Vũ', role: 'member' },
  { username: 'vumanhtrung', full_name: 'Vũ Mạnh Trung', role: 'member' },
  { username: 'buiphucloc', full_name: 'Bùi Phúc Lộc', role: 'member' },
  
  // Members from screenshot  
  { username: 'hoangminhhieu', full_name: 'Hoàng Minh Hiếu', role: 'member' },
  { username: 'trantienson', full_name: 'Trần Tiến Sơn', role: 'member' },
  { username: 'nguyennamson', full_name: 'Nguyễn Nam Sơn', role: 'member' },
  { username: 'tranlechi', full_name: 'Trần Lê Chi', role: 'member' },
  { username: 'nguyendanle', full_name: 'Nguyễn Đan Lê', role: 'member' },
  { username: 'vuthithuuyen', full_name: 'Vũ Thị Thu Uyên', role: 'member' },
  { username: 'nguyenvanton', full_name: 'Nguyễn Văn Tôn', role: 'member' },
  { username: 'trieuquocthang', full_name: 'Triệu Quốc Thắng', role: 'member' },
  { username: 'caongoclong', full_name: 'Cao Ngọc Long', role: 'member' },
];

async function runMigrations() {
  console.log('=== Running database migrations ===\n');
  
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  
  for (const file of migrationFiles) {
    console.log(`Running migration: ${file}`);
    let sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    // Strip BOM character
    sqlContent = sqlContent.replace(/^\uFEFF/, '');
    try {
      await sql.unsafe(sqlContent);
      console.log(`  ✓ ${file} completed`);
    } catch (err: any) {
      // Ignore "already exists" errors and duplicate column errors
      if (err.message?.includes('already exists') || err.code === '42710' || err.code === '42P07' || err.code === '42701') {
        console.log(`  ⚠ ${file} skipped (already exists)`);
      } else {
        console.error(`  ✗ ${file} failed:`, err.message);
        console.log(`  → Continuing anyway...`);
      }
    }
  }
  console.log('\n✓ All migrations completed\n');
}

async function seedUsers() {
  console.log('=== Seeding users ===\n');
  console.log(`Default password for all users: ${TEMP_PASSWORD}\n`);
  
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12);
  
  for (const user of users) {
    const id = crypto.randomUUID();
    const normalizedUsername = user.username.toLowerCase().trim();
    
    try {
      // Check if user already exists
      const existing = await sql`SELECT id FROM users WHERE normalized_username = ${normalizedUsername}`;
      
      if (existing.length > 0) {
        console.log(`  ⚠ ${user.full_name} (${user.username}) already exists, skipping`);
        continue;
      }
      
      // Insert user
      await sql`
        INSERT INTO users (id, username, normalized_username, full_name, email, role, status, must_change_password)
        VALUES (${id}, ${user.username}, ${normalizedUsername}, ${user.full_name}, ${user.email || null}, ${user.role}, 'active', true)
      `;
      
      // Insert credentials
      await sql`
        INSERT INTO user_credentials (user_id, password_hash)
        VALUES (${id}, ${passwordHash})
      `;
      
      console.log(`  ✓ ${user.full_name} (${user.username}) - ${user.role}`);
    } catch (err: any) {
      console.error(`  ✗ ${user.full_name} failed:`, err.message);
    }
  }
  
  console.log('\n✓ All users seeded\n');
}

async function main() {
  try {
    console.log('Connecting to database...');
    // Test connection
    const result = await sql`SELECT current_database(), current_user`;
    console.log(`Connected to: ${result[0].current_database} as ${result[0].current_user}\n`);
    
    await runMigrations();
    await seedUsers();
    
    // Show summary
    const userCount = await sql`SELECT count(*) as cnt FROM users`;
    console.log(`=== Summary ===`);
    console.log(`Total users in database: ${userCount[0].cnt}`);
    console.log(`Default password: ${TEMP_PASSWORD}`);
    console.log(`All users have must_change_password = true`);
    
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
