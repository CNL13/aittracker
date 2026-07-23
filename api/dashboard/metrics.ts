import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../_shared/auth.js';
import { sql } from '../_shared/db.js';
import { currentDateInBusinessTz } from '../_shared/http.js';

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00+07:00`);
  date.setDate(date.getDate() + days);
  return currentDateInBusinessTz(date);
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(`${dateStr}T00:00:00+07:00`).getDay();
  return day === 0 || day === 6;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toNumber(value: unknown): number {
  return Number(value || 0);
}

function checkInStatusFrom(row: any, requiredTasksCount: number, isExempt: boolean, isNonWorkingDay: boolean) {
  if (isNonWorkingDay) {
    return 'not_required';
  }
  if (isExempt) {
    return 'exempt';
  }
  if (requiredTasksCount === 0) {
    return 'not_required';
  }
  if (!row) {
    return 'missing';
  }

  const submittedAt = row.first_submitted_at ? new Date(row.first_submitted_at) : null;
  if (submittedAt) {
    const submittedInTz = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(submittedAt);
    const hour = Number(submittedInTz.find((part) => part.type === 'hour')?.value || 0);
    const minute = Number(submittedInTz.find((part) => part.type === 'minute')?.value || 0);
    if (hour > 17 || (hour === 17 && minute > 0)) {
      return 'submitted_late';
    }
  }

  return 'submitted_on_time';
}

function statusColorFrom(params: {
  overdueTasksCount: number;
  blockedTasksCount: number;
  dueSoonTasksCount: number;
  hasPendingHelpRequest: boolean;
  checkInStatus: string;
}) {
  if (params.overdueTasksCount > 0 || params.blockedTasksCount > 0) {
    return 'red';
  }
  if (params.dueSoonTasksCount > 0 || params.hasPendingHelpRequest) {
    return 'yellow';
  }
  if (params.checkInStatus === 'missing') {
    return 'grey';
  }
  if (params.checkInStatus === 'submitted_on_time' || params.checkInStatus === 'submitted_late') {
    return 'green';
  }
  if (params.checkInStatus === 'exempt') {
    return 'blue';
  }
  return 'none';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const sessionContext = await getSession(req);
    if (!sessionContext || sessionContext.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const dateParam = Array.isArray(req.query.date) ? req.query.date[0] : req.query.date;
    const projectIdParam = Array.isArray(req.query.projectId) ? req.query.projectId[0] : req.query.projectId;
    const targetDateStr = dateParam || currentDateInBusinessTz();
    const projectId = projectIdParam || null;

    if (projectId && !isUuid(projectId)) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }

    const dueSoonDateStr = addDays(targetDateStr, 2);

    // --- Dynamic queries: avoid IS NULL pattern ---
    const projectFilter = projectId ? sql`AND id = ${projectId}` : sql``;
    const projectFilterCol = projectId ? sql`AND project_id = ${projectId}` : sql``;
    const projectFilterT = projectId ? sql`AND t.project_id = ${projectId}` : sql``;

    const [activeProjectsResult] = await sql`
      SELECT COUNT(id) as count
      FROM projects
      WHERE status NOT IN ('archived', 'completed')
        AND archived_at IS NULL
        ${projectFilter}
    `;
    const totalActiveProjects = toNumber(activeProjectsResult?.count);

    const [activeTasksResult] = await sql`
      SELECT COUNT(id) as count
      FROM tasks
      WHERE status != 'done'
        AND archived_at IS NULL
        ${projectFilterCol}
    `;
    const totalActiveTasks = toNumber(activeTasksResult?.count);

    const [openBlockersResult] = await sql`
      SELECT COUNT(b.id) as count
      FROM task_blockers b
      JOIN tasks t ON b.task_id = t.id
      WHERE b.status = 'open'
        AND t.archived_at IS NULL
        ${projectFilterT}
    `;
    const totalOpenBlockers = toNumber(openBlockersResult?.count);

    const exemptQuery = projectId
      ? sql`
        SELECT COUNT(DISTINCT a.user_id) as count
        FROM user_absences a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.removed_at IS NULL
        WHERE u.status = 'active'
          AND a.start_date <= ${targetDateStr}
          AND a.end_date >= ${targetDateStr}
          AND pm.project_id = ${projectId}
      `
      : sql`
        SELECT COUNT(DISTINCT a.user_id) as count
        FROM user_absences a
        JOIN users u ON a.user_id = u.id
        WHERE u.status = 'active'
          AND a.start_date <= ${targetDateStr}
          AND a.end_date >= ${targetDateStr}
      `;
    const [exemptMembersResult] = await exemptQuery;
    const totalExemptMembers = toNumber(exemptMembersResult?.count);

    const [nonWorkingDayResult] = await sql`
      SELECT work_date FROM non_working_days WHERE work_date = ${targetDateStr}
    `;
    const isNonWorkingDay = !!nonWorkingDayResult || isWeekend(targetDateStr);

    const taskStatusRows = await sql`
      SELECT status, COUNT(id) as count
      FROM tasks
      WHERE archived_at IS NULL
        ${projectFilterCol}
      GROUP BY status
    `;
    const taskStatusCounts = {
      todo: 0,
      in_progress: 0,
      waiting: 0,
      done: 0,
    };
    taskStatusRows.forEach((row: any) => {
      if (row.status in taskStatusCounts) {
        taskStatusCounts[row.status as keyof typeof taskStatusCounts] = toNumber(row.count);
      }
    });

    const [taskFlagCounts] = await sql`
      SELECT
        COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND t.due_date < ${targetDateStr}) as overdue,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND t.due_date >= ${targetDateStr} AND t.due_date <= ${dueSoonDateStr}) as due_soon,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND t.due_date IS NULL) as no_due_date,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND b.id IS NOT NULL) as blocked
      FROM tasks t
      LEFT JOIN task_blockers b ON b.task_id = t.id AND b.status = 'open'
      WHERE t.archived_at IS NULL
        ${projectFilterT}
    `;

    let usersQuery = projectId
      ? sql`
        SELECT DISTINCT u.id, u.username, u.full_name, u.role
        FROM users u
        JOIN project_members pm ON pm.user_id = u.id
        WHERE u.status = 'active'
          AND pm.project_id = ${projectId}
          AND pm.removed_at IS NULL
      `
      : sql`
        SELECT id, username, full_name, role
        FROM users
        WHERE status = 'active'
      `;
    const users = await usersQuery;
    const userIds = users.map((user: any) => user.id);

    const checkinByUserId: Record<string, any> = {};
    const checkinItemsCount: Record<string, number> = {};
    const absentUserIds = new Set<string>();
    const taskStatsByUserId: Record<string, any> = {};

    if (userIds.length > 0) {
      const checkins = await sql`
        SELECT
          id,
          user_id,
          summary_today,
          no_activity,
          no_activity_reason,
          general_difficulties,
          help_needed,
          plan_tomorrow,
          total_time_spent_hours,
          first_submitted_at
        FROM daily_checkins
        WHERE checkin_date = ${targetDateStr}
          AND user_id IN ${sql(userIds)}
      `;
      checkins.forEach((checkin: any) => {
        checkinByUserId[checkin.user_id] = checkin;
      });

      if (checkins.length > 0) {
        const checkinIds = checkins.map((checkin: any) => checkin.id);
        const items = await sql`
          SELECT checkin_id, COUNT(id) as count
          FROM daily_checkin_items
          WHERE checkin_id IN ${sql(checkinIds)}
            AND removed_at IS NULL
          GROUP BY checkin_id
        `;
        items.forEach((item: any) => {
          checkinItemsCount[item.checkin_id] = toNumber(item.count);
        });
      }

      const absences = await sql`
        SELECT user_id
        FROM user_absences
        WHERE start_date <= ${targetDateStr}
          AND end_date >= ${targetDateStr}
          AND user_id IN ${sql(userIds)}
      `;
      absences.forEach((absence: any) => absentUserIds.add(absence.user_id));

      let taskStatsQuery = sql`
        SELECT
          tm.user_id,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done') as active_tasks_count,
          COUNT(DISTINCT t.id) FILTER (
            WHERE tm.report_required = TRUE
              AND p.status = 'active'
              AND p.archived_at IS NULL
              AND t.status != 'done'
              AND (t.start_date IS NULL OR t.start_date <= ${targetDateStr})
          ) as required_tasks_count,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND t.due_date < ${targetDateStr}) as overdue_tasks_count,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND t.due_date >= ${targetDateStr} AND t.due_date <= ${dueSoonDateStr}) as due_soon_tasks_count,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND t.due_date IS NULL) as no_due_date_tasks_count,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status != 'done' AND b.id IS NOT NULL) as blocked_tasks_count
        FROM task_members tm
        JOIN tasks t ON tm.task_id = t.id
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN task_blockers b ON b.task_id = t.id AND b.status = 'open'
        WHERE tm.user_id IN ${sql(userIds)}
          AND tm.removed_at IS NULL
          AND t.archived_at IS NULL
          ${projectFilterT}
        GROUP BY tm.user_id
      `;
      const taskStats = await taskStatsQuery;
      taskStats.forEach((stat: any) => {
        taskStatsByUserId[stat.user_id] = stat;
      });
    }

    const checkInCounts = {
      required: 0,
      submittedOnTime: 0,
      submittedLate: 0,
      missing: 0,
      exempt: 0,
      notRequired: 0,
    };

    const members = users.map((user: any) => {
      const stats = taskStatsByUserId[user.id] || {};
      const checkin = checkinByUserId[user.id];
      const isExempt = absentUserIds.has(user.id);
      const requiredTasksCount = toNumber(stats.required_tasks_count);
      const checkInStatus = checkInStatusFrom(checkin, requiredTasksCount, isExempt, isNonWorkingDay);
      const hasPendingHelpRequest = !!checkin?.help_needed;
      const overdueTasksCount = toNumber(stats.overdue_tasks_count);
      const blockedTasksCount = toNumber(stats.blocked_tasks_count);
      const dueSoonTasksCount = toNumber(stats.due_soon_tasks_count);
      const statusColor = statusColorFrom({
        overdueTasksCount,
        blockedTasksCount,
        dueSoonTasksCount,
        hasPendingHelpRequest,
        checkInStatus,
      });

      if (requiredTasksCount > 0 && !isExempt && !isNonWorkingDay) {
        checkInCounts.required += 1;
      }
      if (checkInStatus === 'submitted_on_time') checkInCounts.submittedOnTime += 1;
      if (checkInStatus === 'submitted_late') checkInCounts.submittedLate += 1;
      if (checkInStatus === 'missing') checkInCounts.missing += 1;
      if (checkInStatus === 'exempt') checkInCounts.exempt += 1;
      if (checkInStatus === 'not_required') checkInCounts.notRequired += 1;

      const checkinDetails = checkin ? {
        summary: checkin.summary_today,
        summaryToday: checkin.summary_today,
        noActivity: checkin.no_activity,
        noActivityReason: checkin.no_activity_reason,
        generalDifficulties: checkin.general_difficulties,
        helpNeeded: checkin.help_needed,
        plan: checkin.plan_tomorrow,
        planTomorrow: checkin.plan_tomorrow,
        timeSpent: checkin.total_time_spent_hours ? `${Number(checkin.total_time_spent_hours)}h` : '0h',
        totalTimeSpentHours: checkin.total_time_spent_hours ? Number(checkin.total_time_spent_hours) : null,
        itemsCount: checkinItemsCount[checkin.id] || 0,
      } : null;

      return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        statusColor,
        checkInStatus,
        checkinDetails,
        checkInDetails: checkinDetails,
        activeTasksCount: toNumber(stats.active_tasks_count),
        activeTaskCount: toNumber(stats.active_tasks_count),
        requiredTasksCount,
        overdueTasksCount,
        dueSoonTasksCount,
        noDueDateTasksCount: toNumber(stats.no_due_date_tasks_count),
        blockedTasksCount,
        openBlockersCount: blockedTasksCount,
        openBlockerCount: blockedTasksCount,
        hasPendingHelpRequest,
      };
    });

    return res.status(200).json({
      metrics: {
        totalActiveProjects,
        totalActiveTasks,
        totalOpenBlockers,
        totalExemptMembers,
        taskStatusCounts,
        taskFlagCounts: {
          overdue: toNumber(taskFlagCounts?.overdue),
          dueSoon: toNumber(taskFlagCounts?.due_soon),
          noDueDate: toNumber(taskFlagCounts?.no_due_date),
          blocked: toNumber(taskFlagCounts?.blocked),
        },
        checkInCounts,
        isNonWorkingDay,
      },
      members,
    });
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
