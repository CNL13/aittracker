import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_shared/db.js';
import { getSession } from '../_shared/auth.js';
import { currentDateInBusinessTz } from '../_shared/http.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const todayStr = currentDateInBusinessTz();

    // 1. Get user's active tasks
    const activeTasks = await sql`
      SELECT 
        t.id as "id",
        t.id as "taskId",
        t.title as "title",
        t.project_id as "projectId",
        t.status as "status",
        t.percent_complete as "percentComplete",
        tm.assignment_role as "role",
        tm.assignment_role as "assignmentRole",
        tm.report_required as "reportRequired"
      FROM tasks t
      JOIN task_members tm ON t.id = tm.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE tm.user_id = ${session.user.id}
        AND tm.removed_at IS NULL
        AND tm.report_required = TRUE
        AND p.status = 'active'
        AND p.archived_at IS NULL
        AND t.status != 'done'
        AND t.archived_at IS NULL
        AND (t.start_date IS NULL OR t.start_date <= ${todayStr})
      ORDER BY t.created_at DESC
    `;

    // 2. Get existing checkin
    const existingCheckIns = await sql`
      SELECT * FROM daily_checkins
      WHERE user_id = ${session.user.id} AND checkin_date = ${todayStr}
    `;
    let existingCheckIn = null;
    if (existingCheckIns.length > 0) {
      const row = existingCheckIns[0]!;
      const items = await sql`
        SELECT 
          task_id as "taskId",
          progress_note as "workDone",
          member_percent_complete as "memberPercentComplete",
          proposed_task_percent as "percentCompleteProposed",
          proposed_task_percent as "progress",
          proposed_task_status as "proposedTaskStatus",
          proposed_task_status as "statusUpdate",
          time_spent_hours as "timeSpentHours",
          time_spent_hours as "timeSpent",
          help_needed as "helpNeeded"
        FROM daily_checkin_items
        WHERE checkin_id = ${row.id}
          AND removed_at IS NULL
      `;
      // Check for blockers reported today by user for these items
      const itemBlockers = await sql`
        SELECT task_id, description as "blockerDetails" 
        FROM task_blockers
        WHERE checkin_item_id IN (SELECT id FROM daily_checkin_items WHERE checkin_id = ${row.id})
          AND reported_by = ${session.user.id}
      `;
      
      const itemsMerged = items.map(item => {
        const blocker = itemBlockers.find(b => b.task_id === item.taskId);
        return {
          ...item,
          blockerDetails: blocker ? blocker.blockerDetails : undefined,
          hasBlocker: !!blocker,
        };
      });

      existingCheckIn = {
        id: row.id,
        checkinDate: row.checkin_date,
        first_submitted_at: row.first_submitted_at,
        firstSubmittedAt: row.first_submitted_at,
        summaryToday: row.summary_today,
        noActivity: row.no_activity,
        noActivityReason: row.no_activity_reason,
        generalDifficulties: row.general_difficulties,
        helpNeeded: row.help_needed,
        planTomorrow: row.plan_tomorrow,
        totalTimeSpentHours: row.total_time_spent_hours ? parseFloat(row.total_time_spent_hours) : undefined,
        items: itemsMerged,
        tasks: itemsMerged,
      };
    }

    // 3+4+5. Chạy song song: kiểm tra nghỉ phép, ngày lễ, lịch làm việc
    const [absences, nonWorkingDays, todaySchedule] = await Promise.all([
      sql`
        SELECT id FROM user_absences
        WHERE user_id = ${session.user.id}
          AND start_date <= ${todayStr}
          AND end_date >= ${todayStr}
      `,
      sql`
        SELECT name FROM non_working_days
        WHERE work_date = ${todayStr}
      `,
      sql`
        SELECT shift FROM work_schedules
        WHERE user_id = ${session.user.id}
          AND work_date = ${todayStr}::date
        LIMIT 1
      `
    ]);

    const exempt = absences.length > 0;
    const nonWorkingDay = nonWorkingDays.length > 0;
    const hasScheduleToday = todaySchedule.length > 0 && todaySchedule[0]!['shift'] !== 'off';

    return res.status(200).json({
      tasks: activeTasks,
      activeTasks,
      existingCheckIn,
      exempt,
      isExempt: exempt,
      nonWorkingDay,
      isNonWorkingDay: nonWorkingDay,
      hasScheduleToday,
      scheduleShift: todaySchedule.length > 0 ? todaySchedule[0]!['shift'] : null,
    });
  } catch (error) {
    console.error('Error fetching checkin context:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
