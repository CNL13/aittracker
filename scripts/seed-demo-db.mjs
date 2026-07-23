import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ROOT = process.cwd();
const DB_FILE = path.join(ROOT, 'db_state.json');
const PASSWORD = 'Password123!';
const SEED_VERSION = 'full-test-2026-07-19';
const TODAY = '2026-07-19';
const SCHEDULE_START = '2026-05-01';

function idFor(...parts) {
  const hex = crypto.createHash('sha256').update(parts.join(':')).digest('hex').slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

function iso(date, hour = 8, minute = 0) {
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`;
}

function dateFromKey(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function keyFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const date = dateFromKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return keyFromDate(date);
}

function eachDate(start, end, cb) {
  for (let cursor = dateFromKey(start); keyFromDate(cursor) <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    cb(keyFromDate(cursor), cursor.getUTCDay());
  }
}

function normalize(username) {
  return username.trim().toLowerCase();
}

function makeUser(index, username, fullName, role, department, position, status = 'active') {
  const created = iso(addDays('2026-01-05', index), 2 + (index % 6), 10);
  return {
    id: idFor('user', username),
    username,
    normalized_username: normalize(username),
    full_name: fullName,
    email: `${username}@ait.local`,
    role,
    status,
    must_change_password: false,
    avatar_url: null,
    department,
    position,
    last_login_at: status === 'active' ? iso(addDays(TODAY, -1 * (index % 6)), 1 + (index % 8), 30) : null,
    created_by: null,
    created_at: created,
    updated_at: created,
    deactivated_at: status === 'inactive' ? iso('2026-06-20', 3, 0) : null,
  };
}

function camelProject(project) {
  return {
    ...project,
    startDate: project.start_date,
    dueDate: project.due_date,
    managerId: project.manager_id,
    createdBy: project.created_by,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    archivedAt: project.archived_at,
  };
}

function camelTask(task, projectName, ownerId) {
  return {
    ...task,
    projectId: task.project_id,
    projectName,
    percentComplete: task.percent_complete,
    startDate: task.start_date,
    dueDate: task.due_date,
    createdBy: task.created_by,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    completedAt: task.completed_at,
    archivedAt: task.archived_at,
    ownerId,
    openBlockersCount: 0,
  };
}

const admin = makeUser(0, 'admin', 'System Admin', 'admin', 'Ban dieu hanh', 'Quan tri he thong');
const lead = makeUser(1, 'sep', 'Tran Minh Quan', 'admin', 'Ban dieu hanh', 'Truong nhom');
const member = makeUser(2, 'member', 'Team Member', 'member', 'Phong ky thuat', 'Nhan vien du an');

const demoPeople = [
  ['nv001', 'Nguyen An Binh', 'Phong nghien cuu', 'Nghien cuu vien'],
  ['nv002', 'Tran Minh Chau', 'Phong nghien cuu', 'Tro ly nghien cuu'],
  ['nv003', 'Le Quoc Dung', 'Phong ky thuat', 'Ky su du lieu'],
  ['nv004', 'Pham Thu Ha', 'Phong van hanh', 'Dieu phoi vien'],
  ['nv005', 'Hoang Gia Huy', 'Phong ky thuat', 'Lap trinh vien'],
  ['nv006', 'Do Ngoc Khanh', 'Phong nhan su', 'Chuyen vien nhan su'],
  ['nv007', 'Vu Hai Long', 'Phong tai chinh', 'Ke toan'],
  ['nv008', 'Bui Thanh Mai', 'Phong nghien cuu', 'Thuc tap sinh'],
  ['nv009', 'Dang Tuan Nam', 'Phong van hanh', 'Nhan vien du an'],
  ['nv010', 'Cao My Ngan', 'Phong nghien cuu', 'Nghien cuu vien'],
  ['nv011', 'Mai Duc Phuc', 'Phong ky thuat', 'Quan tri he thong'],
  ['nv012', 'Ngo Lan Phuong', 'Phong truyen thong', 'Chuyen vien noi dung'],
  ['nv013', 'Ly Minh Quan', 'Phong van hanh', 'Giam sat ca'],
  ['nv014', 'Phan Nhat Quynh', 'Phong nghien cuu', 'Thuc tap sinh'],
  ['nv015', 'Ta Hoang Son', 'Phong tai chinh', 'Chuyen vien mua sam'],
  ['nv016', 'Ho Bao Tram', 'Phong nhan su', 'Tuyen dung'],
  ['nv017', 'Duong Anh Tu', 'Phong ky thuat', 'Kiem thu vien'],
  ['nv018', 'La Khanh Vy', 'Phong truyen thong', 'Thiet ke'],
  ['nv019', 'Trieu Dang Khoa', 'Phong van hanh', 'Nhan vien ho tro'],
  ['nv020', 'Dinh Ngoc Yen', 'Phong nghien cuu', 'Thu ky khoa hoc'],
  ['nv021', 'Nguyen Bao Anh', 'Phong ky thuat', 'Lap trinh vien'],
  ['nv022', 'Tran Hoai Bao', 'Phong nghien cuu', 'Nghien cuu vien'],
  ['nv023', 'Le Gia Bao', 'Phong du an', 'Scrum master'],
  ['nv024', 'Pham Khanh Linh', 'Phong nhan su', 'Hanh chinh nhan su'],
  ['nv025', 'Hoang Tien Dat', 'Phong tai chinh', 'Ke toan tong hop'],
  ['nv026', 'Vu Minh Anh', 'Phong truyen thong', 'Bien tap vien'],
  ['nv027', 'Do Quang Hieu', 'Phong ky thuat', 'DevOps'],
  ['nv028', 'Bui Tue Minh', 'Phong nghien cuu', 'Thuc tap sinh'],
  ['nv029', 'Cao Viet Hoang', 'Phong van hanh', 'Nhan vien hien truong'],
  ['nv030', 'Dang Ha My', 'Phong du an', 'Tro ly du an'],
];

const activeMembers = demoPeople.map((person, idx) => makeUser(idx + 3, person[0], person[1], 'member', person[2], person[3]));
const inactiveUser = makeUser(40, 'nv031', 'Nguyen Da Nghi', 'member', 'Phong van hanh', 'Nhan vien tam nghi', 'inactive');
const lockedUser = makeUser(41, 'nv032', 'Tran Bi Khoa', 'member', 'Phong ky thuat', 'Tai khoan khoa', 'locked');
const users = [admin, lead, member, ...activeMembers, inactiveUser, lockedUser];
const activeUsers = users.filter((user) => user.status === 'active');
const schedulableUsers = activeUsers;
const passwordHash = bcrypt.hashSync(PASSWORD, 10);

const user_credentials = users.map((user) => ({
  user_id: user.id,
  password_hash: passwordHash,
  password_changed_at: iso('2026-01-01'),
  failed_login_count: user.status === 'locked' ? 5 : 0,
  last_failed_login_at: user.status === 'locked' ? iso('2026-07-18', 9, 10) : null,
  locked_until: user.status === 'locked' ? iso('2026-07-20', 0, 0) : null,
  created_at: user.created_at,
  updated_at: user.updated_at,
}));

const rawProjects = [
  {
    id: idFor('project', 'operations'),
    name: 'Trung tam dieu hanh AIT',
    description: 'Theo doi tien do, lich lam va van hanh hang ngay cua doi ngu AIT.',
    status: 'active',
    start_date: '2026-05-01',
    due_date: '2026-08-20',
    manager_id: lead.id,
    created_by: admin.id,
    created_at: iso('2026-04-20', 2, 0),
    updated_at: iso('2026-07-18', 4, 30),
    archived_at: null,
  },
  {
    id: idFor('project', 'research'),
    name: 'Nghien cuu mo hinh bao cao',
    description: 'Chuan hoa quy trinh check-in, canh bao cham tien do va tong hop bao cao.',
    status: 'active',
    start_date: '2026-05-15',
    due_date: '2026-09-15',
    manager_id: admin.id,
    created_by: admin.id,
    created_at: iso('2026-05-05', 3, 0),
    updated_at: iso('2026-07-17', 5, 20),
    archived_at: null,
  },
  {
    id: idFor('project', 'mobile'),
    name: 'Ung dung check-in nhanh',
    description: 'Thiet ke trai nghiem check-in cong viec tren mobile va tablet.',
    status: 'active',
    start_date: '2026-06-01',
    due_date: '2026-07-31',
    manager_id: lead.id,
    created_by: admin.id,
    created_at: iso('2026-05-25', 2, 15),
    updated_at: iso('2026-07-18', 7, 45),
    archived_at: null,
  },
  {
    id: idFor('project', 'data-cleanup'),
    name: 'Lam sach du lieu nhan su',
    description: 'Ra soat ho so nhan su, bo sung phong ban, chuc danh va tai khoan dang nhap.',
    status: 'paused',
    start_date: '2026-04-10',
    due_date: '2026-08-10',
    manager_id: admin.id,
    created_by: admin.id,
    created_at: iso('2026-04-01', 4, 0),
    updated_at: iso('2026-07-12', 8, 0),
    archived_at: null,
  },
  {
    id: idFor('project', 'calendar'),
    name: 'Lich lam va cham cong thang',
    description: 'Tich hop lich lam, ngay le Viet Nam va xuat bang cham cong theo thang.',
    status: 'completed',
    start_date: '2026-05-01',
    due_date: '2026-07-15',
    manager_id: lead.id,
    created_by: admin.id,
    created_at: iso('2026-04-15', 1, 50),
    updated_at: iso('2026-07-15', 9, 15),
    archived_at: null,
  },
  {
    id: idFor('project', 'archive'),
    name: 'Du an mau da luu tru',
    description: 'Du lieu mau de kiem tra trang thai archived.',
    status: 'archived',
    start_date: '2026-02-01',
    due_date: '2026-03-30',
    manager_id: admin.id,
    created_by: admin.id,
    created_at: iso('2026-02-01', 1, 0),
    updated_at: iso('2026-04-01', 1, 0),
    archived_at: iso('2026-04-01', 1, 0),
  },
];
const projects = rawProjects.map(camelProject);

const project_members = [];
projects.forEach((project, projectIndex) => {
  const pool = [admin, lead, member, ...activeMembers.slice(projectIndex * 5, projectIndex * 5 + 12)];
  Array.from(new Map(pool.map((user) => [user.id, user])).values()).forEach((user, idx) => {
    project_members.push({
      id: idFor('project-member', project.id, user.id),
      project_id: project.id,
      user_id: user.id,
      project_role: idx === 0 ? 'manager' : idx % 5 === 0 ? 'viewer' : 'member',
      role: idx === 0 ? 'manager' : idx % 5 === 0 ? 'viewer' : 'member',
      joined_at: iso(addDays(project.start_date || '2026-05-01', idx % 8), 2 + (idx % 6), 0),
      removed_at: null,
    });
  });
});

const taskTitles = [
  'Ra soat yeu cau nghiep vu',
  'Thiet ke man hinh danh sach',
  'Hoan thien API phan trang',
  'Kiem tra luong phan quyen',
  'Bo sung xuat Excel',
  'Toi uu giao dien mobile',
  'Viet huong dan su dung',
  'Xu ly du lieu ngay le',
  'Dong bo bao cao dashboard',
  'Kiem thu nghiem thu noi bo',
  'Sua loi check-in qua han',
  'Canh bao cong viec sap den han',
];
const statuses = ['todo', 'in_progress', 'waiting', 'done'];
const priorities = ['high', 'medium', 'low'];
const tasks = [];
const task_members = [];

projects.forEach((project, projectIndex) => {
  if (project.status === 'archived') return;
  const membersForProject = project_members
    .filter((row) => row.project_id === project.id && row.removed_at === null)
    .map((row) => activeUsers.find((user) => user.id === row.user_id))
    .filter(Boolean);

  taskTitles.forEach((baseTitle, taskIndex) => {
    const status = project.status === 'completed' ? (taskIndex < 10 ? 'done' : 'waiting') : statuses[(taskIndex + projectIndex) % statuses.length];
    const percent = status === 'done' ? 100 : status === 'in_progress' ? 35 + ((taskIndex * 7) % 45) : status === 'waiting' ? 55 : 0;
    const dueOffset = [-14, -8, -2, 1, 2, 5, 8, 14, 21, 30, 45, 60][taskIndex % 12] + projectIndex;
    const due = addDays(TODAY, dueOffset);
    const start = addDays(due, -20 - (taskIndex % 5));
    const owner = membersForProject[(taskIndex % Math.max(1, membersForProject.length))] || member;
    const task = {
      id: idFor('task', project.id, taskIndex),
      project_id: project.id,
      title: `${baseTitle} - ${project.name}`,
      description: `Cong viec mau so ${taskIndex + 1} cua ${project.name}.`,
      start_date: start,
      due_date: due,
      priority: priorities[(taskIndex + projectIndex) % priorities.length],
      status,
      percent_complete: percent,
      version: 1 + (taskIndex % 4),
      created_by: admin.id,
      status_changed_at: iso(addDays(TODAY, -1 * ((taskIndex % 10) + 1)), 3, 20),
      completed_at: status === 'done' ? iso(addDays(TODAY, -1 * ((taskIndex % 7) + 1)), 8, 0) : null,
      archived_at: null,
      created_at: iso(addDays(project.start_date || '2026-05-01', taskIndex), 2 + (taskIndex % 5), 0),
      updated_at: iso(addDays(TODAY, -1 * (taskIndex % 6)), 6, 30),
    };
    tasks.push(camelTask(task, project.name, owner.id));

    const collaborators = [owner, membersForProject[(taskIndex + 2) % membersForProject.length], membersForProject[(taskIndex + 4) % membersForProject.length]].filter(Boolean);
    Array.from(new Map(collaborators.map((user) => [user.id, user])).values()).forEach((user, idx) => {
      task_members.push({
        id: idFor('task-member', task.id, user.id),
        task_id: task.id,
        user_id: user.id,
        assignment_role: idx === 0 ? 'owner' : idx === 1 ? 'collaborator' : 'reviewer',
        report_required: idx !== 2,
        assigned_at: iso(addDays(task.start_date, idx), 2 + idx, 0),
        removed_at: null,
      });
    });
  });
});

const taskById = new Map(tasks.map((task) => [task.id, task]));
const userTaskMap = new Map();
task_members.forEach((memberRow) => {
  if (memberRow.removed_at || memberRow.report_required === false) return;
  const task = taskById.get(memberRow.task_id);
  if (!task || task.status === 'done' || task.archived_at) return;
  if (!userTaskMap.has(memberRow.user_id)) userTaskMap.set(memberRow.user_id, []);
  userTaskMap.get(memberRow.user_id).push(task);
});

const daily_checkins = [];
const daily_checkin_items = [];
for (let offset = 0; offset < 18; offset += 1) {
  const date = addDays(TODAY, -offset);
  const weekday = dateFromKey(date).getUTCDay();
  if (weekday === 0 || weekday === 6) continue;

  activeUsers.slice(2, 24).forEach((user, userIndex) => {
    if ((userIndex + offset) % 5 === 0) return;
    const userTasks = userTaskMap.get(user.id) || [];
    const noActivity = userTasks.length === 0 || (userIndex + offset) % 11 === 0;
    const checkinId = idFor('checkin', user.id, date);
    daily_checkins.push({
      id: checkinId,
      user_id: user.id,
      checkin_date: date,
      summary_today: noActivity ? null : `Da xu ly ${Math.min(2, userTasks.length)} dau viec va cap nhat tien do trong ngay.`,
      no_activity: noActivity,
      no_activity_reason: noActivity ? 'Khong co dau viec can bao cao trong ngay.' : null,
      general_difficulties: (userIndex + offset) % 9 === 0 ? 'Can them du lieu mau de doi chieu ket qua.' : null,
      help_needed: (userIndex + offset) % 13 === 0 ? 'Can admin xac nhan uu tien cong viec.' : null,
      plan_tomorrow: noActivity ? 'Theo doi thong bao moi.' : 'Tiep tuc hoan thien phan viec dang lam.',
      total_time_spent_hours: noActivity ? null : 6 + ((userIndex + offset) % 3),
      first_submitted_at: iso(date, (userIndex + offset) % 7 === 0 ? 11 : 9, 15),
      updated_at: iso(date, 10, 0),
      edited_by_admin_at: null,
      admin_edit_reason: null,
    });

    if (!noActivity) {
      userTasks.slice(0, 2).forEach((task, itemIndex) => {
        daily_checkin_items.push({
          id: idFor('checkin-item', checkinId, task.id),
          checkin_id: checkinId,
          task_id: task.id,
          progress_note: `Cap nhat ${itemIndex + 1}: hoan thien mot phan cua "${task.title}".`,
          member_percent_complete: Math.min(95, (task.percent_complete || 0) + 5 + itemIndex * 5),
          proposed_task_percent: Math.min(95, (task.percent_complete || 0) + 8 + itemIndex * 5),
          proposed_task_status: null,
          time_spent_hours: 2 + itemIndex,
          help_needed: itemIndex === 1 && (userIndex + offset) % 10 === 0 ? 'Can review thiet ke.' : null,
          created_at: iso(date, 9 + itemIndex, 30),
          updated_at: iso(date, 10 + itemIndex, 0),
          removed_at: null,
        });
      });
    }
  });
}

const blockerTasks = tasks.filter((task) => task.status !== 'done').slice(0, 12);
const task_blockers = blockerTasks.map((task, index) => {
  const reporterRow = task_members.find((row) => row.task_id === task.id && row.assignment_role === 'owner');
  const open = index % 3 !== 0;
  return {
    id: idFor('blocker', task.id, index),
    task_id: task.id,
    reported_by: reporterRow?.user_id || member.id,
    checkin_item_id: null,
    description: open
      ? 'Dang cho du lieu dau vao tu bo phan lien quan de tiep tuc xu ly.'
      : 'Da giai quyet sau khi cap nhat bo mau kiem thu.',
    status: open ? 'open' : 'resolved',
    created_at: iso(addDays(TODAY, -1 * (index + 2)), 7, 30),
    resolved_at: open ? null : iso(addDays(TODAY, -1), 8, 15),
    resolved_by: open ? null : admin.id,
    resolved_note: open ? null : 'Da xac nhan va dong blocker.',
  };
});

tasks.forEach((task) => {
  task.openBlockersCount = task_blockers.filter((blocker) => blocker.task_id === task.id && blocker.status === 'open').length;
});

const user_absences = [
  {
    id: idFor('absence', activeMembers[3].id, 'today'),
    user_id: activeMembers[3].id,
    start_date: '2026-07-18',
    end_date: '2026-07-20',
    reason: 'Nghi phep ca nhan',
    approved_by: admin.id,
    created_at: iso('2026-07-10', 3, 0),
    updated_at: iso('2026-07-10', 3, 0),
  },
  {
    id: idFor('absence', activeMembers[8].id, 'future'),
    user_id: activeMembers[8].id,
    start_date: '2026-07-22',
    end_date: '2026-07-23',
    reason: 'Cong tac ngoai van phong',
    approved_by: lead.id,
    created_at: iso('2026-07-15', 6, 0),
    updated_at: iso('2026-07-15', 6, 0),
  },
  {
    id: idFor('absence', activeMembers[14].id, 'past'),
    user_id: activeMembers[14].id,
    start_date: '2026-06-12',
    end_date: '2026-06-14',
    reason: 'Nghi om',
    approved_by: admin.id,
    created_at: iso('2026-06-09', 5, 0),
    updated_at: iso('2026-06-09', 5, 0),
  },
];

const holidayRows = [
  ['2026-01-01', 'Tet Duong lich'],
  ['2026-02-16', 'Nghi Tet Nguyen dan'],
  ['2026-02-17', 'Nghi Tet Nguyen dan'],
  ['2026-02-18', 'Nghi Tet Nguyen dan'],
  ['2026-02-19', 'Nghi Tet Nguyen dan'],
  ['2026-02-20', 'Nghi Tet Nguyen dan'],
  ['2026-04-25', 'Nghi dip Gio To Hung Vuong'],
  ['2026-04-26', 'Gio To Hung Vuong'],
  ['2026-04-27', 'Nghi bu Gio To Hung Vuong'],
  ['2026-04-30', 'Ngay Giai phong mien Nam'],
  ['2026-05-01', 'Ngay Quoc te Lao dong'],
  ['2026-05-02', 'Nghi cuoi tuan dip 30/4 - 1/5'],
  ['2026-05-03', 'Nghi cuoi tuan dip 30/4 - 1/5'],
  ['2026-08-31', 'Nghi dip Quoc khanh'],
  ['2026-09-01', 'Nghi dip Quoc khanh'],
  ['2026-09-02', 'Quoc khanh'],
];
const non_working_days = holidayRows.map(([workDate, name]) => ({
  id: idFor('holiday', workDate),
  work_date: workDate,
  name,
  created_by: admin.id,
  created_at: iso('2026-01-01', 1, 0),
}));
const holidaySet = new Set(non_working_days.map((day) => day.work_date));

const shifts = ['full', 'morning', 'afternoon', 'full', 'online', 'overtime'];
const work_schedules = [];
eachDate(SCHEDULE_START, TODAY, (workDate, weekday) => {
  schedulableUsers.forEach((user, index) => {
    let shift = shifts[(index + dateFromKey(workDate).getUTCDate()) % shifts.length];
    if (holidaySet.has(workDate)) {
      shift = index % 7 === 0 ? 'full' : index % 5 === 0 ? 'online' : 'off';
    } else if (weekday === 0) {
      shift = index % 6 === 0 ? 'online' : index % 5 === 0 ? 'morning' : 'off';
    } else if (weekday === 6) {
      shift = index % 5 === 0 ? 'online' : index % 4 === 0 ? 'morning' : 'off';
    }

    work_schedules.push({
      id: idFor('work-schedule', user.id, workDate),
      user_id: user.id,
      work_date: workDate,
      shift,
      custom_start: null,
      custom_end: null,
      updated_by: user.role === 'admin' ? user.id : admin.id,
      created_at: iso(workDate, 1, 0),
      updated_at: iso(workDate, 1, 0),
    });
  });
});

const activity_logs = [
  ...tasks.slice(0, 28).map((task, index) => ({
    id: idFor('activity', 'task', task.id, index),
    actor_id: index % 3 === 0 ? lead.id : admin.id,
    actor_type: 'user',
    entity_type: 'task',
    entity_id: task.id,
    action: index % 2 === 0 ? 'create_task' : 'update_task',
    old_values: null,
    new_values: { title: task.title, status: task.status, percentComplete: task.percent_complete },
    request_id: null,
    created_at: iso(addDays(TODAY, -1 * (index % 12)), 4 + (index % 4), 10),
  })),
  ...daily_checkins.slice(0, 20).map((checkin, index) => ({
    id: idFor('activity', 'checkin', checkin.id, index),
    actor_id: checkin.user_id,
    actor_type: 'user',
    entity_type: 'daily_checkins',
    entity_id: checkin.id,
    action: 'submit_checkin',
    old_values: null,
    new_values: { checkinDate: checkin.checkin_date },
    request_id: null,
    created_at: checkin.first_submitted_at,
  })),
];

const notificationTypes = ['daily_digest', 'missing_checkin', 'due_soon', 'blocker_digest'];
const statusesLog = ['sent', 'sent', 'failed', 'skipped', 'pending'];
const notifications_log = activeUsers.slice(0, 24).map((user, index) => ({
  id: idFor('notification', user.id, index),
  recipient_user_id: user.id,
  notification_date: addDays(TODAY, -1 * (index % 10)),
  notification_type: notificationTypes[index % notificationTypes.length],
  channel: 'email',
  status: statusesLog[index % statusesLog.length],
  dedupe_key: `demo-${user.username}-${index}`,
  provider_message_id: index % 5 === 2 ? null : `msg-demo-${index}`,
  error_code: index % 5 === 2 ? 'SMTP_DEMO' : null,
  error_message: index % 5 === 2 ? 'Loi demo de kiem tra gui lai email.' : null,
  original_notification_id: null,
  created_at: iso(addDays(TODAY, -1 * (index % 10)), 6, index % 50),
  sent_at: index % 5 === 2 || index % 5 === 4 ? null : iso(addDays(TODAY, -1 * (index % 10)), 6, 30),
}));

const state = {
  demoSeedVersion: SEED_VERSION,
  seededAt: new Date().toISOString(),
  testPassword: PASSWORD,
  users,
  user_credentials,
  auth_sessions: [],
  auth_login_attempts: [],
  external_identities: [],
  projects,
  project_members,
  tasks,
  task_members,
  daily_checkins,
  daily_checkin_items,
  task_blockers,
  user_absences,
  non_working_days,
  work_schedules,
  activity_logs,
  notifications_log,
  app_settings: [
    { key: 'business_timezone', value: 'Asia/Ho_Chi_Minh', description: 'Mui gio nghiep vu', updated_at: iso(TODAY) },
    { key: 'daily_checkin_deadline', value: '17:00', description: 'Han nop check-in hang ngay', updated_at: iso(TODAY) },
  ],
};

if (fs.existsSync(DB_FILE)) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.copyFileSync(DB_FILE, path.join(ROOT, `db_state.backup-${stamp}.json`));
}

fs.writeFileSync(DB_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  ok: true,
  seedVersion: SEED_VERSION,
  users: users.length,
  activeUsers: activeUsers.length,
  projects: projects.length,
  activeProjects: projects.filter((project) => project.status === 'active').length,
  tasks: tasks.length,
  checkins: daily_checkins.length,
  checkinItems: daily_checkin_items.length,
  blockers: task_blockers.length,
  absences: user_absences.length,
  holidays: non_working_days.length,
  workSchedules: work_schedules.length,
  notifications: notifications_log.length,
  password: PASSWORD,
}, null, 2));
