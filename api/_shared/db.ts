import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env['SUPABASE_URL'] || 'https://placeholder.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env['SUPABASE_SERVICE_ROLE_KEY'] || 'placeholder-service-role-key';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// File-based state persistence for local development
const STATE_FILE = path.join(process.cwd(), 'db_state.json');
let state: any = null;

const FULL_TEST_SEED_VERSION = 'full-test-2026-07-19';
const DEMO_SCHEDULE_START = '2026-05-01';
const DEMO_PASSWORD = 'Password123!';
const DEMO_PEOPLE = [
  ['d0000001-0000-0000-0000-000000000001', 'nv001', 'Nguyá»…n An BĂ¬nh', 'PhĂ²ng nghiĂªn cá»©u', 'NghiĂªn cá»©u viĂªn'],
  ['d0000001-0000-0000-0000-000000000002', 'nv002', 'Tráº§n Minh ChĂ¢u', 'PhĂ²ng nghiĂªn cá»©u', 'Trá»£ lĂ½ nghiĂªn cá»©u'],
  ['d0000001-0000-0000-0000-000000000003', 'nv003', 'LĂª Quá»‘c DÅ©ng', 'PhĂ²ng ká»¹ thuáº­t', 'Ká»¹ sÆ° dá»¯ liá»‡u'],
  ['d0000001-0000-0000-0000-000000000004', 'nv004', 'Pháº¡m Thu HĂ ', 'PhĂ²ng váº­n hĂ nh', 'Äiá»u phá»‘i viĂªn'],
  ['d0000001-0000-0000-0000-000000000005', 'nv005', 'HoĂ ng Gia Huy', 'PhĂ²ng ká»¹ thuáº­t', 'Láº­p trĂ¬nh viĂªn'],
  ['d0000001-0000-0000-0000-000000000006', 'nv006', 'Äá»— Ngá»c KhĂ¡nh', 'PhĂ²ng nhĂ¢n sá»±', 'ChuyĂªn viĂªn nhĂ¢n sá»±'],
  ['d0000001-0000-0000-0000-000000000007', 'nv007', 'VÅ© Háº£i Long', 'PhĂ²ng tĂ i chĂ­nh', 'Káº¿ toĂ¡n'],
  ['d0000001-0000-0000-0000-000000000008', 'nv008', 'BĂ¹i Thanh Mai', 'PhĂ²ng nghiĂªn cá»©u', 'Thá»±c táº­p sinh'],
  ['d0000001-0000-0000-0000-000000000009', 'nv009', 'Äáº·ng Tuáº¥n Nam', 'PhĂ²ng váº­n hĂ nh', 'NhĂ¢n viĂªn dá»± Ă¡n'],
  ['d0000001-0000-0000-0000-000000000010', 'nv010', 'Cao Má»¹ NgĂ¢n', 'PhĂ²ng nghiĂªn cá»©u', 'NghiĂªn cá»©u viĂªn'],
  ['d0000001-0000-0000-0000-000000000011', 'nv011', 'Mai Äá»©c PhĂºc', 'PhĂ²ng ká»¹ thuáº­t', 'Quáº£n trá»‹ há»‡ thá»‘ng'],
  ['d0000001-0000-0000-0000-000000000012', 'nv012', 'NgĂ´ Lan PhÆ°Æ¡ng', 'PhĂ²ng truyá»n thĂ´ng', 'ChuyĂªn viĂªn ná»™i dung'],
  ['d0000001-0000-0000-0000-000000000013', 'nv013', 'LĂ½ Minh QuĂ¢n', 'PhĂ²ng váº­n hĂ nh', 'GiĂ¡m sĂ¡t ca'],
  ['d0000001-0000-0000-0000-000000000014', 'nv014', 'Phan Nháº­t Quá»³nh', 'PhĂ²ng nghiĂªn cá»©u', 'Thá»±c táº­p sinh'],
  ['d0000001-0000-0000-0000-000000000015', 'nv015', 'Táº¡ HoĂ ng SÆ¡n', 'PhĂ²ng tĂ i chĂ­nh', 'ChuyĂªn viĂªn mua sáº¯m'],
  ['d0000001-0000-0000-0000-000000000016', 'nv016', 'Há»“ Báº£o TrĂ¢m', 'PhĂ²ng nhĂ¢n sá»±', 'Tuyá»ƒn dá»¥ng'],
  ['d0000001-0000-0000-0000-000000000017', 'nv017', 'DÆ°Æ¡ng Anh TĂº', 'PhĂ²ng ká»¹ thuáº­t', 'Kiá»ƒm thá»­ viĂªn'],
  ['d0000001-0000-0000-0000-000000000018', 'nv018', 'La KhĂ¡nh Vy', 'PhĂ²ng truyá»n thĂ´ng', 'Thiáº¿t káº¿'],
  ['d0000001-0000-0000-0000-000000000019', 'nv019', 'Triá»‡u ÄÄƒng Khoa', 'PhĂ²ng váº­n hĂ nh', 'NhĂ¢n viĂªn há»— trá»£'],
  ['d0000001-0000-0000-0000-000000000020', 'nv020', 'Äinh Ngá»c Yáº¿n', 'PhĂ²ng nghiĂªn cá»©u', 'ThÆ° kĂ½ khoa há»c'],
];
const VIETNAM_PUBLIC_HOLIDAYS_2026 = [
  ['2026-01-01', 'Táº¿t DÆ°Æ¡ng lá»‹ch'],
  ['2026-02-16', 'Nghá»‰ Táº¿t NguyĂªn Ä‘Ă¡n'],
  ['2026-02-17', 'Nghá»‰ Táº¿t NguyĂªn Ä‘Ă¡n'],
  ['2026-02-18', 'Nghá»‰ Táº¿t NguyĂªn Ä‘Ă¡n'],
  ['2026-02-19', 'Nghá»‰ Táº¿t NguyĂªn Ä‘Ă¡n'],
  ['2026-02-20', 'Nghá»‰ Táº¿t NguyĂªn Ä‘Ă¡n'],
  ['2026-04-25', 'Nghá»‰ dá»‹p Giá»— Tá»• HĂ¹ng VÆ°Æ¡ng'],
  ['2026-04-26', 'Giá»— Tá»• HĂ¹ng VÆ°Æ¡ng'],
  ['2026-04-27', 'Nghá»‰ bĂ¹ Giá»— Tá»• HĂ¹ng VÆ°Æ¡ng'],
  ['2026-04-30', 'NgĂ y Giáº£i phĂ³ng miá»n Nam'],
  ['2026-05-01', 'NgĂ y Quá»‘c táº¿ Lao Ä‘á»™ng'],
  ['2026-05-02', 'Nghá»‰ cuá»‘i tuáº§n dá»‹p 30/4 - 1/5'],
  ['2026-05-03', 'Nghá»‰ cuá»‘i tuáº§n dá»‹p 30/4 - 1/5'],
  ['2026-08-31', 'Nghá»‰ dá»‹p Quá»‘c khĂ¡nh'],
  ['2026-09-01', 'Nghá»‰ dá»‹p Quá»‘c khĂ¡nh'],
  ['2026-09-02', 'Quá»‘c khĂ¡nh'],
];

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year = 2026, month = 1, day = 1] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function ensureDemoScheduleData() {
  if (!state) return;
  let changed = false;
  const nowIso = new Date().toISOString();

  state.users ||= [];
  state.user_credentials ||= [];
  state.work_schedules ||= [];
  state.non_working_days ||= [];

  for (const [workDate, name] of VIETNAM_PUBLIC_HOLIDAYS_2026) {
    const exists = state.non_working_days.some((day: any) => String(day.work_date).slice(0, 10) === workDate);
    if (!exists) {
      state.non_working_days.push({
        id: `vn-holiday-${workDate}`,
        work_date: workDate,
        name,
        created_by: 'a1111111-1111-1111-1111-111111111111',
        created_at: nowIso,
      });
      changed = true;
    }
  }

  if (state.demoSeedVersion === FULL_TEST_SEED_VERSION) {
    if (changed) saveState();
    return;
  }

  for (const [id, username, fullName, department, position] of DEMO_PEOPLE) {
    if (!state.users.some((user: any) => user.id === id)) {
      state.users.push({
        id,
        username,
        role: 'member',
        status: 'active',
        full_name: fullName,
        email: `${username}@ait.local`,
        department,
        position,
        avatar_url: null,
        must_change_password: false,
        created_at: nowIso,
        updated_at: nowIso,
      });
      changed = true;
    }

    if (!state.user_credentials.some((credential: any) => credential.user_id === id)) {
      state.user_credentials.push({
        user_id: id,
        password_hash: bcrypt.hashSync(DEMO_PASSWORD, 10),
        failed_login_count: 0,
        locked_until: null,
      });
      changed = true;
    }
  }

  const endKey = localDateKey(new Date());
  const startDate = parseLocalDate(DEMO_SCHEDULE_START);
  const shifts = ['full', 'morning', 'afternoon', 'full', 'online', 'overtime'];
  let dateIndex = 0;

  for (let cursor = new Date(startDate); localDateKey(cursor) <= endKey; cursor.setDate(cursor.getDate() + 1)) {
    const workDate = localDateKey(cursor);
    const weekday = cursor.getDay();

    DEMO_PEOPLE.forEach(([id], personIndex) => {
      const existing = state.work_schedules.some((entry: any) => entry.user_id === id && entry.work_date === workDate);
      if (existing) return;

      let shift = shifts[(personIndex + dateIndex) % shifts.length];
      if (weekday === 0) {
        shift = personIndex % 4 === 0 ? 'online' : personIndex % 4 === 1 ? 'morning' : 'off';
      } else if (weekday === 6) {
        shift = personIndex % 5 === 0 ? 'online' : personIndex % 3 === 0 ? 'morning' : 'off';
      }

      state.work_schedules.push({
        id: `demo-ws-${id}-${workDate}`,
        user_id: id,
        work_date: workDate,
        shift,
        custom_start: null,
        custom_end: null,
        updated_by: 'a1111111-1111-1111-1111-111111111111',
        created_at: nowIso,
        updated_at: nowIso,
      });
      changed = true;
    });

    dateIndex += 1;
  }

  if (state.demoSeedVersion !== FULL_TEST_SEED_VERSION) {
    state.demoSeedVersion = FULL_TEST_SEED_VERSION;
    changed = true;
  }

  if (changed) saveState();
}

function loadState() {
  if (state) return state;
  if (fs.existsSync(STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      state.work_schedules ||= [];
      ensureDemoScheduleData();
      return state;
    } catch (e) {
      // ignore and recreate
    }
  }

  const adminId = 'a1111111-1111-1111-1111-111111111111';
  const memberId = 'm1111111-1111-1111-1111-111111111111';
  const projectId = 'p1111111-1111-1111-1111-111111111111';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  state = {
    users: [
      { id: adminId, username: 'admin', role: 'admin', status: 'active', full_name: 'System Admin', email: 'admin@example.com', must_change_password: false },
      { id: memberId, username: 'member', role: 'member', status: 'active', full_name: 'Team Member', email: 'member@example.com', must_change_password: false }
    ],
    user_credentials: [
      { user_id: adminId, password_hash: bcrypt.hashSync('Password123!', 10), failed_login_count: 0, locked_until: null },
      { user_id: memberId, password_hash: bcrypt.hashSync('Password123!', 10), failed_login_count: 0, locked_until: null }
    ],
    auth_sessions: [],
    auth_login_attempts: [],
    projects: [
      { id: projectId, name: 'Dá»± Ă¡n Alpha', description: 'Dá»± Ă¡n máº«u cá»§a há»‡ thá»‘ng', status: 'active', start_date: '2026-01-01', due_date: '2026-12-31', manager_id: adminId, version: 1, created_at: new Date().toISOString() }
    ],
    project_members: [
      { id: 'pm-1', project_id: projectId, user_id: adminId, role: 'manager', joined_at: new Date().toISOString() },
      { id: 'pm-2', project_id: projectId, user_id: memberId, role: 'developer', joined_at: new Date().toISOString() }
    ],
    tasks: [
      { id: 'task-1', project_id: projectId, title: 'Thiáº¿t káº¿ giao diá»‡n', description: 'Thiáº¿t káº¿ giao diá»‡n Kanban vĂ  Dashboard', status: 'todo', priority: 'high', percent_complete: 0, version: 1, created_at: new Date().toISOString(), due_date: '2026-08-01', start_date: '2026-07-01' },
      { id: 'task-2', project_id: projectId, title: 'XĂ¢y dá»±ng API', description: 'XĂ¢y dá»±ng API check-in vĂ  gá»­i email', status: 'in_progress', priority: 'medium', percent_complete: 30, version: 1, created_at: new Date().toISOString(), due_date: '2026-08-15', start_date: '2026-07-01' }
    ],
    task_members: [
      { id: 'tm-1', task_id: 'task-1', user_id: memberId, assignment_role: 'owner', report_required: true },
      { id: 'tm-2', task_id: 'task-2', user_id: memberId, assignment_role: 'owner', report_required: true }
    ],
    progress_updates: [],
    task_blockers: [],
    user_absences: [],
    non_working_days: [],
    work_schedules: [
      { id: 'ws-1', user_id: adminId, work_date: todayStr, shift: 'full', custom_start: null, custom_end: null, updated_by: adminId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ws-2', user_id: memberId, work_date: todayStr, shift: 'morning', custom_start: null, custom_end: null, updated_by: memberId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ws-3', user_id: memberId, work_date: tomorrowStr, shift: 'online', custom_start: null, custom_end: null, updated_by: memberId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    ],
    activity_logs: [],
    notifications_log: [],
    daily_checkins: [],
    daily_checkin_items: []
  };
  ensureDemoScheduleData();
  saveState();
  return state;
}

function saveState() {
  if (state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  }
}

function redactMockValue(value: any): any {
  if (typeof value === 'string' && value.length > 24) {
    return `${value.slice(0, 8)}...[redacted]`;
  }
  return value;
}

// Check if a value is a postgres helper or list
function unwrapValue(val: any): any {
  if (val && typeof val === 'object' && val.raw !== undefined) {
    return val.raw;
  }
  return val;
}

function dateKey(value: any): string {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function applyLimitOffset<T>(rows: T[], values: any[]): T[] {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (numbers.length < 2) return rows;
  const limit = numbers[numbers.length - 2];
  const offset = numbers[numbers.length - 1];
  return rows.slice(offset, offset + limit);
}

function containsSearch(row: any, search: string, fields: string[]): boolean {
  const needle = search.replace(/%/g, '').trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(row[field] || '').toLowerCase().includes(needle));
}

function firstKnownId(values: any[], table: string): string | null {
  const rows = state?.[table] || [];
  const ids = new Set(rows.map((row: any) => row.id));
  const flattened = values.flatMap((value) => Array.isArray(value) ? value : [value]);
  return flattened.find((value) => typeof value === 'string' && ids.has(value)) || null;
}

function projectMemberRows(projectId: string | null = null) {
  return (state.project_members || [])
    .filter((member: any) => !projectId || member.project_id === projectId)
    .filter((member: any) => !member.removed_at);
}

function taskMemberRows(taskId: string | null = null) {
  return (state.task_members || [])
    .filter((member: any) => !taskId || member.task_id === taskId)
    .filter((member: any) => !member.removed_at);
}

function openBlockersForTask(taskId: string) {
  return (state.task_blockers || []).filter((blocker: any) => blocker.task_id === taskId && blocker.status === 'open');
}

function mapProject(project: any) {
  return {
    ...project,
    startDate: project.startDate || project.start_date || null,
    dueDate: project.dueDate || project.due_date || null,
    managerId: project.managerId || project.manager_id || null,
    createdBy: project.createdBy || project.created_by || null,
    createdAt: project.createdAt || project.created_at || new Date().toISOString(),
    updatedAt: project.updatedAt || project.updated_at || project.created_at || new Date().toISOString(),
    archivedAt: project.archivedAt || project.archived_at || null,
  };
}

function mapTask(task: any, viewerUserId: string | null = null) {
  const project = (state.projects || []).find((item: any) => item.id === task.project_id);
  const owner = taskMemberRows(task.id).find((member: any) => member.assignment_role === 'owner');
  const viewerMembership = viewerUserId
    ? taskMemberRows(task.id).find((member: any) => member.user_id === viewerUserId)
    : null;
  const pendingProgress = (state.progress_updates || [])
    .filter((update: any) => update.task_id === task.id && update.status === 'pending')
    .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
  return {
    ...task,
    projectId: task.projectId || task.project_id,
    projectName: task.projectName || project?.name || '',
    manager_id: project?.manager_id || task.manager_id || null,
    project_manager_id: project?.manager_id || task.project_manager_id || null,
    percentComplete: task.percentComplete ?? task.percent_complete ?? 0,
    startDate: task.startDate || task.start_date || null,
    dueDate: task.dueDate || task.due_date || null,
    createdBy: task.createdBy || task.created_by || null,
    createdAt: task.createdAt || task.created_at || new Date().toISOString(),
    updatedAt: task.updatedAt || task.updated_at || task.created_at || new Date().toISOString(),
    completedAt: task.completedAt || task.completed_at || null,
    archivedAt: task.archivedAt || task.archived_at || null,
    openBlockersCount: openBlockersForTask(task.id).length,
    ownerId: owner?.user_id || task.ownerId || null,
    memberRole: viewerMembership?.assignment_role || task.memberRole || 'admin',
    is_task_member: !!viewerMembership,
    pendingProgressUpdateId: pendingProgress?.id || null,
    pendingPercent: pendingProgress?.proposed_percent ?? null,
  };
}

function rowsForTaskQuery(q: string, values: any[]) {
  let rows = (state.tasks || []).filter((task: any) => !task.archived_at && !task.archivedAt);
  const taskId = firstKnownId(values, 'tasks');
  const projectId = firstKnownId(values, 'projects');
  const userId = firstKnownId(values, 'users');
  const statusValue = values.find((value) => ['todo', 'in_progress', 'waiting', 'done', 'blocked'].includes(value));
  const priorityValue = values.find((value) => ['low', 'medium', 'high'].includes(value));
  const searchValue = values.find((value) => typeof value === 'string' && value.includes('%')) || '';

  if (taskId && (q.includes('where id =') || q.includes('where t.id =') || q.includes('tm.task_id ='))) {
    rows = rows.filter((task: any) => task.id === taskId);
  }
  if (projectId && q.includes('project_id')) {
    rows = rows.filter((task: any) => task.project_id === projectId);
  }
  const shouldFilterByTaskMember = userId && (
    q.includes('inner join task_members') ||
    q.includes('join task_members tm on') ||
    (q.includes('tm.user_id =') && !q.includes('left join task_members tm_auth'))
  );
  if (shouldFilterByTaskMember) {
    rows = rows.filter((task: any) => {
      const project = (state.projects || []).find((item: any) => item.id === task.project_id);
      return taskMemberRows(task.id).some((member: any) => member.user_id === userId)
        || (q.includes('p.manager_id') && project?.manager_id === userId);
    });
  }
  if (statusValue && statusValue !== 'blocked') {
    rows = rows.filter((task: any) => task.status === statusValue);
  }
  if (statusValue === 'blocked') {
    rows = rows.filter((task: any) => openBlockersForTask(task.id).length > 0);
  }
  if (priorityValue) {
    rows = rows.filter((task: any) => task.priority === priorityValue);
  }
  if (searchValue) {
    rows = rows.filter((task: any) => containsSearch(task, searchValue, ['title', 'description']));
  }

  return rows;
}

function taskStatsForUser(userId: string, targetDate: string, projectId: string | null) {
  const dueSoon = new Date(`${targetDate}T00:00:00.000Z`);
  dueSoon.setUTCDate(dueSoon.getUTCDate() + 2);
  const dueSoonDate = dueSoon.toISOString().slice(0, 10);
  const memberships = taskMemberRows().filter((member: any) => member.user_id === userId);
  const tasks = memberships
    .map((member: any) => {
      const task = (state.tasks || []).find((item: any) => item.id === member.task_id);
      const project = task ? (state.projects || []).find((item: any) => item.id === task.project_id) : null;
      return { task, member, project };
    })
    .filter(({ task, project }: any) => task && project && !task.archived_at && (!projectId || task.project_id === projectId));

  const active = tasks.filter(({ task }: any) => task.status !== 'done');
  return {
    user_id: userId,
    active_tasks_count: active.length,
    required_tasks_count: tasks.filter(({ task, member, project }: any) => (
      member.report_required === true &&
      project.status === 'active' &&
      !project.archived_at &&
      task.status !== 'done' &&
      (!task.start_date || task.start_date <= targetDate)
    )).length,
    overdue_tasks_count: active.filter(({ task }: any) => task.due_date && task.due_date < targetDate).length,
    due_soon_tasks_count: active.filter(({ task }: any) => task.due_date && task.due_date >= targetDate && task.due_date <= dueSoonDate).length,
    no_due_date_tasks_count: active.filter(({ task }: any) => !task.due_date).length,
    blocked_tasks_count: active.filter(({ task }: any) => openBlockersForTask(task.id).length > 0).length,
  };
}

// In-Memory/File SQL Client Mock
const mockSql: any = (strings: any, ...values: any[]) => {
  loadState();

  // If called as function directly e.g. sql(array)
  if (!Array.isArray(strings) || (values.length === 0 && !Object.prototype.hasOwnProperty.call(strings, 'raw'))) {
    return { raw: strings };
  }

  let query = '';
  for (let i = 0; i < strings.length; i++) {
    query += strings[i] + (i < values.length ? '?' : '');
  }
  const q = query.trim().replace(/\s+/g, ' ');
  const lowercaseQ = q.toLowerCase();

  // Helper to extract unpacked values
  const unpackedValues = values.map(unwrapValue);
  state.progress_updates ||= [];

  if (process.env.MOCK_DB_DEBUG === '1') {
    console.log('[MOCK DB Query]:', q);
    console.log('[MOCK DB Values]:', JSON.stringify(unpackedValues.map(redactMockValue)));
  }

  if (lowercaseQ.startsWith('? order by') || lowercaseQ.startsWith('? limit')) {
    const baseRows = Array.isArray(unpackedValues[0]) ? unpackedValues[0] : [];
    return applyLimitOffset(baseRows, unpackedValues.slice(1));
  }

  if (lowercaseQ.startsWith('? and')) {
    const baseRows = Array.isArray(unpackedValues[0]) ? unpackedValues[0] : [];
    const participantId = firstKnownId(unpackedValues.slice(1), 'users');
    const projectId = firstKnownId(unpackedValues.slice(1), 'projects');
    let rows = baseRows;

    if (baseRows[0]?.total !== undefined || baseRows[0]?.count !== undefined) {
      let taskRows = rowsForTaskQuery(lowercaseQ, unpackedValues.slice(1));
      if (participantId) {
        taskRows = taskRows.filter((task: any) => taskMemberRows(task.id).some((member: any) => member.user_id === participantId));
      }
      if (projectId) {
        taskRows = taskRows.filter((task: any) => task.project_id === projectId);
      }
      return [{ total: taskRows.length, count: taskRows.length }];
    }

    if (participantId && lowercaseQ.includes('task_members')) {
      rows = rows.filter((row: any) => taskMemberRows(row.id).some((member: any) => member.user_id === participantId));
    }
    if (projectId && lowercaseQ.includes('project_id')) {
      rows = rows.filter((row: any) => (row.project_id || row.projectId) === projectId);
    }
    if (lowercaseQ.includes('order by') || lowercaseQ.includes('limit')) {
      rows = applyLimitOffset(rows, unpackedValues.slice(1));
    }
    return rows;
  }


  // 1. SELECT auth_sessions JOIN users (getSession in auth.ts)
  if (lowercaseQ.includes('from auth_sessions s') && lowercaseQ.includes('join users u')) {
    const tokenHash = unpackedValues[0];
    const session = state.auth_sessions.find((s: any) => s.token_hash === tokenHash && s.revoked_at === null);
    if (!session) return [];
    const user = state.users.find((u: any) => u.id === session.user_id);
    if (!user) return [];
    return [{
      session_id: session.id,
      token_hash: session.token_hash,
      user_id: session.user_id,
      session_created_at: session.created_at,
      last_seen_at: session.last_seen_at,
      expires_at: session.expires_at,
      revoked_at: session.revoked_at,
      user_uuid: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      user_status: user.status,
      must_change_password: user.must_change_password
    }];
  }

  // 2. UPDATE auth_sessions SET last_seen_at
  if (lowercaseQ.includes('update auth_sessions') && lowercaseQ.includes('last_seen_at =')) {
    const lastSeen = unpackedValues[0];
    const id = unpackedValues[1];
    const session = state.auth_sessions.find((s: any) => s.id === id);
    if (session) {
      session.last_seen_at = lastSeen;
      saveState();
    }
    return [];
  }

  // 3. SELECT user and credentials by username (login.ts)
  if (lowercaseQ.includes('from users u') && lowercaseQ.includes('left join user_credentials uc') && lowercaseQ.includes('u.normalized_username =')) {
    const normUsername = String(unpackedValues[0] || '').toLowerCase();
    const user = state.users.find((u: any) => u && u.username && String(u.username).toLowerCase() === normUsername);
    if (!user) return [];
    const cred = state.user_credentials.find((c: any) => c && c.user_id === user.id) || {
      password_hash: '',
      failed_login_count: 0,
      locked_until: null
    };
    return [{
      id: user.id,
      username: user.username,
      normalized_username: user.username.toLowerCase(),
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      must_change_password: user.must_change_password,
      password_hash: cred.password_hash,
      failed_login_count: cred.failed_login_count,
      locked_until: cred.locked_until
    }];
  }

  // 4. SELECT count from auth_login_attempts
  if (lowercaseQ.includes('select count(*)') && lowercaseQ.includes('from auth_login_attempts')) {
    const normUsername = unpackedValues[0];
    const ipHash = unpackedValues[1];
    const since = unpackedValues[2];
    const count = state.auth_login_attempts.filter((a: any) => {
      const matchUserOrIp = (a.normalized_username === normUsername || a.ip_hash === ipHash);
      const attemptedAt = a.attempted_at || a.created_at;
      const matchTime = since && attemptedAt ? new Date(attemptedAt) > new Date(since) : true;
      return matchUserOrIp && matchTime && a.success === false;
    }).length;
    return [{ count }];
  }

  // 5. INSERT INTO auth_login_attempts
  if (lowercaseQ.includes('insert into auth_login_attempts')) {
    const normUsername = unpackedValues[0];
    const ipHash = unpackedValues[1];
    const success = unpackedValues[2];
    const attemptedAt = unpackedValues[3] || new Date().toISOString();
    const reason = unpackedValues[4] || null;
    const attempt = {
      id: crypto.randomUUID(),
      normalized_username: normUsername,
      ip_hash: ipHash,
      success,
      attempted_at: attemptedAt,
      failure_reason: reason
    };
    state.auth_login_attempts.push(attempt);
    saveState();
    return [attempt];
  }

  // 6. UPDATE user_credentials
  if (lowercaseQ.includes('update user_credentials')) {
    const userId = unpackedValues[unpackedValues.length - 1];
    const cred = state.user_credentials.find((c: any) => c.user_id === userId);
    if (cred) {
      if (lowercaseQ.includes('failed_login_count =')) {
        cred.failed_login_count = unpackedValues[0];
        const lockedUntilIndex = lowercaseQ.includes('last_failed_login_at') ? 2 : 1;
        cred.locked_until = unpackedValues[lockedUntilIndex] || null;
      }
      if (lowercaseQ.includes('password_hash =')) {
        cred.password_hash = unpackedValues[0];
      }
      saveState();
    }
    return [];
  }

  // 7. INSERT INTO auth_sessions
  if (lowercaseQ.includes('insert into auth_sessions')) {
    const session = {
      id: crypto.randomUUID(),
      token_hash: unpackedValues[0],
      user_id: unpackedValues[1],
      expires_at: unpackedValues[2],
      last_seen_at: unpackedValues[3],
      user_agent: unpackedValues[4],
      ip_hash: unpackedValues[5],
      revoked_at: null,
      created_at: new Date().toISOString()
    };
    state.auth_sessions.push(session);
    saveState();
    return [session];
  }

  // 8. UPDATE users last_login_at
  if (lowercaseQ.includes('update users') && lowercaseQ.includes('last_login_at =')) {
    const lastLogin = unpackedValues[0];
    const id = unpackedValues[1];
    const user = state.users.find((u: any) => u.id === id);
    if (user) {
      user.last_login_at = lastLogin;
      saveState();
    }
    return [];
  }

  // 9. SELECT user by id (users/me.ts)
  if (lowercaseQ.includes('select u.id, u.username, u.full_name') && (lowercaseQ.includes('where u.id =') || lowercaseQ.includes('where id ='))) {
    const id = unpackedValues[0];
    const user = state.users.find((u: any) => u.id === id);
    return user ? [user] : [];
  }

  // 9b. Work schedules list/export/upsert/delete
  if (lowercaseQ.includes('insert into work_schedules')) {
    const userId = unpackedValues[0];
    const workDate = String(unpackedValues[1]).slice(0, 10);
    const shift = unpackedValues[2];
    const customStart = unpackedValues[3] || null;
    const customEnd = unpackedValues[4] || null;
    const updatedBy = unpackedValues[5] || null;
    let row = state.work_schedules.find((item: any) => item.user_id === userId && item.work_date === workDate);
    if (row) {
      row.shift = shift;
      row.custom_start = customStart;
      row.custom_end = customEnd;
      row.updated_by = updatedBy;
      row.updated_at = new Date().toISOString();
    } else {
      row = {
        id: crypto.randomUUID(),
        user_id: userId,
        work_date: workDate,
        shift,
        custom_start: customStart,
        custom_end: customEnd,
        updated_by: updatedBy,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      state.work_schedules.push(row);
    }
    saveState();
    return [row];
  }

  if (lowercaseQ.includes('delete from work_schedules')) {
    const userId = unpackedValues[0];
    const workDate = String(unpackedValues[1]).slice(0, 10);
    state.work_schedules = (state.work_schedules || []).filter((item: any) => !(item.user_id === userId && item.work_date === workDate));
    saveState();
    return [];
  }

  if (lowercaseQ.includes('from work_schedules')) {
    const startDate = String(unpackedValues[0] || '2025-01-01').slice(0, 10);
    const endDate = String(unpackedValues[1] || '9999-12-31').slice(0, 10);
    const schedules = (state.work_schedules || [])
      .filter((item: any) => item.work_date >= startDate && item.work_date <= endDate)
      .sort((a: any, b: any) => a.work_date.localeCompare(b.work_date));

    if (lowercaseQ.includes('join users')) {
      return schedules.map((item: any) => {
        const user = state.users.find((u: any) => u.id === item.user_id) || {};
        return {
          ...item,
          username: user.username,
          full_name: user.full_name,
          department: user.department || null,
          position: user.position || null
        };
      });
    }

    return schedules;
  }

  // 10. Activity logs and notification logs
  if (lowercaseQ.includes('from activity_logs l')) {
    let logs = [...(state.activity_logs || [])].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
    const searchValue = unpackedValues.find((value) => typeof value === 'string' && value.includes('%')) || '';
    if (searchValue) {
      logs = logs.filter((log: any) => {
        const user = state.users.find((item: any) => item.id === log.actor_id) || {};
        return containsSearch({ ...log, username: user.username, full_name: user.full_name }, searchValue, ['action', 'username', 'full_name']);
      });
    }
    if (lowercaseQ.includes('count(')) {
      return [{ count: logs.length }];
    }
    return applyLimitOffset(logs, unpackedValues).map((log: any) => {
      const user = state.users.find((item: any) => item.id === log.actor_id) || {};
      return {
        ...log,
        actorId: log.actor_id,
        actorType: log.actor_type,
        entityType: log.entity_type,
        entityId: log.entity_id,
        oldValues: log.old_values || null,
        newValues: log.new_values || null,
        createdAt: log.created_at,
        actorUsername: user.username || null,
        actorFullName: user.full_name || null,
      };
    });
  }

  if (lowercaseQ.includes('from notifications_log n')) {
    let logs = [...(state.notifications_log || [])].sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)));
    const statusValue = unpackedValues.find((value) => ['pending', 'sent', 'failed', 'skipped'].includes(value));
    const searchValue = unpackedValues.find((value) => typeof value === 'string' && value.includes('%')) || '';
    if (statusValue) {
      logs = logs.filter((log: any) => log.status === statusValue);
    }
    if (searchValue) {
      logs = logs.filter((log: any) => {
        const user = state.users.find((item: any) => item.id === log.recipient_user_id) || {};
        return containsSearch({ ...user }, searchValue, ['username', 'full_name', 'email']);
      });
    }
    if (lowercaseQ.includes('count(')) {
      return [{ count: logs.length }];
    }
    return applyLimitOffset(logs, unpackedValues).map((log: any) => {
      const user = state.users.find((item: any) => item.id === log.recipient_user_id) || {};
      return {
        ...log,
        recipientUserId: log.recipient_user_id,
        notificationDate: log.notification_date,
        notificationType: log.notification_type,
        dedupeKey: log.dedupe_key,
        providerMessageId: log.provider_message_id,
        errorCode: log.error_code,
        errorMessage: log.error_message,
        originalNotificationId: log.original_notification_id,
        createdAt: log.created_at,
        sentAt: log.sent_at,
        recipientUsername: user.username || null,
        recipientFullName: user.full_name || null,
        recipientEmail: user.email || null,
      };
    });
  }

  // 11. Users
  if (lowercaseQ.includes('from users u') || lowercaseQ.includes('from users')) {
    let users = [...(state.users || [])];
    const statusValue = unpackedValues.find((value) => ['active', 'locked', 'inactive'].includes(value));
    const roleValue = unpackedValues.find((value) => ['admin', 'member'].includes(value));
    const userIds = unpackedValues.find((value) => Array.isArray(value));
    const searchValue = unpackedValues.find((value) => typeof value === 'string' && value.includes('%')) || '';

    if (userIds) {
      users = users.filter((user: any) => userIds.includes(user.id));
    }
    const userId = firstKnownId(unpackedValues, 'users');
    if (userId && (lowercaseQ.includes('where id =') || lowercaseQ.includes('where u.id =') || lowercaseQ.includes('id = ?') || lowercaseQ.includes('id = $') || lowercaseQ.includes('u.id = $'))) {
      users = users.filter((user: any) => user.id === userId);
    }
    if (statusValue || lowercaseQ.includes("where status = 'active'") || lowercaseQ.includes('where status = ?')) {
      users = users.filter((user: any) => user.status === (statusValue || 'active'));
    }
    if (roleValue || lowercaseQ.includes("role = 'admin'")) {
      users = users.filter((user: any) => user.role === (roleValue || 'admin'));
    }
    if (searchValue) {
      users = users.filter((user: any) => containsSearch(user, searchValue, ['username', 'full_name', 'email', 'department', 'position']));
    }
    if (lowercaseQ.includes('count(')) {
      return [{ count: users.length }];
    }
    return applyLimitOffset(users, unpackedValues);
  }

  if (lowercaseQ.includes('insert into projects')) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      name: unpackedValues[0],
      description: unpackedValues[1] || null,
      status: unpackedValues[2] || 'planning',
      start_date: unpackedValues[3] || null,
      due_date: unpackedValues[4] || null,
      manager_id: unpackedValues[5] || null,
      created_by: unpackedValues[6] || null,
      version: 1,
      created_at: now,
      updated_at: now,
      archived_at: null,
    };
    state.projects ||= [];
    state.projects.push(row);
    saveState();
    return [row];
  }

  if (lowercaseQ.includes("update projects set status = 'active'")) {
    const projectId = unpackedValues[unpackedValues.length - 1];
    const project = (state.projects || []).find((item: any) => item.id === projectId);
    if (project) {
      project.status = 'active';
      project.rejection_reason = null;
      project.reviewed_by = unpackedValues[0] || null;
      project.reviewed_at = new Date().toISOString();
      project.updated_at = new Date().toISOString();
      saveState();
    }
    return [];
  }

  if (lowercaseQ.includes("update projects set status = 'rejected'")) {
    const projectId = unpackedValues[unpackedValues.length - 1];
    const project = (state.projects || []).find((item: any) => item.id === projectId);
    if (project) {
      project.status = 'rejected';
      project.rejection_reason = unpackedValues[0] || null;
      project.reviewed_by = unpackedValues[1] || null;
      project.reviewed_at = new Date().toISOString();
      project.updated_at = new Date().toISOString();
      saveState();
    }
    return [];
  }

  if (lowercaseQ.includes('insert into progress_updates')) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      task_id: unpackedValues[0],
      submitted_by: unpackedValues[1],
      proposed_percent: unpackedValues[2],
      description: unpackedValues[3] || null,
      evidence_url: unpackedValues[4] || null,
      status: 'pending',
      reviewed_by: null,
      reviewed_at: null,
      final_percent: null,
      review_note: null,
      created_at: now,
      updated_at: now,
    };
    state.progress_updates.push(row);
    saveState();
    return [row];
  }

  if (lowercaseQ.includes('from progress_updates')) {
    let rows = [...(state.progress_updates || [])];
    const progressUpdateId = firstKnownId(unpackedValues, 'progress_updates');
    const taskId = firstKnownId(unpackedValues, 'tasks');
    const userId = firstKnownId(unpackedValues, 'users');
    const statusValue = unpackedValues.find((value) => ['pending', 'approved', 'adjusted', 'rejected'].includes(value));

    if (progressUpdateId) rows = rows.filter((row: any) => row.id === progressUpdateId);
    if (taskId && lowercaseQ.includes('task_id')) rows = rows.filter((row: any) => row.task_id === taskId);
    if (userId && lowercaseQ.includes('submitted_by')) rows = rows.filter((row: any) => row.submitted_by === userId);
    if (statusValue || lowercaseQ.includes("status = 'pending'")) {
      rows = rows.filter((row: any) => row.status === (statusValue || 'pending'));
    }

    return rows
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .map((row: any) => {
        const task = (state.tasks || []).find((item: any) => item.id === row.task_id) || {};
        const project = (state.projects || []).find((item: any) => item.id === task.project_id) || {};
        const submitter = (state.users || []).find((item: any) => item.id === row.submitted_by) || {};
        const reviewer = (state.users || []).find((item: any) => item.id === row.reviewed_by) || {};
        return {
          ...row,
          taskId: row.task_id,
          submittedBy: row.submitted_by,
          proposedPercent: row.proposed_percent,
          evidenceUrl: row.evidence_url,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at,
          finalPercent: row.final_percent,
          reviewNote: row.review_note,
          createdAt: row.created_at,
          taskTitle: task.title || null,
          currentPercent: task.percent_complete ?? 0,
          project_id: task.project_id || project.id || null,
          projectId: task.project_id || project.id || null,
          projectName: project.name || null,
          task_version: task.version || 1,
          submitterName: submitter.full_name || null,
          submitterUsername: submitter.username || null,
          reviewerName: reviewer.full_name || null,
        };
      });
  }

  if (lowercaseQ.includes('update progress_updates')) {
    const progressUpdateId = firstKnownId(unpackedValues, 'progress_updates') || unpackedValues[unpackedValues.length - 1];
    const row = (state.progress_updates || []).find((item: any) => item.id === progressUpdateId);
    if (row) {
      row.status = unpackedValues[0] || row.status;
      row.reviewed_by = unpackedValues[1] || null;
      row.reviewed_at = new Date().toISOString();
      row.final_percent = unpackedValues[2] ?? row.proposed_percent;
      row.review_note = unpackedValues[3] || null;
      row.updated_at = new Date().toISOString();
      saveState();
    }
    return [];
  }

  if (lowercaseQ.includes('insert into tasks')) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      project_id: unpackedValues[0],
      title: unpackedValues[1],
      description: unpackedValues[2] || null,
      parent_id: unpackedValues[3] || null,
      start_date: unpackedValues[4] || null,
      due_date: unpackedValues[5] || null,
      priority: unpackedValues[6] || 'medium',
      status: unpackedValues[7] || 'todo',
      percent_complete: unpackedValues[8] ?? 0,
      version: unpackedValues[9] ?? 1,
      created_by: unpackedValues[10] || null,
      completed_at: unpackedValues[11] || null,
      created_at: now,
      updated_at: now,
      archived_at: null,
    };
    state.tasks ||= [];
    state.tasks.push(row);
    saveState();
    return [row];
  }

  if (lowercaseQ.includes('update tasks') && lowercaseQ.includes('archived_at = current_timestamp')) {
    const taskId = firstKnownId(unpackedValues, 'tasks') || unpackedValues[unpackedValues.length - 1];
    const task = (state.tasks || []).find((item: any) => item.id === taskId);
    if (task) {
      task.archived_at = new Date().toISOString();
      task.updated_at = new Date().toISOString();
      task.version = Number(task.version || 1) + 1;
      saveState();
    }
    return [];
  }

  if (
    lowercaseQ.includes('update tasks') &&
    lowercaseQ.includes('status = case') &&
    lowercaseQ.includes('completed_at = case') &&
    lowercaseQ.includes('percent_complete =')
  ) {
    const taskId = firstKnownId(unpackedValues, 'tasks') || unpackedValues[unpackedValues.length - 1];
    const approvedPercent = Number(unpackedValues[0] ?? 0);
    const task = (state.tasks || []).find((item: any) => item.id === taskId);
    if (task) {
      task.percent_complete = approvedPercent;
      task.status = approvedPercent === 100 ? 'done' : approvedPercent > 0 ? 'in_progress' : 'todo';
      task.completed_at = approvedPercent === 100 ? new Date().toISOString() : null;
      task.version = Number(task.version || 1) + 1;
      task.updated_at = new Date().toISOString();
      saveState();
    }
    return task ? [task] : [];
  }

  if (lowercaseQ.includes('update tasks') && lowercaseQ.includes('percent_complete =')) {
    const taskId = firstKnownId(unpackedValues, 'tasks') || unpackedValues[unpackedValues.length - 1];
    const task = (state.tasks || []).find((item: any) => item.id === taskId);
    if (task) {
      task.title = unpackedValues[0];
      task.description = unpackedValues[1] || null;
      task.status = unpackedValues[2] || task.status;
      task.priority = unpackedValues[3] || task.priority;
      task.percent_complete = unpackedValues[4] ?? task.percent_complete ?? 0;
      task.start_date = unpackedValues[5] || null;
      task.due_date = unpackedValues[6] || null;
      task.completed_at = unpackedValues[7] || null;
      task.version = Number(task.version || 1) + 1;
      task.updated_at = new Date().toISOString();
      saveState();
    }
    return task ? [task] : [];
  }

  if (lowercaseQ.includes('insert into task_members')) {
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      task_id: unpackedValues[0],
      user_id: unpackedValues[1],
      assignment_role: unpackedValues[2] || 'collaborator',
      report_required: unpackedValues[3] ?? true,
      assigned_at: now,
      removed_at: null,
      created_at: now,
      updated_at: now,
    };
    state.task_members ||= [];
    state.task_members.push(row);
    saveState();
    return [row];
  }

  if (lowercaseQ.includes('update task_members') && lowercaseQ.includes('removed_at = current_timestamp')) {
    const taskId = firstKnownId(unpackedValues, 'tasks');
    const userId = firstKnownId(unpackedValues, 'users');
    const roleValue = unpackedValues.find((value) => ['owner', 'collaborator', 'reviewer'].includes(value));
    for (const member of state.task_members || []) {
      if (member.removed_at) continue;
      if (taskId && member.task_id !== taskId) continue;
      if (userId && member.user_id !== userId) continue;
      if (roleValue && member.assignment_role !== roleValue) continue;
      member.removed_at = new Date().toISOString();
      member.updated_at = new Date().toISOString();
    }
    saveState();
    return [];
  }

  // 12. Project members
  if (lowercaseQ.includes('insert into project_members')) {
    const projectId = unpackedValues[0];
    const userId = unpackedValues[1];
    const projectRole = unpackedValues[2] || 'member';
    const now = new Date().toISOString();
    let row = (state.project_members || []).find((member: any) => member.project_id === projectId && member.user_id === userId);

    if (row) {
      row.project_role = projectRole;
      row.role = projectRole;
      row.removed_at = null;
      row.updated_at = now;
    } else {
      row = {
        id: crypto.randomUUID(),
        project_id: projectId,
        user_id: userId,
        project_role: projectRole,
        role: projectRole,
        joined_at: now,
        removed_at: null,
        created_at: now,
        updated_at: now,
      };
      state.project_members.push(row);
    }

    saveState();
    return [row];
  }

  if (lowercaseQ.includes('update project_members') && lowercaseQ.includes("project_role = 'manager'")) {
    const memberId = unpackedValues[0];
    const row = (state.project_members || []).find((member: any) => member.id === memberId);
    if (row) {
      row.project_role = 'manager';
      row.role = 'manager';
      row.removed_at = null;
      row.updated_at = new Date().toISOString();
      saveState();
    }
    return [];
  }

  if (lowercaseQ.includes('(select count(*) from project_members')) {
    const projectId = firstKnownId(unpackedValues, 'projects');
    const userId = firstKnownId(unpackedValues, 'users');
    return [{
      is_project_member: projectMemberRows(projectId).some((member: any) => member.user_id === userId) ? 1 : 0,
      is_task_member: taskMemberRows().some((member: any) => member.user_id === userId) ? 1 : 0,
    }];
  }

  if (lowercaseQ.includes('from project_members pm') && lowercaseQ.includes('join users')) {
    const projectId = firstKnownId(unpackedValues, 'projects');
    return projectMemberRows(projectId).map((member: any) => {
      const user = state.users.find((item: any) => item.id === member.user_id) || {};
      return {
        id: member.id,
        userId: member.user_id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        projectRole: member.project_role || member.role || 'member',
        joinedAt: member.joined_at,
      };
    });
  }

  if (lowercaseQ.includes('from project_members')) {
    const projectId = firstKnownId(unpackedValues, 'projects');
    const userId = firstKnownId(unpackedValues, 'users');
    let rows = projectMemberRows(projectId);
    if (userId) {
      rows = rows.filter((member: any) => member.user_id === userId);
    }
    return rows;
  }

  // 13. Projects
  if (lowercaseQ.includes('update projects set')) {
    const projectId = unpackedValues[unpackedValues.length - 1];
    const project = (state.projects || []).find((item: any) => item.id === projectId);
    if (project) {
      const status = unpackedValues[2];
      project.name = unpackedValues[0];
      project.description = unpackedValues[1] || null;
      project.status = status;
      project.start_date = unpackedValues[3] || null;
      project.due_date = unpackedValues[4] || null;
      project.manager_id = unpackedValues[5] || null;
      project.archived_at = status === 'archived' ? (project.archived_at || new Date().toISOString()) : null;
      project.updated_at = new Date().toISOString();
      saveState();
    }
    return [];
  }

  if (lowercaseQ.includes('from projects p') || lowercaseQ.includes('from projects')) {
    let projects = (state.projects || []).filter((project: any) => !project.archived_at && !project.archivedAt);
    const projectId = firstKnownId(unpackedValues, 'projects');
    const userId = firstKnownId(unpackedValues, 'users');
    const statusValue = unpackedValues.find((value) => ['planning', 'active', 'paused', 'completed', 'archived', 'rejected'].includes(value));
    const searchValue = unpackedValues.find((value) => typeof value === 'string' && value.includes('%')) || '';

    if (projectId && (lowercaseQ.includes('where id =') || lowercaseQ.includes('where p.id =') || lowercaseQ.includes('id = ?'))) {
      projects = projects.filter((project: any) => project.id === projectId);
    }
    if (userId && lowercaseQ.includes('join project_members')) {
      const allowedProjectIds = new Set(projectMemberRows().filter((member: any) => member.user_id === userId).map((member: any) => member.project_id));
      projects = projects.filter((project: any) => allowedProjectIds.has(project.id));
    }
    if (statusValue) {
      projects = projects.filter((project: any) => project.status === statusValue);
    }
    if (searchValue) {
      projects = projects.filter((project: any) => containsSearch(project, searchValue, ['name', 'description']));
    }
    if (lowercaseQ.includes('count(')) {
      return [{ count: projects.length }];
    }
    return applyLimitOffset(projects.map(mapProject), unpackedValues);
  }

  // 14. Task blockers before generic task handling
  if (lowercaseQ.includes('from task_blockers') && !lowercaseQ.includes('from tasks t')) {
    const taskId = firstKnownId(unpackedValues, 'tasks');
    const userId = firstKnownId(unpackedValues, 'users');
    const checkinId = firstKnownId(unpackedValues, 'daily_checkins');
    const projectId = firstKnownId(unpackedValues, 'projects');
    let blockers = [...(state.task_blockers || [])];

    if (taskId) blockers = blockers.filter((blocker: any) => blocker.task_id === taskId);
    if (userId && lowercaseQ.includes('reported_by')) blockers = blockers.filter((blocker: any) => blocker.reported_by === userId);
    if (checkinId && lowercaseQ.includes('checkin_item_id in')) {
      const itemIds = new Set((state.daily_checkin_items || []).filter((item: any) => item.checkin_id === checkinId).map((item: any) => item.id));
      blockers = blockers.filter((blocker: any) => itemIds.has(blocker.checkin_item_id));
    }
    if (projectId) {
      const projectTaskIds = new Set((state.tasks || []).filter((task: any) => task.project_id === projectId).map((task: any) => task.id));
      blockers = blockers.filter((blocker: any) => projectTaskIds.has(blocker.task_id));
    }
    if (lowercaseQ.includes("status = 'open'") || unpackedValues.includes('open')) {
      blockers = blockers.filter((blocker: any) => blocker.status === 'open');
    }
    if (lowercaseQ.includes('count(')) {
      return [{ count: blockers.length }];
    }
    return blockers
      .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((blocker: any) => {
        const reporter = state.users.find((user: any) => user.id === blocker.reported_by) || {};
        const resolver = state.users.find((user: any) => user.id === blocker.resolved_by) || {};
        return {
          ...blocker,
          reporter_id: blocker.reported_by,
          reporter_username: reporter.username || null,
          reporter_full_name: reporter.full_name || null,
          resolver_username: resolver.username || null,
          resolver_full_name: resolver.full_name || null,
          taskId: blocker.task_id,
          reportedBy: blocker.reported_by,
          createdAt: blocker.created_at,
          resolvedAt: blocker.resolved_at,
        };
      });
  }

  // 15. Tasks
  if (lowercaseQ.includes('from tasks')) {
    const projectId = firstKnownId(unpackedValues, 'projects');

    if (lowercaseQ.includes('count(distinct t.id) filter')) {
      const targetDate = dateKey(unpackedValues[0]) || new Date().toISOString().slice(0, 10);
      const dueSoonDate = dateKey(unpackedValues[1]) || targetDate;
      let rows = rowsForTaskQuery(lowercaseQ, unpackedValues);
      if (projectId) rows = rows.filter((task: any) => task.project_id === projectId);
      const activeRows = rows.filter((task: any) => task.status !== 'done');
      return [{
        overdue: activeRows.filter((task: any) => task.due_date && task.due_date < targetDate).length,
        due_soon: activeRows.filter((task: any) => task.due_date && task.due_date >= targetDate && task.due_date <= dueSoonDate).length,
        no_due_date: activeRows.filter((task: any) => !task.due_date).length,
        blocked: activeRows.filter((task: any) => openBlockersForTask(task.id).length > 0).length,
      }];
    }

    if (lowercaseQ.includes('select status, count(id) as count')) {
      let rows = rowsForTaskQuery(lowercaseQ, unpackedValues);
      if (projectId) rows = rows.filter((task: any) => task.project_id === projectId);
      return ['todo', 'in_progress', 'waiting', 'done'].map((status) => ({
        status,
        count: rows.filter((task: any) => task.status === status).length,
      }));
    }

    if (lowercaseQ.startsWith('select count')) {
      let rows = rowsForTaskQuery(lowercaseQ, unpackedValues);
      if (lowercaseQ.includes("status != 'done'")) {
        rows = rows.filter((task: any) => task.status !== 'done');
      }
      if (lowercaseQ.includes("status = 'done'")) {
        rows = rows.filter((task: any) => task.status === 'done');
      }
      if (lowercaseQ.includes('due_date < current_date')) {
        rows = rows.filter((task: any) => task.status !== 'done' && task.due_date && task.due_date < new Date().toISOString().slice(0, 10));
      }
      return [{ count: rows.length, total: rows.length }];
    }

    let rows = rowsForTaskQuery(lowercaseQ, unpackedValues);
    const viewerUserId = lowercaseQ.includes('task_members') ? firstKnownId(unpackedValues, 'users') : null;
    const mapped = rows.map((task: any) => {
      const membership = viewerUserId
        ? taskMemberRows(task.id).find((member: any) => member.user_id === viewerUserId)
        : null;
      return {
        ...mapTask(task, viewerUserId),
        role: membership?.assignment_role || 'admin',
        assignmentRole: membership?.assignment_role || 'admin',
        assignment_role: membership?.assignment_role || 'admin',
        reportRequired: membership?.report_required ?? true,
      };
    });
    return applyLimitOffset(mapped, unpackedValues);
  }

  // 16. Task members
  if (lowercaseQ.includes('from task_members')) {
    if (lowercaseQ.includes('count(tm.task_id)')) {
      const userIds = unpackedValues.find((value) => Array.isArray(value)) || [];
      return userIds.map((uId: string) => {
        const count = taskMemberRows().filter((member: any) => member.user_id === uId).length;
        return { user_id: uId, count };
      });
    }

    if (lowercaseQ.includes('count(distinct t.id) filter')) {
      const userIds = unpackedValues.find((value) => Array.isArray(value)) || [];
      const targetDate = unpackedValues.find((value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) || new Date().toISOString().slice(0, 10);
      const projectId = firstKnownId(unpackedValues, 'projects');
      return userIds.map((userId: string) => taskStatsForUser(userId, targetDate, projectId));
    }

    const taskId = firstKnownId(unpackedValues, 'tasks');
    const userId = firstKnownId(unpackedValues, 'users');
    let rows = taskMemberRows(taskId);
    if (userId) rows = rows.filter((member: any) => member.user_id === userId);
    return rows.map((member: any) => ({
      ...member,
      taskId: member.task_id,
      userId: member.user_id,
      assignmentRole: member.assignment_role,
      reportRequired: member.report_required,
      assignedAt: member.assigned_at,
      removedAt: member.removed_at,
    }));
  }

  // 17. User absences
  if (lowercaseQ.includes('from user_absences')) {
    const userIds = unpackedValues.find((value) => Array.isArray(value)) || null;
    const userId = firstKnownId(unpackedValues, 'users');
    const dateValues = unpackedValues.filter((value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
    const targetDate = dateValues[0] || null;
    let absences = [...(state.user_absences || [])];
    if (targetDate && (lowercaseQ.includes('start_date <=') || lowercaseQ.includes('end_date >='))) {
      absences = absences.filter((absence: any) => absence.start_date <= targetDate && absence.end_date >= targetDate);
    }
    if (userIds) absences = absences.filter((absence: any) => userIds.includes(absence.user_id));
    if (userId && lowercaseQ.includes('user_id')) absences = absences.filter((absence: any) => absence.user_id === userId);
    if (lowercaseQ.includes('count(')) {
      return [{ count: new Set(absences.map((absence: any) => absence.user_id)).size || absences.length }];
    }
    return absences;
  }

  // 18. Non-working days
  if (lowercaseQ.includes('from non_working_days')) {
    if (lowercaseQ.includes('work_date >=') || lowercaseQ.includes('order by work_date')) {
      const startDate = unpackedValues[0] ? String(unpackedValues[0]).slice(0, 10) : null;
      const endDate = unpackedValues[1] ? String(unpackedValues[1]).slice(0, 10) : null;
      return (state.non_working_days || [])
        .filter((day: any) => (!startDate || day.work_date >= startDate) && (!endDate || day.work_date <= endDate))
        .sort((a: any, b: any) => a.work_date.localeCompare(b.work_date));
    }
    const targetDate = String(unpackedValues[0] || '').slice(0, 10);
    const match = state.non_working_days.find((d: any) => d.work_date === targetDate);
    return match ? [match] : [];
  }

  // 19. Daily checkins
  if (lowercaseQ.includes('from daily_checkins')) {
    const userIds = unpackedValues.find((value) => Array.isArray(value)) || null;
    const userId = firstKnownId(unpackedValues, 'users');
    const dateValues = unpackedValues.filter((value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value));
    let rows = [...(state.daily_checkins || [])];
    if (lowercaseQ.includes('checkin_date =') && dateValues.length > 0) {
      rows = rows.filter((checkin: any) => checkin.checkin_date === dateValues[0]);
    }
    if (lowercaseQ.includes('checkin_date >=') && dateValues.length > 0) {
      rows = rows.filter((checkin: any) => checkin.checkin_date >= dateValues[0]);
    }
    if (lowercaseQ.includes('checkin_date <=') && dateValues.length > 1) {
      rows = rows.filter((checkin: any) => checkin.checkin_date <= dateValues[1]);
    }
    if (userIds) rows = rows.filter((checkin: any) => userIds.includes(checkin.user_id));
    if (userId && lowercaseQ.includes('user_id')) rows = rows.filter((checkin: any) => checkin.user_id === userId);
    return applyLimitOffset(rows.sort((a: any, b: any) => String(b.checkin_date).localeCompare(String(a.checkin_date))), unpackedValues);
  }

  // 20. Daily checkin items
  if (lowercaseQ.includes('from daily_checkin_items')) {
    const checkinIds = unpackedValues.find((value) => Array.isArray(value)) || null;
    const checkinId = firstKnownId(unpackedValues, 'daily_checkins');
    let rows = [...(state.daily_checkin_items || [])].filter((item: any) => !item.removed_at);
    if (checkinIds) rows = rows.filter((item: any) => checkinIds.includes(item.checkin_id));
    if (checkinId) rows = rows.filter((item: any) => item.checkin_id === checkinId);
    if (lowercaseQ.includes('count(')) {
      const counts = new Map<string, number>();
      rows.forEach((item: any) => counts.set(item.checkin_id, (counts.get(item.checkin_id) || 0) + 1));
      return Array.from(counts.entries()).map(([id, count]) => ({ checkin_id: id, count }));
    }
    return rows.map((item: any) => ({
      ...item,
      taskId: item.task_id,
      workDone: item.progress_note,
      memberPercentComplete: item.member_percent_complete,
      percentCompleteProposed: item.proposed_task_percent,
      progress: item.proposed_task_percent,
      proposedTaskStatus: item.proposed_task_status,
      statusUpdate: item.proposed_task_status,
      timeSpentHours: item.time_spent_hours,
      timeSpent: item.time_spent_hours,
      helpNeeded: item.help_needed,
    }));
  }

  // Generic INSERT/UPDATE matcher for anything else
  const insertRegex = /insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values/i;
  const insertMatch = q.match(insertRegex);
  if (insertMatch && insertMatch[1] && insertMatch[2]) {
    const table = insertMatch[1].toLowerCase();
    const cols = insertMatch[2].split(',').map(s => s.trim().replace(/"/g, ''));
    const newRow: any = { id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    cols.forEach((col, idx) => {
      newRow[col] = unpackedValues[idx];
    });
    if (!state[table]) state[table] = [];
    state[table].push(newRow);
    saveState();
    return [newRow];
  }

  const updateRegex = /update\s+(\w+)\s+set\s+([\s\S]+?)\s+where\s+([\s\S]+)/i;
  const updateMatch = q.match(updateRegex);
  if (updateMatch && updateMatch[1] && updateMatch[2] && updateMatch[3]) {
    const table = updateMatch[1].toLowerCase();
    const setPart = updateMatch[2];
    const setParamsCount = (setPart.match(/\?/g) || []).length;
    const setAssignments = setPart.split(',').map(s => (s.trim().split('=')[0] || '').trim().replace(/"/g, ''));
    const wherePart = updateMatch[3];
    const whereColMatch = wherePart.match(/(\w+)\s*=/);
    const whereCol = (whereColMatch ? whereColMatch[1] : 'id') || 'id';
    const whereVal = unpackedValues[setParamsCount];
    const rows = state[table] || [];
    const targetRows = rows.filter((r: any) => r[whereCol] === whereVal);
    targetRows.forEach((row: any) => {
      setAssignments.forEach((col, idx) => {
        row[col] = unpackedValues[idx];
      });
      row.updated_at = new Date().toISOString();
    });
    saveState();
    return [];
  }

  return [];
};

mockSql.begin = async (cb: any) => {
  return cb(mockSql);
};

// Lazy-initialized real SQL client.
// We cannot create it at module load time because api-server.ts loads .env.local
// AFTER this module is first imported, so DATABASE_URL would still be the placeholder.
let _realSql: any = null;

function getRealSql(): any {
  if (_realSql) return _realSql;
  const dbUrl = process.env['DATABASE_URL'];
  const isPlaceholder = !dbUrl || dbUrl === 'postgres://postgres:postgres@localhost:5432/postgres';
  if (isPlaceholder) return null;
  try {
    _realSql = postgres(dbUrl, {
      ssl: { rejectUnauthorized: false },
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    console.log('[db] Using real PostgreSQL:', dbUrl.replace(/:[^:@]+@/, ':***@'));
  } catch (e) {
    console.error('[db] Failed to create postgres client:', e);
  }
  return _realSql;
}

function useReal(): boolean {
  const dbUrl = process.env['DATABASE_URL'];
  return !!dbUrl && dbUrl !== 'postgres://postgres:postgres@localhost:5432/postgres';
}

export const sql = new Proxy(mockSql, {
  get(target, prop, receiver) {
    if (!useReal()) return Reflect.get(target, prop, receiver);
    const real = getRealSql();
    if (real && prop in real) return Reflect.get(real, prop, receiver);
    return Reflect.get(target, prop, receiver);
  },
  apply(target, thisArg, argumentsList) {
    if (!useReal()) return target.apply(thisArg, argumentsList);
    const real = getRealSql();
    if (real) return real.apply(real, argumentsList);
    return target.apply(thisArg, argumentsList);
  }
}) as unknown as postgres.Sql<Record<string, never>>;

