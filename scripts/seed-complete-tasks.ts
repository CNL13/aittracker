import { sql } from '../api/_shared/db.js';

async function seed() {
  try {
    // 1. Get all active projects
    const projects = await sql`SELECT id, name FROM projects`;
    console.log('Projects count:', projects.length);

    // 2. Get active users
    const users = await sql`SELECT id, username, full_name FROM users WHERE status = 'active'`;
    console.log('Users count:', users.length);

    const admin = users.find(u => u.username === 'admin') || users[0];
    const member = users.find(u => u.username === 'member') || users[1] || users[0];

    for (const p of projects) {
      // Check existing tasks
      const existing = await sql`SELECT id FROM tasks WHERE project_id = ${p.id}`;
      if (existing.length < 3) {
        console.log(`Seeding tasks for project "${p.name}" (${p.id})...`);

        const t1Id = crypto.randomUUID();
        const t2Id = crypto.randomUUID();
        const t3Id = crypto.randomUUID();

        await sql`
          INSERT INTO tasks (id, project_id, title, description, status, priority, percent_complete, due_date, created_by)
          VALUES 
            (${t1Id}, ${p.id}, 'Phân tích yêu cầu hệ thống', 'Thu thập thông tin và đặc tả tính năng', 'done', 'high', 100, CURRENT_DATE + INTERVAL '5 days', ${admin.id}),
            (${t2Id}, ${p.id}, 'Thiết kế giao diện & luồng công việc', 'Xây dựng UI Kanban & báo cáo tiến độ', 'in_progress', 'high', 50, CURRENT_DATE + INTERVAL '10 days', ${admin.id}),
            (${t3Id}, ${p.id}, 'Kiểm thử & Bàn giao sản phẩm', 'Chạy thử nghiệm toàn bộ hệ thống', 'todo', 'medium', 0, CURRENT_DATE + INTERVAL '15 days', ${admin.id})
          ON CONFLICT (id) DO NOTHING
        `;

        // Add task members
        await sql`
          INSERT INTO task_members (id, task_id, user_id, assignment_role, report_required)
          VALUES
            (${crypto.randomUUID()}, ${t1Id}, ${member.id}, 'owner', true),
            (${crypto.randomUUID()}, ${t2Id}, ${member.id}, 'owner', true),
            (${crypto.randomUUID()}, ${t3Id}, ${admin.id}, 'owner', false)
          ON CONFLICT DO NOTHING
        `;

        // Also add project members for all active users so everyone can view
        for (const u of users) {
          await sql`
            INSERT INTO project_members (id, project_id, user_id, project_role, joined_at)
            VALUES (${crypto.randomUUID()}, ${p.id}, ${u.id}, ${u.username === 'admin' ? 'manager' : 'member'}, NOW())
            ON CONFLICT DO NOTHING
          `;
        }
      }
    }

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    process.exit(0);
  }
}

seed();
