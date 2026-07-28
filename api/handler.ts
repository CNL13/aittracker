import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_shared/db.js';

// ─── Auth ───
import authLogin from './auth/login.js';
import authLogout from './auth/logout.js';
import authChangePassword from './auth/change-password.js';

// ─── Users ───
import usersMe from './users/me.js';
import usersList from './users/list.js';
import usersCreate from './users/create.js';
import usersUpdate from './users/update.js';
import usersUpdateSelf from './users/update-self.js';
import usersToggleStatus from './users/toggle-status.js';
import usersResetPassword from './users/reset-password.js';
import usersSessions from './users/sessions.js';
import usersSessionsRevoke from './users/sessions/revoke.js';

// ─── Projects ───
import projectsList from './projects/list.js';
import projectsDetail from './projects/detail.js';
import projectsCreate from './projects/create.js';
import projectsUpdate from './projects/update.js';
import projectsDelete from './projects/delete.js';
import projectsApprove from './projects/approve.js';
import projectsReject from './projects/reject.js';
import projectsMembers from './projects/members.js';
import projectsMembersAdd from './projects/members/add.js';
import projectsMembersRemove from './projects/members/remove.js';

// ─── Tasks ───
import tasksList from './tasks/list.js';
import tasksDetail from './tasks/detail.js';
import tasksMy from './tasks/my.js';
import tasksCreate from './tasks/create.js';
import tasksUpdate from './tasks/update.js';
import tasksArchive from './tasks/archive.js';
import tasksCommentsList from './tasks/comments/list.js';
import tasksCommentsCreate from './tasks/comments/create.js';

// ─── Checkins ───
import checkinsSubmit from './checkins/submit.js';
import checkinsContext from './checkins/context.js';
import checkinsHistory from './checkins/history.js';
import checkinsAll from './checkins/all.js';

// ─── Blockers ───
import blockersList from './blockers/list.js';
import blockersCreate from './blockers/create.js';
import blockersResolve from './blockers/resolve.js';
import blockersDismiss from './blockers/dismiss.js';

// ─── Dashboard ───
import dashboardMetrics from './dashboard/metrics.js';

// ─── Admin ───
import adminAudit from './admin/audit.js';
import adminEmailLog from './admin/email-log.js';
import adminEmailLogResend from './admin/email-log/resend.js';

// ─── Calendar ───
import calendarNwdList from './calendar/non-working-days/list.js';
import calendarNwdCreate from './calendar/non-working-days/create.js';
import calendarNwdDelete from './calendar/non-working-days/delete.js';

// ─── Work Schedules ───
import workSchedulesList from './work-schedules/list.js';
import workSchedulesUpsert from './work-schedules/upsert.js';
import workSchedulesDelete from './work-schedules/delete.js';
import workSchedulesExport from './work-schedules/export.js';

// ─── Absences ───
import absencesList from './absences/list.js';
import absencesCreate from './absences/create.js';
import absencesDelete from './absences/delete.js';

// ─── Messages ───
import messagesList from './messages/list.js';
import messagesSend from './messages/send.js';
import messagesDelete from './messages/delete.js';

// ─── Notifications ───
import notificationsCron from './notifications/cron.js';
import notificationsInApp from './notifications/in-app.js';

// ─── Progress ───
import progressList from './progress/list.js';
import progressSubmit from './progress/submit.js';
import progressReview from './progress/review.js';

// ─── Route Map ───
const routes: Record<string, (req: VercelRequest, res: VercelResponse) => Promise<any> | any> = {
  // Auth
  'auth/login': authLogin,
  'auth/logout': authLogout,
  'auth/change-password': authChangePassword,

  // Users
  'users/me': usersMe,
  'users/list': usersList,
  'users/create': usersCreate,
  'users/update': usersUpdate,
  'users/update-self': usersUpdateSelf,
  'users/toggle-status': usersToggleStatus,
  'users/reset-password': usersResetPassword,
  'users/sessions': usersSessions,
  'users/sessions/revoke': usersSessionsRevoke,

  // Projects
  'projects/list': projectsList,
  'projects/detail': projectsDetail,
  'projects/create': projectsCreate,
  'projects/update': projectsUpdate,
  'projects/delete': projectsDelete,
  'projects/approve': projectsApprove,
  'projects/reject': projectsReject,
  'projects/members': projectsMembers,
  'projects/members/add': projectsMembersAdd,
  'projects/members/remove': projectsMembersRemove,

  // Tasks
  'tasks/list': tasksList,
  'tasks/detail': tasksDetail,
  'tasks/my': tasksMy,
  'tasks/create': tasksCreate,
  'tasks/update': tasksUpdate,
  'tasks/archive': tasksArchive,
  'tasks/comments/list': tasksCommentsList,
  'tasks/comments/create': tasksCommentsCreate,

  // Checkins
  'checkins/submit': checkinsSubmit,
  'checkins/context': checkinsContext,
  'checkins/history': checkinsHistory,
  'checkins/all': checkinsAll,

  // Blockers
  'blockers/list': blockersList,
  'blockers/create': blockersCreate,
  'blockers/resolve': blockersResolve,
  'blockers/dismiss': blockersDismiss,

  // Dashboard
  'dashboard/metrics': dashboardMetrics,

  // Admin
  'admin/audit': adminAudit,
  'admin/email-log': adminEmailLog,
  'admin/email-log/resend': adminEmailLogResend,

  // Calendar
  'calendar/non-working-days/list': calendarNwdList,
  'calendar/non-working-days/create': calendarNwdCreate,
  'calendar/non-working-days/delete': calendarNwdDelete,

  // Work Schedules
  'work-schedules/list': workSchedulesList,
  'work-schedules/upsert': workSchedulesUpsert,
  'work-schedules/delete': workSchedulesDelete,
  'work-schedules/export': workSchedulesExport,

  // Absences
  'absences/list': absencesList,
  'absences/create': absencesCreate,
  'absences/delete': absencesDelete,

  // Messages
  'messages/list': messagesList,
  'messages/send': messagesSend,
  'messages/delete': messagesDelete,

  // Notifications
  'notifications/cron': notificationsCron,
  'notifications/in-app': notificationsInApp,

  // Progress
  'progress/list': progressList,
  'progress/submit': progressSubmit,
  'progress/review': progressReview,
};

// Temporary debug handler
async function debugHandler(_req: VercelRequest, res: VercelResponse) {
  const info: any = {
    DATABASE_URL: process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 30)}...` : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    body: _req.body,
    bodyType: typeof _req.body,
  };
  try {
    // Test 1: basic connection
    const r1 = await sql`SELECT current_database() as db, count(*) as user_count FROM users`;
    info.test1_ok = true;
    info.test1 = r1[0];
    
    // Test 2: auth_login_attempts table
    const r2 = await sql`SELECT COUNT(*)::int as count FROM auth_login_attempts WHERE normalized_username = ${'admin'}`;
    info.test2_ok = true;
    info.test2 = r2[0];
    
    // Test 3: user lookup (same query as login)
    const r3 = await sql`
      SELECT u.id, u.username, u.normalized_username, u.full_name, u.role, u.status, u.must_change_password,
             uc.password_hash, uc.failed_login_count, uc.locked_until
      FROM users u
      LEFT JOIN user_credentials uc ON u.id = uc.user_id
      WHERE u.normalized_username = ${'admin'}
    `;
    info.test3_ok = true;
    info.test3_user = r3[0] ? { id: r3[0].id, username: r3[0].username, has_hash: !!r3[0].password_hash } : null;
    
  } catch (err: any) {
    info.error = err.message;
    info.error_code = err.code;
    info.error_stack = err.stack?.split('\n').slice(0, 5);
  }
  return res.status(200).json(info);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract the route path from the URL (remove /api/ prefix)
  const url = req.url || '';
  const match = url.match(/^\/api\/(.+?)(?:\?.*)?$/);

  if (!match) {
    return res.status(404).json({ error: 'Not Found' });
  }

  const routeKey = match[1] as string;

  // Look up the handler in the route map
  const routeHandler = routes[routeKey];

  // Temporary debug route
  if (routeKey === 'debug') {
    return debugHandler(req, res);
  }

  if (!routeHandler) {
    return res.status(404).json({ error: `API route not found: /api/${routeKey}` });
  }

  // Delegate to the matched handler
  try {
    return await routeHandler(req, res);
  } catch (err) {
    console.error(`[API] Error in /api/${routeKey}:`, err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

