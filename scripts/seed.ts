/**
 * scripts/seed.ts
 * Seed real data vao Supabase database:
 *   - 1 admin account
 *   - 9 thanh vien that
 *   - 2 projects mau
 *   - 6 tasks mau voi phan cong
 *
 * Cach chay:
 *   npx tsx scripts/seed.ts
 *
 * Yeu cau: file .env.local da co DATABASE_URL that
 */

import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import postgres from 'postgres';

// Load .env.local
(function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found. Copy .env.local.example to .env.local and fill values.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) process.env[key] = value;
  }
})();

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL || DATABASE_URL === 'postgres://postgres:postgres@localhost:5432/postgres') {
  console.error('ERROR: DATABASE_URL not configured or still placeholder. Update .env.local!');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 5,
  idle_timeout: 20,
  connect_timeout: 15,
});

const DEFAULT_PASSWORD = 'Password123!';
const SALT_ROUNDS = 10;

function removeDiacritics(str: string): string {
  return str.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd').replace(/\u0110/g, 'D')
    .toLowerCase();
}

function makeUsername(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return removeDiacritics(parts[0]!);
  const initials = parts.slice(0, -1).map(p => removeDiacritics(p)[0] ?? '').join('');
  const lastName = removeDiacritics(parts[parts.length - 1]!);
  return initials + lastName;
}

interface Member {
  fullName: string;
  department: string;
  position: string;
}

const MEMBERS: Member[] = [
  { fullName: 'Hoàng Minh Hiếu',  department: 'Phòng kỹ thuật',     position: 'Lập trình viên' },
  { fullName: 'Trần Tiến Sơn',    department: 'Phòng kỹ thuật',     position: 'Kỹ sư phần mềm' },
  { fullName: 'Nguyễn Nam Sơn',   department: 'Phòng nghiên cứu',   position: 'Nghiên cứu viên' },
  { fullName: 'Trần Lê Chi',      department: 'Phòng vận hành',     position: 'Điều phối viên' },
  { fullName: 'Nguyễn Đan Lê',    department: 'Phòng truyền thông', position: 'Chuyên viên nội dung' },
  { fullName: 'Vũ Thị Thu Uyên',  department: 'Phòng nhân sự',      position: 'Chuyên viên nhân sự' },
  { fullName: 'Nguyễn Văn Tôn',   department: 'Phòng kỹ thuật',     position: 'Quản trị hệ thống' },
  { fullName: 'Triệu Quốc Thắng', department: 'Phòng vận hành',     position: 'Giám sát dự án' },
  { fullName: 'Cao Ngọc Long',    department: 'Phòng tài chính',    position: 'Kế toán' },
];

function newId(): string {
  return crypto.randomUUID();
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function seed() {
  console.log('Starting seed...\n');

  // 1. Admin
  console.log('Creating admin account...');
  const adminUsername = 'admin';
  const adminPwHash = await hashPassword(DEFAULT_PASSWORD);

  await sql`
    INSERT INTO users (id, username, normalized_username, full_name, email, role, status, must_change_password, department, position)
    VALUES (
      ${newId()}, ${adminUsername}, ${adminUsername},
      ${'System Admin'}, ${'admin@ait.local'},
      'admin', 'active', false,
      ${'Ban quản lý'}, ${'Quản trị viên hệ thống'}
    )
    ON CONFLICT (username) DO UPDATE
      SET full_name = EXCLUDED.full_name, updated_at = CURRENT_TIMESTAMP
  `;

  const [adminRow] = await sql`SELECT id FROM users WHERE normalized_username = 'admin'`;
  const realAdminId = adminRow!.id as string;

  await sql`
    INSERT INTO user_credentials (user_id, password_hash, failed_login_count)
    VALUES (${realAdminId}, ${adminPwHash}, 0)
    ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
  `;
  console.log('  OK admin / ' + DEFAULT_PASSWORD + ' (id: ' + realAdminId + ')\n');

  // 2. Members
  console.log('Creating members...');
  const memberIds: Record<string, string> = {};

  for (const m of MEMBERS) {
    const username = makeUsername(m.fullName);
    const email = username + '@ait.local';
    const pwHash = await hashPassword(DEFAULT_PASSWORD);

    await sql`
      INSERT INTO users (id, username, normalized_username, full_name, email, role, status, must_change_password, department, position, created_by)
      VALUES (
        ${newId()}, ${username}, ${username.toLowerCase()},
        ${m.fullName}, ${email},
        'member', 'active', true,
        ${m.department}, ${m.position}, ${realAdminId}
      )
      ON CONFLICT (username) DO UPDATE
        SET full_name = EXCLUDED.full_name, department = EXCLUDED.department,
            position = EXCLUDED.position, updated_at = CURRENT_TIMESTAMP
    `;

    const [row] = await sql`SELECT id FROM users WHERE normalized_username = ${username.toLowerCase()}`;
    const uid = row!.id as string;
    memberIds[username] = uid;

    await sql`
      INSERT INTO user_credentials (user_id, password_hash, failed_login_count)
      VALUES (${uid}, ${pwHash}, 0)
      ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
    `;
    console.log('  OK ' + username + ' | ' + m.fullName + ' | ' + m.department);
  }

  // 3. Projects
  console.log('\nCreating projects...');
  const proj1Id = newId();
  const proj2Id = newId();

  await sql`
    INSERT INTO projects (id, name, description, status, start_date, due_date, manager_id, created_by)
    VALUES (${proj1Id}, ${'He thong quan ly noi bo'},
      ${'Xay dung va van hanh he thong theo doi cong viec noi bo AIT'},
      'active', ${'2026-05-01'}, ${'2026-12-31'}, ${realAdminId}, ${realAdminId})
    ON CONFLICT DO NOTHING
  `;
  await sql`
    INSERT INTO projects (id, name, description, status, start_date, due_date, manager_id, created_by)
    VALUES (${proj2Id}, ${'Nghien cuu ung dung AI'},
      ${'Du an nghien cuu va ung dung tri tue nhan tao vao quy trinh van hanh'},
      'planning', ${'2026-08-01'}, ${'2027-03-31'}, ${realAdminId}, ${realAdminId})
    ON CONFLICT DO NOTHING
  `;
  console.log('  OK He thong quan ly noi bo (active)');
  console.log('  OK Nghien cuu ung dung AI (planning)');

  // 4. Project members
  console.log('\nAdding project members...');
  await sql`INSERT INTO project_members (id, project_id, user_id, project_role) VALUES (${newId()}, ${proj1Id}, ${realAdminId}, 'manager') ON CONFLICT DO NOTHING`;
  for (const uid of Object.values(memberIds)) {
    await sql`INSERT INTO project_members (id, project_id, user_id, project_role) VALUES (${newId()}, ${proj1Id}, ${uid}, 'member') ON CONFLICT DO NOTHING`;
  }
  await sql`INSERT INTO project_members (id, project_id, user_id, project_role) VALUES (${newId()}, ${proj2Id}, ${realAdminId}, 'manager') ON CONFLICT DO NOTHING`;
  const proj2Usernames = ['nnson', 'hmhieu', 'ttson', 'nvton'];
  for (const u of proj2Usernames) {
    const uid = memberIds[u];
    if (uid) await sql`INSERT INTO project_members (id, project_id, user_id, project_role) VALUES (${newId()}, ${proj2Id}, ${uid}, 'member') ON CONFLICT DO NOTHING`;
  }
  console.log('  OK project members assigned');

  // 5. Tasks
  console.log('\nCreating tasks...');

  const tasks = [
    { projectId: proj1Id, title: 'Thiet ke giao dien dashboard', description: 'Thiet ke va hoan thien giao dien trang tong quan', status: 'in_progress', priority: 'high', pct: 60, start: '2026-05-15', due: '2026-07-31', owner: 'hmhieu' },
    { projectId: proj1Id, title: 'Xay dung API check-in', description: 'Phat trien cac API endpoint nop bao cao cong viec', status: 'done', priority: 'high', pct: 100, start: '2026-05-01', due: '2026-06-30', owner: 'ttson' },
    { projectId: proj1Id, title: 'He thong thong bao email', description: 'Gui email nhac nho check-in hang ngay', status: 'todo', priority: 'medium', pct: 0, start: '2026-08-01', due: '2026-09-30', owner: 'nvton' },
    { projectId: proj1Id, title: 'Phan quyen va bao mat', description: 'Kiem tra va nang cap phan quyen, bao mat session', status: 'in_progress', priority: 'high', pct: 40, start: '2026-06-01', due: '2026-08-15', owner: 'tqthang' },
    { projectId: proj2Id, title: 'Khao sat ung dung LLM', description: 'Nghien cuu mo hinh ngon ngu lon phan tich bao cao', status: 'todo', priority: 'medium', pct: 0, start: '2026-08-01', due: '2026-10-31', owner: 'nnson' },
    { projectId: proj1Id, title: 'Kiem thu tong the he thong', description: 'Viet test cases va kiem thu toan bo luong', status: 'todo', priority: 'medium', pct: 0, start: '2026-09-01', due: '2026-10-31', owner: 'tlchi' },
  ];

  for (const t of tasks) {
    const taskId = newId();
    const ownerId = memberIds[t.owner];
    const completedAt = t.status === 'done' ? new Date().toISOString() : null;
    await sql`
      INSERT INTO tasks (id, project_id, title, description, status, priority, percent_complete, start_date, due_date, created_by, version, completed_at, status_changed_at)
      VALUES (${taskId}, ${t.projectId}, ${t.title}, ${t.description},
        ${t.status as any}, ${t.priority as any}, ${t.pct}, ${t.start}, ${t.due}, ${realAdminId}, 1,
        ${completedAt}, ${new Date().toISOString()})
      ON CONFLICT DO NOTHING
    `;
    if (ownerId) {
      await sql`INSERT INTO task_members (id, task_id, user_id, assignment_role, report_required) VALUES (${newId()}, ${taskId}, ${ownerId}, 'owner', true) ON CONFLICT DO NOTHING`;
    }
    console.log('  OK [' + t.status + '] ' + t.title + ' -> ' + t.owner);
  }

  // Done
  console.log('\nSeed complete!');
  console.log('\nAccounts (all password: ' + DEFAULT_PASSWORD + '):');
  console.log('  admin        (role: admin)');
  for (const m of MEMBERS) {
    const username = makeUsername(m.fullName);
    console.log('  ' + username + ' (role: member, must_change_password: true)');
  }

  await sql.end();
}

seed().catch((err: any) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
