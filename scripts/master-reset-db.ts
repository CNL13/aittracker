import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

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

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('No DATABASE_URL found!');
  process.exit(1);
}

const sql = postgres(dbUrl, { ssl: { rejectUnauthorized: false } });

async function masterReset() {
  console.log('=== STARTING MASTER DATABASE RE-ORGANIZATION & SEED ===');

  try {
    // 1. Migration: ensure parent_id on tasks
    await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE`;
    console.log('✓ Ensured tasks.parent_id column');

    // 2. Clean corrupted/test tables
    await sql`TRUNCATE TABLE task_blockers, progress_updates, task_comments, project_messages, task_members, tasks, project_members, projects RESTART IDENTITY CASCADE`;
    console.log('✓ Cleaned projects and tasks tables');

    // 3. Fix all users status & normalized_username
    await sql`UPDATE users SET status = 'active'::user_status WHERE status IS NULL OR status::text NOT IN ('active', 'locked', 'inactive')`;
    await sql`UPDATE users SET normalized_username = LOWER(username) WHERE normalized_username IS NULL OR normalized_username = ''`;
    console.log('✓ Repaired user statuses and normalized_usernames');

    // 4. Get key user IDs
    const users = await sql`SELECT id, username, full_name, role FROM users WHERE status = 'active'::user_status`;
    console.log(`✓ Found ${users.length} active users`);

    const adminUser = users.find(u => u.username === 'admin') || users[0];
    const memberUser = users.find(u => u.username === 'member') || users[1] || users[0];

    // Find Cao Ngọc Long or set up a prominent member user
    let longUser = users.find(u => u.full_name.includes('Cao Ngọc Long') || u.username.includes('long'));
    if (!longUser) {
      longUser = memberUser;
    }

    const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);
    for (const u of users) {
      await sql`
        INSERT INTO user_credentials (user_id, password_hash, failed_login_count)
        VALUES (${u.id}, ${defaultPasswordHash}, 0)
        ON CONFLICT (user_id) DO UPDATE SET password_hash = ${defaultPasswordHash}, failed_login_count = 0
      `;
    }
    console.log('✓ Reset user credentials passwords');

    // 5. Create 2 Realistic Projects
    const project1Id = 'f1111111-1111-1111-1111-111111111111';
    const project2Id = 'f2222222-2222-2222-2222-222222222222';

    await sql`
      INSERT INTO projects (id, name, description, status, start_date, due_date, manager_id, created_by)
      VALUES 
        (
          ${project1Id},
          'Hệ thống Quản lý Nội bộ AIT',
          'Xây dựng và vận hành hệ thống theo dõi tiến độ công việc nội bộ AIT Work Tracker.',
          'active'::project_status,
          '2026-05-01',
          '2026-12-31',
          ${adminUser.id},
          ${adminUser.id}
        ),
        (
          ${project2Id},
          'Nghiên cứu & Phát triển AI Assistant',
          'Dự án ứng dụng Trí tuệ Nhân tạo trợ lý hỗ trợ tự động hóa phân công và nhắc nhở công việc.',
          'active'::project_status,
          '2026-06-01',
          '2026-11-30',
          ${memberUser.id},
          ${adminUser.id}
        )
    `;
    console.log('✓ Inserted 2 clean active projects');

    // 6. Add ALL users as project members to both projects
    for (const u of users) {
      const role1 = u.id === adminUser.id ? 'manager' : 'member';
      const role2 = u.id === memberUser.id ? 'manager' : 'member';

      await sql`
        INSERT INTO project_members (id, project_id, user_id, project_role, joined_at)
        VALUES 
          (${crypto.randomUUID()}, ${project1Id}, ${u.id}, ${role1}::project_role, NOW()),
          (${crypto.randomUUID()}, ${project2Id}, ${u.id}, ${role2}::project_role, NOW())
      `;
    }
    console.log('✓ Enrolled all users into projects');

    // 7. Seed Tasks for Project 1: "Hệ thống Quản lý Nội bộ AIT"
    const t1Id = 'b0000001-0000-0000-0000-000000000001';
    const t2Id = 'b0000001-0000-0000-0000-000000000002';
    const t3Id = 'b0000001-0000-0000-0000-000000000003';
    const t4Id = 'b0000001-0000-0000-0000-000000000004';
    const t5Id = 'b0000001-0000-0000-0000-000000000005';

    await sql`
      INSERT INTO tasks (id, project_id, title, description, status, priority, percent_complete, version, start_date, due_date, created_by, completed_at)
      VALUES
        (${t1Id}, ${project1Id}, 'Thiết kế Giao diện bảng Kanban & Danh sách', 'Xây dựng layout chuẩn giao diện tối ưu trải nghiệm người dùng với theme dark mode.', 'done', 'high', 100, 1, '2026-07-01', '2026-08-01', ${adminUser.id}, NOW()),
        (${t2Id}, ${project1Id}, 'Phát triển API Phân công & Tự ứng cử (Self-Nominate)', 'Cung cấp API cho phép nhân viên tự bấm nút 👤+ Nhận làm việc trực tiếp trên dòng task.', 'in_progress', 'high', 60, 1, '2026-07-05', '2026-08-15', ${adminUser.id}, null),
        (${t3Id}, ${project1Id}, 'Tích hợp Nút Thêm Việc Nhanh tại Cột & Subtask', 'Hỗ trợ nút + tại tiêu đề cột và icon 👤+ ở cuối bảng để nhập việc mới.', 'todo', 'medium', 0, 1, '2026-07-10', '2026-08-20', ${adminUser.id}, null),
        (${t4Id}, ${project1Id}, 'Kiểm thử Hệ thống & Tối ưu Query Database', 'Đảm bảo truy vấn PostgreSQL load nhanh dưới 100ms và không rò rỉ dữ liệu.', 'todo', 'low', 0, 1, '2026-07-15', '2026-08-25', ${adminUser.id}, null),
        (${t5Id}, ${project1Id}, 'Báo cáo Tiến độ & Duyệt tự động', 'Hệ thống tự động duyệt các công việc do nhân viên tự nhận cho chính mình.', 'done', 'high', 100, 1, '2026-07-01', '2026-07-30', ${adminUser.id}, NOW())
    `;

    // Assign task members for Project 1 (including Cao Ngọc Long / Member)
    await sql`
      INSERT INTO task_members (id, task_id, user_id, assignment_role, report_required, assigned_at)
      VALUES
        (${crypto.randomUUID()}, ${t1Id}, ${longUser.id}, 'owner', true, NOW()),
        (${crypto.randomUUID()}, ${t2Id}, ${longUser.id}, 'owner', true, NOW()),
        (${crypto.randomUUID()}, ${t5Id}, ${longUser.id}, 'owner', true, NOW()),
        (${crypto.randomUUID()}, ${t3Id}, ${memberUser.id}, 'owner', true, NOW())
    `;

    // 8. Seed Tasks for Project 2: "Nghiên cứu & Phát triển AI Assistant"
    const p2t1Id = 'b0000002-0000-0000-0000-000000000001';
    const p2t2Id = 'b0000002-0000-0000-0000-000000000002';
    const p2t3Id = 'b0000002-0000-0000-0000-000000000003';

    await sql`
      INSERT INTO tasks (id, project_id, title, description, status, priority, percent_complete, version, start_date, due_date, created_by)
      VALUES
        (${p2t1Id}, ${project2Id}, 'Khảo sát giải thuật phân tích tiến độ tự động', 'Nghiên cứu mô hình đánh giá phần trăm hoàn thành theo lịch trình.', 'in_progress', 'high', 40, 1, '2026-07-01', '2026-08-30', ${memberUser.id}),
        (${p2t2Id}, ${project2Id}, 'Xây dựng mô hình nhắc việc thông minh', 'Tự động gửi thông báo khi task sắp đến hạn hoặc quá hạn.', 'todo', 'medium', 0, 1, '2026-07-15', '2026-09-15', ${memberUser.id}),
        (${p2t3Id}, ${project2Id}, 'Đánh giá thử nghiệm mô hình AI', 'Đánh giá độ chính xác và tính hữu ích của trợ lý ảo.', 'todo', 'low', 0, 1, '2026-08-01', '2026-10-01', ${memberUser.id})
    `;

    await sql`
      INSERT INTO task_members (id, task_id, user_id, assignment_role, report_required, assigned_at)
      VALUES
        (${crypto.randomUUID()}, ${p2t1Id}, ${longUser.id}, 'owner', true, NOW()),
        (${crypto.randomUUID()}, ${p2t2Id}, ${memberUser.id}, 'owner', true, NOW())
    `;

    console.log('✓ Successfully seeded tasks and task assignments!');
    console.log('=== DATABASE RE-ORGANIZATION & SEED COMPLETED SUCCESSFULLY ===');
  } catch (e) {
    console.error('Master reset error:', e);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

masterReset();
