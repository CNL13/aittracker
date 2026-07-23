import { sql } from '../api/_shared/db.js';

async function testFix() {
  const userId = 'a1111111-1111-1111-1111-111111111111';
  try {
    const tasks = await sql`
      SELECT 
        t.id, t.parent_id as "parentId", t.project_id as "projectId", p.name as "projectName", t.title, t.description, t.status, t.priority,
        t.percent_complete as "percentComplete",
        TO_CHAR(t.start_date, 'YYYY-MM-DD') as "startDate",
        TO_CHAR(t.due_date, 'YYYY-MM-DD') as "dueDate",
        t.version,
        t.created_by as "createdBy",
        t.created_at as "createdAt",
        t.updated_at as "updatedAt",
        t.completed_at as "completedAt",
        t.archived_at as "archivedAt",
        (SELECT tm2.user_id FROM task_members tm2 WHERE tm2.task_id = t.id AND tm2.assignment_role = 'owner' AND tm2.removed_at IS NULL LIMIT 1) as "ownerId",
        (SELECT u.full_name FROM task_members tm2 JOIN users u ON u.id = tm2.user_id WHERE tm2.task_id = t.id AND tm2.assignment_role = 'owner' AND tm2.removed_at IS NULL LIMIT 1) as "ownerName",
        (SELECT COUNT(*)::int FROM task_comments tc WHERE tc.task_id = t.id AND tc.deleted_at IS NULL) as "commentCount"
      FROM tasks t
      INNER JOIN projects p ON t.project_id = p.id
      WHERE t.archived_at IS NULL
    `;
    console.log('FIXED QUERY SUCCESS! Count:', tasks.length);
    console.log('TASKS:', tasks);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

testFix();
