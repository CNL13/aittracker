/* eslint-disable */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Define DB mock types
interface UserRecord {
  id: string;
  username: string;
  normalized_username: string;
  full_name: string;
  email: string | null;
  role: 'admin' | 'member';
  status: 'active' | 'locked' | 'inactive';
  must_change_password: boolean;
  avatar_url: string | null;
  department: string | null;
  position: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deactivated_at: Date | null;
}

interface CredentialRecord {
  user_id: string;
  password_hash: string;
  password_changed_at: Date;
  failed_login_count: number;
  last_failed_login_at: Date | null;
  locked_until: Date | null;
}

interface SessionRecord {
  id: string;
  token_hash: string;
  user_id: string;
  created_at: Date;
  last_seen_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip_hash: string | null;
}

interface ActivityLogRecord {
  id: string;
  actor_id: string | null;
  actor_type: 'user' | 'system';
  entity_type: string;
  entity_id: string;
  action: string;
  old_values: any;
  new_values: any;
  created_at: Date;
}

interface NotificationLogRecord {
  id: string;
  recipient_user_id: string;
  notification_date: string;
  notification_type: string;
  channel: string;
  status: string;
  dedupe_key: string;
  error_message: string | null;
  created_at: Date;
}

// Initialize tables on globalThis to ensure single references across hoisted mocks
declare global {
  var mockUsersTable: UserRecord[];
  var mockCredentialsTable: CredentialRecord[];
  var mockSessionsTable: SessionRecord[];
  var mockActivityLogsTable: ActivityLogRecord[];
  var mockNotificationsTable: NotificationLogRecord[];
  var mockProjectsTable: any[];
  var mockProjectMembersTable: any[];
  var mockTasksTable: any[];
  var mockTaskMembersTable: any[];
}

globalThis.mockUsersTable = globalThis.mockUsersTable || [];
globalThis.mockCredentialsTable = globalThis.mockCredentialsTable || [];
globalThis.mockSessionsTable = globalThis.mockSessionsTable || [];
globalThis.mockActivityLogsTable = globalThis.mockActivityLogsTable || [];
globalThis.mockNotificationsTable = globalThis.mockNotificationsTable || [];
globalThis.mockProjectsTable = globalThis.mockProjectsTable || [];
globalThis.mockProjectMembersTable = globalThis.mockProjectMembersTable || [];
globalThis.mockTasksTable = globalThis.mockTasksTable || [];
globalThis.mockTaskMembersTable = globalThis.mockTaskMembersTable || [];

const mockUsersTable = globalThis.mockUsersTable;
const mockCredentialsTable = globalThis.mockCredentialsTable;
const mockSessionsTable = globalThis.mockSessionsTable;
const mockActivityLogsTable = globalThis.mockActivityLogsTable;
const mockNotificationsTable = globalThis.mockNotificationsTable;
const mockProjectsTable = globalThis.mockProjectsTable;
const mockProjectMembersTable = globalThis.mockProjectMembersTable;
const mockTasksTable = globalThis.mockTasksTable;
const mockTaskMembersTable = globalThis.mockTaskMembersTable;

// Hoist mock definition
vi.mock('../../api/_shared/db.js', () => {
  const mockSql = vi.fn() as any;
  mockSql.begin = vi.fn(async (cb: any) => {
    return cb(mockSql);
  });

  mockSql.mockImplementation((strings: TemplateStringsArray, ...rawValues: any[]) => {
    const sqlText = strings.join('?').trim();
    const normalizedSqlRaw = sqlText.replace(/\s+/g, ' ');

    function resolveQuerySync(sqlStr: string, params: any[]): { query: string; values: any[] } {
      const parts = sqlStr.split('?');
      let resultSql = parts[0];
      const finalValues: any[] = [];
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        if (param && param.isFragment) {
          const sub = resolveQuerySync(param.sqlText, param.values);
          resultSql += sub.query + parts[i + 1];
          finalValues.push(...sub.values);
        } else {
          resultSql += '?' + parts[i + 1];
          finalValues.push(param);
        }
      }
      return { query: resultSql, values: finalValues };
    }

    const queryObj = {
      isFragment: true,
      sqlText: normalizedSqlRaw,
      values: rawValues,
      then(resolve: any, reject: any) {
        const { query: fullSql, values } = resolveQuerySync(normalizedSqlRaw, rawValues);
        const normalizedSql = fullSql.replace(/\s+/g, ' ');

        async function executeFinalQuery() {
          console.log('SQL QUERY:', normalizedSql);
          console.log('SQL VALUES:', values);
          const users = globalThis.mockUsersTable;
                      const sessions = globalThis.mockSessionsTable;
                      const activityLogs = globalThis.mockActivityLogsTable;
                      const notifications = globalThis.mockNotificationsTable;
                      const projects = globalThis.mockProjectsTable;
                      const projectMembers = globalThis.mockProjectMembersTable;
                      const tasks = globalThis.mockTasksTable;
                      const taskMembers = globalThis.mockTaskMembersTable;

                      // 1. getSession query
                      if (normalizedSql.includes('FROM auth_sessions s') && normalizedSql.includes('JOIN users u')) {
                        const tokenHash = values[0];
                        const session = sessions.find((s) => s.token_hash === tokenHash);
                        if (!session) return [];

                        const user = users.find((u) => u.id === session.user_id);
                        if (!user) return [];

                        return [
                          {
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
                            must_change_password: user.must_change_password,
                          },
                        ];
                      }

                      // 2. update auth_sessions last_seen_at
                      if (normalizedSql.includes('UPDATE auth_sessions') && normalizedSql.includes('last_seen_at =')) {
                        const lastSeen = values[0];
                        const sessionId = values[1];
                        const session = sessions.find((s) => s.id === sessionId);
                        if (session) {
                          session.last_seen_at = lastSeen;
                        }
                        return [];
                      }

                      // 3. SELECT status FROM users WHERE id =
                      if (normalizedSql.includes('SELECT status FROM users WHERE id =') && !normalizedSql.includes('role =')) {
                        const id = values[0];
                        const u = users.find((x) => x.id === id);
                        return u ? [{ status: u.status }] : [];
                      }

                      // 4. SELECT id FROM users WHERE id =
                      if (normalizedSql.includes('SELECT id, status FROM users WHERE id =')) {
                        const ids = Array.isArray(values[0]) ? values[0] : [values[0]];
                        return users
                          .filter((x) => ids.includes(x.id))
                          .map((u) => ({ id: u.id, status: u.status }));
                      }

                      if (normalizedSql.includes('SELECT id, username, full_name, email FROM users WHERE role =')) {
                        return users
                          .filter((u) => u.role === 'admin' && u.status === 'active')
                          .map((u) => ({ id: u.id, username: u.username, full_name: u.full_name, email: u.email }));
                      }

                      // 5. INSERT INTO projects
                      if (normalizedSql.includes('INSERT INTO projects')) {
                        const name = values[0];
                        const description = values[1];
                        const status = values[2];
                        const startDate = values[3];
                        const dueDate = values[4];
                        const managerId = values[5];
                        const createdBy = values[6];

                        const newProj = {
                          id: globalThis.crypto.randomUUID(),
                          name,
                          description,
                          status,
                          start_date: startDate,
                          due_date: dueDate,
                          manager_id: managerId,
                          created_by: createdBy,
                          created_at: new Date(),
                          updated_at: new Date(),
                          archived_at: null,
                        };
                        projects.push(newProj);
                        return [{ id: newProj.id }];
                      }

                      // 6. INSERT INTO project_members
                      if (normalizedSql.includes('INSERT INTO project_members')) {
                        const pId = values[0];
                        const uId = values[1];
                        let role = values[2];
                        if (!role) {
                          if (normalizedSql.includes("'manager'")) {
                            role = 'manager';
                          } else if (normalizedSql.includes("'viewer'")) {
                            role = 'viewer';
                          } else {
                            role = 'member';
                          }
                        }

                        const newMember = {
                          id: globalThis.crypto.randomUUID(),
                          project_id: pId,
                          user_id: uId,
                          project_role: role,
                          joined_at: new Date(),
                          removed_at: null,
                        };
                        projectMembers.push(newMember);
                        return [{ id: newMember.id }];
                      }

                      // 7. INSERT INTO activity_logs
                      if (normalizedSql.includes('INSERT INTO activity_logs')) {
                        const actor_id = values[0];
                        const hasParameterizedMeta = values[1] === 'user' || values[1] === 'system';
                        const actor_type = hasParameterizedMeta ? values[1] : 'user';
                        const entity_type = hasParameterizedMeta ? values[2] : 'project';
                        const entity_id = hasParameterizedMeta ? values[3] : values[1];
                        let action = hasParameterizedMeta ? values[4] : undefined;
                        if (!action) {
                          if (normalizedSql.includes("'create_project'")) {
                            action = 'create_project';
                          } else if (normalizedSql.includes("'update_project'")) {
                            action = 'update_project';
                          } else if (normalizedSql.includes("'add_project_member'")) {
                            action = 'add_project_member';
                          } else if (normalizedSql.includes("'remove_project_member'")) {
                            action = 'remove_project_member';
                          }
                        }
                        const old_values = hasParameterizedMeta ? values[5] : values[2];
                        const new_values = hasParameterizedMeta ? values[6] : values[3];

                        activityLogs.push({
                          id: globalThis.crypto.randomUUID(),
                          actor_id,
                          actor_type,
                          entity_type,
                          entity_id,
                          action,
                          old_values: typeof old_values === 'string' ? JSON.parse(old_values) : old_values,
                          new_values: typeof new_values === 'string' ? JSON.parse(new_values) : new_values,
                          created_at: new Date(),
                        });
                        return [];
                      }

                      if (normalizedSql.includes('INSERT INTO notifications_log')) {
                        let newNotification: any;
                        if (values.length === 5) {
                          newNotification = {
                            id: globalThis.crypto.randomUUID(),
                            recipient_user_id: values[0],
                            notification_type: values[1],
                            dedupe_key: values[2],
                            status: values[3],
                            original_notification_id: values[4],
                            channel: 'email',
                            notification_date: new Date().toISOString().split('T')[0],
                            error_message: null,
                            created_at: new Date(),
                          };
                        } else {
                          newNotification = {
                            id: globalThis.crypto.randomUUID(),
                            recipient_user_id: values[0],
                            notification_date: values[1],
                            notification_type: values[2],
                            channel: values[3],
                            status: values[4],
                            dedupe_key: values[5],
                            error_message: values[6] || null,
                            created_at: new Date(),
                          };
                        }
                        notifications.push(newNotification);
                        return [{ id: newNotification.id }];
                      }

                      // 8. SELECT id, name... FROM projects WHERE id =
                      if (normalizedSql.includes('SELECT id, name, description, status') && normalizedSql.includes('FROM projects') && normalizedSql.includes('WHERE id =')) {
                        const id = values[0];
                        const p = projects.find((x) => x.id === id);
                        if (!p) return [];
                        return [{
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          status: p.status,
                          startDate: p.start_date,
                          dueDate: p.due_date,
                          managerId: p.manager_id,
                          createdBy: p.created_by,
                          createdAt: p.created_at,
                          updatedAt: p.updated_at,
                          archivedAt: p.archived_at,
                        }];
                      }

                      // 9. SELECT id FROM projects WHERE id =
                      if (normalizedSql.includes('SELECT id FROM projects WHERE id =')) {
                        const id = values[0];
                        const p = projects.find((x) => x.id === id);
                        return p ? [{ id: p.id }] : [];
                      }

                      // 10. SELECT FROM project_members (membership verification)
                      if (normalizedSql.includes('FROM project_members') && normalizedSql.includes('removed_at IS NULL') && !normalizedSql.includes('JOIN users u')) {
                        const pId = values[0];
                        const uId = values[1];
                        const pm = projectMembers.find((x) => x.project_id === pId && x.user_id === uId && x.removed_at === null);
                        return pm ? [{ id: pm.id, project_role: pm.project_role }] : [];
                      }

                      // 11. SELECT COUNT(*)::int as count FROM tasks WHERE project_id = ... active tasks check
                      if (normalizedSql.includes('SELECT COUNT(*)::int as count FROM tasks') && normalizedSql.includes("status != 'done'")) {
                        const pId = values[0];
                        const count = tasks.filter((t) => t.project_id === pId && t.status !== 'done' && t.archived_at === null).length;
                        return [{ count }];
                      }

                      // 12. UPDATE projects
                      if (normalizedSql.includes('UPDATE projects') && normalizedSql.includes('SET name =')) {
                        const name = values[0];
                        const description = values[1];
                        const status = values[2];
                        const startDate = values[3];
                        const dueDate = values[4];
                        const managerId = values[5];
                        const projectId = values[7];

                        const p = projects.find((x) => x.id === projectId);
                        if (p) {
                          p.name = name;
                          p.description = description;
                          p.status = status;
                          p.start_date = startDate;
                          p.due_date = dueDate;
                          p.manager_id = managerId;
                          if (status === 'archived') {
                            p.archived_at = p.archived_at || new Date();
                          } else {
                            p.archived_at = null;
                          }
                          p.updated_at = new Date();
                        }
                        return [];
                      }

                      // 13. UPDATE project_members (reactivate)
                      if (normalizedSql.includes('UPDATE project_members') && normalizedSql.includes('removed_at = NULL')) {
                        const role = values[0];
                        const id = values[1];
                        const pm = projectMembers.find((x) => x.id === id);
                        if (pm) {
                          pm.project_role = role;
                          pm.removed_at = null;
                          pm.joined_at = new Date();
                        }
                        return [];
                      }

                      // 14. SELECT COUNT(*)::int as count FROM projects p (list count)
                      if (normalizedSql.includes('SELECT COUNT(*)::int as count FROM projects p')) {
                        let list = [...projects];
                        const search = values.find(v => typeof v === 'string' && v.startsWith('%') && v.endsWith('%'));
                        const status = values.find(v => ['planning', 'active', 'paused', 'completed', 'archived', 'rejected'].includes(v));

                        if (normalizedSql.includes('JOIN project_members pm')) {
                          const uId = values[0];
                          list = list.filter((p) => {
                            const isMem = projectMembers.some((pm) => pm.project_id === p.id && pm.user_id === uId && pm.removed_at === null);
                            if (!isMem) return false;
                            if (search) {
                              const term = search.replace(/%/g, '').toLowerCase();
                              if (!p.name.toLowerCase().includes(term) && !(p.description && p.description.toLowerCase().includes(term))) {
                                return false;
                              }
                            }
                            if (status && p.status !== status) return false;
                            return true;
                          });
                        } else {
                          list = list.filter((p) => {
                            if (search) {
                              const term = search.replace(/%/g, '').toLowerCase();
                              if (!p.name.toLowerCase().includes(term) && !(p.description && p.description.toLowerCase().includes(term))) {
                                return false;
                              }
                            }
                            if (status && p.status !== status) return false;
                            return true;
                          });
                        }
                        return [{ count: list.length }];
                      }

                      // 15. SELECT p.id, p.name ... FROM projects p (list query)
                      if (normalizedSql.includes('FROM projects p') && normalizedSql.includes('ORDER BY p.created_at')) {
                        let list = [...projects];
                        const search = values.find(v => typeof v === 'string' && v.startsWith('%') && v.endsWith('%'));
                        const status = values.find(v => ['planning', 'active', 'paused', 'completed', 'archived', 'rejected'].includes(v));

                        if (normalizedSql.includes('JOIN project_members pm')) {
                          const uId = values[0];
                          list = list.filter((p) => {
                            const isMem = projectMembers.some((pm) => pm.project_id === p.id && pm.user_id === uId && pm.removed_at === null);
                            if (!isMem) return false;
                            if (search) {
                              const term = search.replace(/%/g, '').toLowerCase();
                              if (!p.name.toLowerCase().includes(term) && !(p.description && p.description.toLowerCase().includes(term))) {
                                return false;
                              }
                            }
                            if (status && p.status !== status) return false;
                            return true;
                          });
                        } else {
                          list = list.filter((p) => {
                            if (search) {
                              const term = search.replace(/%/g, '').toLowerCase();
                              if (!p.name.toLowerCase().includes(term) && !(p.description && p.description.toLowerCase().includes(term))) {
                                return false;
                              }
                            }
                            if (status && p.status !== status) return false;
                            return true;
                          });
                        }
                        // sort desc by created_at
                        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        // slice offset/limit
                        const limit = values[values.length - 2];
                        const offset = values[values.length - 1];
                        return list.slice(offset, offset + limit).map((p) => ({
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          status: p.status,
                          startDate: p.start_date,
                          dueDate: p.due_date,
                          managerId: p.manager_id,
                          createdBy: p.created_by,
                          createdAt: p.created_at,
                          updatedAt: p.updated_at,
                          archivedAt: p.archived_at,
                        }));
                      }

                      // 16. SELECT pm.id, pm.user_id ... FROM project_members pm JOIN users u (detail query)
                      if (normalizedSql.includes('FROM project_members pm') && normalizedSql.includes('JOIN users u')) {
                        const pId = values[0];
                        const activeMembers = projectMembers
                          .filter((pm) => pm.project_id === pId && pm.removed_at === null)
                          .map((pm) => {
                            const u = users.find((x) => x.id === pm.user_id);
                            return {
                              id: pm.id,
                              userId: pm.user_id,
                              username: u?.username,
                              fullName: u?.full_name,
                              email: u?.email,
                              projectRole: pm.project_role,
                              joinedAt: pm.joined_at,
                            };
                          });
                        return activeMembers;
                      }

                      // 17. SELECT COUNT(*)::int as count FROM tasks WHERE project_id = ? (statistics)
                      if (normalizedSql.includes('SELECT COUNT(*)::int as count FROM tasks') && normalizedSql.includes('WHERE project_id =')) {
                        const pId = values[0];
                        if (normalizedSql.includes("status = 'done'")) {
                          const count = tasks.filter((t) => t.project_id === pId && t.status === 'done' && t.archived_at === null).length;
                          return [{ count }];
                        } else if (normalizedSql.includes("status != 'done'")) {
                          // overdue tasks
                          const now = new Date();
                          const count = tasks.filter((t) => t.project_id === pId && t.status !== 'done' && t.archived_at === null && t.due_date && new Date(t.due_date) < now).length;
                          return [{ count }];
                        } else {
                          // total tasks
                          const count = tasks.filter((t) => t.project_id === pId && t.archived_at === null).length;
                          return [{ count }];
                        }
                      }

                      // 18. SELECT id, removed_at FROM project_members WHERE project_id = ? AND user_id = ? (check duplicate)
                      if (normalizedSql.includes('SELECT id, removed_at FROM project_members WHERE project_id =') && normalizedSql.includes('user_id =')) {
                        const pId = values[0];
                        const uId = values[1];
                        const pms = projectMembers.filter((pm) => pm.project_id === pId && pm.user_id === uId);
                        return pms;
                      }

                      // 19. SELECT COUNT(*)::int as count FROM task_members tm JOIN tasks t (check block removal)
                      if (normalizedSql.includes('SELECT COUNT(*)::int as count FROM task_members tm') && normalizedSql.includes('JOIN tasks t')) {
                        const pId = values[0];
                        const uId = values[1];
                        const count = taskMembers.filter((tm) => {
                          if (tm.user_id !== uId || tm.removed_at !== null) return false;
                          const t = tasks.find((tk) => tk.id === tm.task_id);
                          return t && t.project_id === pId && t.status !== 'done' && t.archived_at === null;
                        }).length;
                        return [{ count }];
                      }

                      // 20. UPDATE project_members (remove member)
                      if (normalizedSql.includes('UPDATE project_members') && normalizedSql.includes('removed_at = CURRENT_TIMESTAMP')) {
                        const pmId = values[0];
                        const pm = projectMembers.find((x) => x.id === pmId);
                        if (pm) {
                          pm.removed_at = new Date();
                        }
                        return [];
                      }

                      return [];


          return [];
        }

        executeFinalQuery().then(resolve, reject);
      }
    };

    return queryObj;
  });

  return {
    sql: mockSql,
  };
});

// Import handlers
import createHandler from '../../api/projects/create.js';
import listHandler from '../../api/projects/list.js';
import updateHandler from '../../api/projects/update.js';
import detailHandler from '../../api/projects/detail.js';
import addMemberHandler from '../../api/projects/members/add.js';
import removeMemberHandler from '../../api/projects/members/remove.js';

function mockRequest(options: {
  method?: string;
  body?: any;
  query?: any;
  headers?: Record<string, string>;
}) {
  return {
    method: options.method || 'GET',
    body: options.body || {},
    query: options.query || {},
    headers: options.headers || {},
  } as unknown as VercelRequest;
}

function mockResponse() {
  const res: any = {};
  res.headers = {} as Record<string, string>;
  res.statusCode = 200;
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((data: any) => {
    res.body = data;
    return res;
  });
  res.setHeader = vi.fn((name: string, value: string) => {
    res.headers[name.toLowerCase()] = value;
    return res;
  });
  return res as unknown as VercelResponse & {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };
}

describe('Project Lifecycle & Membership Integration Tests', () => {
  const adminId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const inactiveMemberId = crypto.randomUUID();
  const anotherMemberId = crypto.randomUUID();
  const project1Id = crypto.randomUUID();
  const project2Id = crypto.randomUUID();
  const task1Id = crypto.randomUUID();
  const task2Id = crypto.randomUUID();

  const adminToken = 'admin_token';
  const adminTokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');

  const memberToken = 'member_token';
  const memberTokenHash = crypto.createHash('sha256').update(memberToken).digest('hex');

  const anotherMemberToken = 'another_member_token';
  const anotherMemberTokenHash = crypto.createHash('sha256').update(anotherMemberToken).digest('hex');

  beforeEach(() => {
    mockUsersTable.length = 0;
    mockSessionsTable.length = 0;
    mockActivityLogsTable.length = 0;
    mockNotificationsTable.length = 0;
    mockProjectsTable.length = 0;
    mockProjectMembersTable.length = 0;
    mockTasksTable.length = 0;
    mockTaskMembersTable.length = 0;
    vi.clearAllMocks();

    // Seed default users
    mockUsersTable.push(
      {
        id: adminId,
        username: 'AdminUser',
        normalized_username: 'adminuser',
        full_name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        must_change_password: false,
        avatar_url: null,
        department: null,
        position: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deactivated_at: null,
      },
      {
        id: memberId,
        username: 'MemberUser',
        normalized_username: 'memberuser',
        full_name: 'Member User',
        email: 'member@example.com',
        role: 'member',
        status: 'active',
        must_change_password: false,
        avatar_url: null,
        department: null,
        position: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deactivated_at: null,
      },
      {
        id: inactiveMemberId,
        username: 'InactiveUser',
        normalized_username: 'inactiveuser',
        full_name: 'Inactive User',
        email: 'inactive@example.com',
        role: 'member',
        status: 'inactive',
        must_change_password: false,
        avatar_url: null,
        department: null,
        position: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deactivated_at: new Date(),
      },
      {
        id: anotherMemberId,
        username: 'AnotherUser',
        normalized_username: 'anotheruser',
        full_name: 'Another User',
        email: 'another@example.com',
        role: 'member',
        status: 'active',
        must_change_password: false,
        avatar_url: null,
        department: null,
        position: null,
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deactivated_at: null,
      }
    );

    // Seed sessions
    mockSessionsTable.push(
      {
        id: crypto.randomUUID(),
        token_hash: adminTokenHash,
        user_id: adminId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        revoked_at: null,
        user_agent: 'test',
        ip_hash: '123',
      },
      {
        id: crypto.randomUUID(),
        token_hash: memberTokenHash,
        user_id: memberId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        revoked_at: null,
        user_agent: 'test',
        ip_hash: '123',
      },
      {
        id: crypto.randomUUID(),
        token_hash: anotherMemberTokenHash,
        user_id: anotherMemberId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000),
        revoked_at: null,
        user_agent: 'test',
        ip_hash: '123',
      }
    );
  });

  describe('POST /api/projects/create', () => {
    it('should allow admin to create a project, generate manager member and log activity', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          name: 'Project Alpha',
          description: 'A test project description',
          startDate: '2026-01-01',
          dueDate: '2026-12-31',
          managerId: memberId,
        },
      });
      const res = mockResponse();

      await createHandler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.project).toBeDefined();
      expect(res.body.project.name).toBe('Project Alpha');
      expect(res.body.project.managerId).toBe(memberId);

      // Verify creator and manager memberships were created
      expect(mockProjectMembersTable).toHaveLength(2);
      expect(mockProjectMembersTable).toEqual(expect.arrayContaining([
        expect.objectContaining({ user_id: adminId, project_role: 'member' }),
        expect.objectContaining({ user_id: memberId, project_role: 'manager' }),
      ]));

      // Verify audit log
      expect(mockActivityLogsTable).toHaveLength(1);
      expect(mockActivityLogsTable[0].action).toBe('create_project');
      expect(mockActivityLogsTable[0].new_values.name).toBe('Project Alpha');
      expect(mockNotificationsTable).toHaveLength(0);
    });

    it('should allow member to request a project and notify admin for approval', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${memberToken}` },
        body: {
          name: 'Project Member Proposal',
          startDate: '2026-07-19',
          dueDate: '2026-08-19',
          memberIds: [anotherMemberId],
        },
      });
      const res = mockResponse();

      await createHandler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.project.name).toBe('Project Member Proposal');
      expect(res.body.project.status).toBe('planning');
      expect(res.body.project.createdBy).toBe(memberId);
      expect(mockProjectMembersTable).toEqual(expect.arrayContaining([
        expect.objectContaining({ user_id: memberId, project_role: 'member' }),
        expect.objectContaining({ user_id: anotherMemberId, project_role: 'member' }),
      ]));
      expect(mockActivityLogsTable).toHaveLength(1);
      expect(mockActivityLogsTable[0].action).toBe('request_project_approval');
      expect(mockActivityLogsTable[0].new_values.approvalStatus).toBe('pending_admin_approval');
      expect(mockNotificationsTable).toHaveLength(1);
      expect(mockNotificationsTable[0]).toEqual(expect.objectContaining({
        recipient_user_id: adminId,
        notification_type: 'project_approval_request',
        channel: 'email',
        status: 'pending',
      }));
    });

    it('should fail validation if dueDate < startDate', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          name: 'Invalid Date Project',
          startDate: '2026-12-31',
          dueDate: '2026-01-01',
        },
      });
      const res = mockResponse();

      await createHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.details.dueDate).toBeDefined();
    });

    it('should fail creation if managerId is not active', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          name: 'Inactive Manager Project',
          managerId: inactiveMemberId,
        },
      });
      const res = mockResponse();

      await createHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Người quản lý dự án phải là người dùng đang hoạt động');
    });
  });

  describe('GET /api/projects/list', () => {
    beforeEach(() => {
      // Seed some projects
      mockProjectsTable.push(
        {
          id: project1Id,
          name: 'Alpha Project',
          description: 'Desc for Alpha',
          status: 'active',
          start_date: '2026-01-01',
          due_date: '2026-06-30',
          manager_id: memberId,
          created_by: adminId,
          created_at: new Date(Date.now() - 2000),
          updated_at: new Date(Date.now() - 2000),
          archived_at: null,
        },
        {
          id: project2Id,
          name: 'Beta Project',
          description: 'Desc for Beta',
          status: 'planning',
          start_date: '2026-07-01',
          due_date: '2026-12-31',
          manager_id: anotherMemberId,
          created_by: adminId,
          created_at: new Date(Date.now() - 1000),
          updated_at: new Date(Date.now() - 1000),
          archived_at: null,
        }
      );

      // Seed project members (MemberUser is in project-1, AnotherUser is in project-2)
      mockProjectMembersTable.push(
        {
          id: crypto.randomUUID(),
          project_id: project1Id,
          user_id: memberId,
          project_role: 'manager',
          joined_at: new Date(),
          removed_at: null,
        },
        {
          id: crypto.randomUUID(),
          project_id: project2Id,
          user_id: anotherMemberId,
          project_role: 'manager',
          joined_at: new Date(),
          removed_at: null,
        }
      );
    });

    it('should list all projects for admin', async () => {
      const req = mockRequest({
        method: 'GET',
        headers: { cookie: `session_token=${adminToken}` },
      });
      const res = mockResponse();

      await listHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should list only member joined projects for members', async () => {
      const req = mockRequest({
        method: 'GET',
        headers: { cookie: `session_token=${memberToken}` },
      });
      const res = mockResponse();

      await listHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].id).toBe(project1Id);
      expect(res.body.total).toBe(1);
    });

    it('should filter by search terms and status', async () => {
      const req = mockRequest({
        method: 'GET',
        headers: { cookie: `session_token=${adminToken}` },
        query: { search: 'Beta', status: 'planning' },
      });
      const res = mockResponse();

      await listHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toHaveLength(1);
      expect(res.body.projects[0].name).toBe('Beta Project');
    });
  });

  describe('POST /api/projects/update', () => {
    beforeEach(() => {
      mockProjectsTable.push({
        id: project1Id,
        name: 'Alpha Project',
        description: 'Desc for Alpha',
        status: 'active',
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        manager_id: memberId,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        archived_at: null,
      });
    });

    it('should allow admin to update details and log activity', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        query: { projectId: project1Id },
        body: {
          name: 'Updated Alpha Name',
          description: 'Updated Description',
          status: 'paused',
          startDate: '2026-01-02',
          dueDate: '2026-06-29',
          managerId: anotherMemberId,
        },
      });
      const res = mockResponse();

      await updateHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.project.name).toBe('Updated Alpha Name');
      expect(res.body.project.status).toBe('paused');

      // Check log
      expect(mockActivityLogsTable).toHaveLength(1);
      expect(mockActivityLogsTable[0].action).toBe('update_project');
      expect(mockActivityLogsTable[0].old_values.name).toBe('Alpha Project');
      expect(mockActivityLogsTable[0].new_values.name).toBe('Updated Alpha Name');
    });

    it('should block completed status update if active tasks exist', async () => {
      // Seed active task in project-1-uuid
      mockTasksTable.push({
        id: task1Id,
        project_id: project1Id,
        title: 'Active Task',
        status: 'todo', // active
        archived_at: null,
      });

      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        query: { projectId: project1Id },
        body: {
          name: 'Alpha Project',
          status: 'completed', // completed request
        },
      });
      const res = mockResponse();

      await updateHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Không thể hoàn thành dự án khi vẫn còn các công việc chưa hoàn thành');
    });
  });

  describe('GET /api/projects/detail', () => {
    beforeEach(() => {
      mockProjectsTable.push({
        id: project1Id,
        name: 'Alpha Project',
        description: 'Desc for Alpha',
        status: 'active',
        start_date: '2026-01-01',
        due_date: '2026-06-30',
        manager_id: memberId,
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
        archived_at: null,
      });

      mockProjectMembersTable.push({
        id: 'member-record-1',
        project_id: project1Id,
        user_id: memberId,
        project_role: 'manager',
        joined_at: new Date(),
        removed_at: null,
      });

      mockTasksTable.push(
        {
          id: task1Id,
          project_id: project1Id,
          title: 'Done Task',
          status: 'done',
          archived_at: null,
        },
        {
          id: task2Id,
          project_id: project1Id,
          title: 'Overdue Task',
          status: 'in_progress',
          due_date: '2025-01-01', // in past
          archived_at: null,
        }
      );
    });

    it('should return project detail metadata, current members list and task metrics', async () => {
      const req = mockRequest({
        method: 'GET',
        headers: { cookie: `session_token=${adminToken}` },
        query: { projectId: project1Id },
      });
      const res = mockResponse();

      await detailHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.project.name).toBe('Alpha Project');
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].userId).toBe(memberId);
      expect(res.body.taskMetrics.totalTasks).toBe(2);
      expect(res.body.taskMetrics.doneTasks).toBe(1);
      expect(res.body.taskMetrics.overdueTasks).toBe(1);
    });

    it('should prevent non-joined members from viewing details', async () => {
      const req = mockRequest({
        method: 'GET',
        headers: { cookie: `session_token=${anotherMemberToken}` }, // another member is not in project-1
        query: { projectId: project1Id },
      });
      const res = mockResponse();

      await detailHandler(req, res);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /api/projects/members/add', () => {
    beforeEach(() => {
      mockProjectsTable.push({
        id: project1Id,
        name: 'Alpha Project',
        status: 'active',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('should allow admin to add an active member and block duplicate active members', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          projectId: project1Id,
          userId: memberId,
          projectRole: 'member',
        },
      });
      const res = mockResponse();

      await addMemberHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockProjectMembersTable).toHaveLength(1);

      // Try adding duplicate
      const reqDup = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          projectId: project1Id,
          userId: memberId,
          projectRole: 'viewer',
        },
      });
      const resDup = mockResponse();

      await addMemberHandler(reqDup, resDup);

      expect(resDup.statusCode).toBe(400);
      expect(resDup.body.error).toContain('Thành viên đã hoạt động trong dự án này');
    });

    it('should reactivate a previously removed member', async () => {
      // Seed a removed member
      mockProjectMembersTable.push({
        id: 'member-record-1',
        project_id: project1Id,
        user_id: memberId,
        project_role: 'member',
        joined_at: new Date(Date.now() - 10000),
        removed_at: new Date(), // removed
      });

      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          projectId: project1Id,
          userId: memberId,
          projectRole: 'viewer',
        },
      });
      const res = mockResponse();

      await addMemberHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockProjectMembersTable[0].removed_at).toBeNull();
      expect(mockProjectMembersTable[0].project_role).toBe('viewer');
    });

    it('should block adding an inactive user', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          projectId: project1Id,
          userId: inactiveMemberId,
          projectRole: 'member',
        },
      });
      const res = mockResponse();

      await addMemberHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Chỉ có thể thêm người dùng đang hoạt động');
    });
  });

  describe('POST /api/projects/members/remove', () => {
    beforeEach(() => {
      mockProjectsTable.push({
        id: project1Id,
        name: 'Alpha Project',
        status: 'active',
        created_by: adminId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockProjectMembersTable.push({
        id: 'pm-record-1',
        project_id: project1Id,
        user_id: memberId,
        project_role: 'member',
        joined_at: new Date(),
        removed_at: null,
      });
    });

    it('should allow admin to remove a member by setting removed_at', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          projectId: project1Id,
          userId: memberId,
        },
      });
      const res = mockResponse();

      await removeMemberHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockProjectMembersTable[0].removed_at).not.toBeNull();
    });

    it('should block removal of a member who has active task assignments in the project', async () => {
      // Seed active task in project-1-uuid
      mockTasksTable.push({
        id: task1Id,
        project_id: project1Id,
        title: 'Assigned Task',
        status: 'in_progress', // active
        archived_at: null,
      });

      // User memberId is assigned to the task
      mockTaskMembersTable.push({
        id: 'tm-record-1',
        task_id: task1Id,
        user_id: memberId,
        assignment_role: 'owner',
        removed_at: null,
      });

      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          projectId: project1Id,
          userId: memberId,
        },
      });
      const res = mockResponse();

      await removeMemberHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Không thể gỡ thành viên khỏi dự án vì họ đang được giao thực hiện hoặc review công việc chưa hoàn thành');
    });
  });
});
