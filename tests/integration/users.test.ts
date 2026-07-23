/* eslint-disable @typescript-eslint/no-explicit-any, no-var */
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

// Initialize tables on globalThis to ensure single references across hoisted mocks
declare global {
  var mockUsersTable: UserRecord[];
  var mockCredentialsTable: CredentialRecord[];
  var mockSessionsTable: SessionRecord[];
  var mockActivityLogsTable: ActivityLogRecord[];
}

globalThis.mockUsersTable = globalThis.mockUsersTable || [];
globalThis.mockCredentialsTable = globalThis.mockCredentialsTable || [];
globalThis.mockSessionsTable = globalThis.mockSessionsTable || [];
globalThis.mockActivityLogsTable = globalThis.mockActivityLogsTable || [];

const mockUsersTable = globalThis.mockUsersTable;
const mockCredentialsTable = globalThis.mockCredentialsTable;
const mockSessionsTable = globalThis.mockSessionsTable;
const mockActivityLogsTable = globalThis.mockActivityLogsTable;

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
                      const credentials = globalThis.mockCredentialsTable;
                      const sessions = globalThis.mockSessionsTable;
                      const activityLogs = globalThis.mockActivityLogsTable;

                      // 1. SELECT s.id as session_id ... FROM auth_sessions s JOIN users u (getSession query)
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

                      // 2. UPDATE auth_sessions SET last_seen_at
                      if (normalizedSql.includes('UPDATE auth_sessions') && normalizedSql.includes('last_seen_at =')) {
                        const lastSeen = values[0];
                        const sessionId = values[1];
                        const session = sessions.find((s) => s.id === sessionId);
                        if (session) {
                          session.last_seen_at = lastSeen;
                        }
                        return [];
                      }

                      // 3. SELECT id, username ... FROM users WHERE id = ${user.id}
                      if (normalizedSql.includes('FROM users') && normalizedSql.includes('WHERE id =')) {
                        const id = values[0];
                        const user = users.find((u) => u.id === id);
                        return user ? [user] : [];
                      }

                      // 4. SELECT COUNT(*)::int as count FROM users WHERE role = 'admin' AND status = 'active'
                      if (normalizedSql.includes('SELECT COUNT(*)::int') && normalizedSql.includes("role = 'admin' AND status = 'active'")) {
                        const count = users.filter((u) => u.role === 'admin' && u.status === 'active').length;
                        return [{ count }];
                      }

                      // 5. SELECT id FROM users WHERE normalized_username =
                      if (normalizedSql.includes('FROM users') && normalizedSql.includes('WHERE normalized_username =')) {
                        const normalizedUsername = values[0];
                        const user = users.find((u) => u.normalized_username === normalizedUsername);
                        return user ? [{ id: user.id }] : [];
                      }

                      // 6. SELECT id FROM users WHERE email =
                      if (normalizedSql.includes('FROM users') && normalizedSql.includes('WHERE email =')) {
                        const email = values[0];
                        const excludeId = values[1]; // for update user query: email = $1 AND id != $2
                        const user = users.find((u) => u.email === email && (excludeId ? u.id !== excludeId : true));
                        return user ? [{ id: user.id }] : [];
                      }


                      // 7. INSERT INTO users
                      if (normalizedSql.includes('INSERT INTO users')) {
                        const username = values[0];
                        const normalized_username = values[1];
                        const full_name = values[2];
                        const email = values[3] || null;
                        const role = values[4];
                        // status: 'active', must_change_password: true, created_by: adminId
                        const newId = globalThis.crypto.randomUUID();
                        const newUser: UserRecord = {
                          id: newId,
                          username,
                          normalized_username,
                          full_name,
                          email,
                          role,
                          status: 'active',
                          must_change_password: true,
                          avatar_url: null,
                          department: null,
                          position: null,
                          last_login_at: null,
                          created_at: new Date(),
                          updated_at: new Date(),
                          deactivated_at: null,
                        };
                        users.push(newUser);
                        return [{ id: newId }];
                      }

                      // 8. INSERT INTO user_credentials
                      if (normalizedSql.includes('INSERT INTO user_credentials')) {
                        const user_id = values[0];
                        const password_hash = values[1];
                        credentials.push({
                          user_id,
                          password_hash,
                          password_changed_at: new Date(),
                          failed_login_count: 0,
                          last_failed_login_at: null,
                          locked_until: null,
                        });
                        return [];
                      }

                      // 9. INSERT INTO activity_logs
                      if (normalizedSql.includes('INSERT INTO activity_logs')) {
                        const actor_id = values[0];
                        const actor_type = 'user';
                        const entity_type = 'user';
                        const entity_id = values[1];

                        let action = 'unknown';
                        if (normalizedSql.includes("'create_user'")) action = 'create_user';
                        else if (normalizedSql.includes("'update_user'")) action = 'update_user';
                        else if (normalizedSql.includes("'toggle_status'")) action = 'toggle_status';
                        else if (normalizedSql.includes("'reset_password'")) action = 'reset_password';
                        else if (normalizedSql.includes("'revoke_session'")) action = 'revoke_session';
                        else if (normalizedSql.includes("'revoke_all_sessions'")) action = 'revoke_all_sessions';

                        const old_values = values[2];
                        const new_values = values[3];

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

                      // 10. UPDATE users
                      if (normalizedSql.includes('UPDATE users')) {
                        if (normalizedSql.includes('full_name =')) {
                          const full_name = values[0];
                          const email = values[1];
                          const role = values[2];
                          const department = values[3];
                          const position = values[4];
                          const id = values[values.length - 1];

                          const user = users.find((u) => u.id === id);
                          if (user) {
                            user.full_name = full_name;
                            user.email = email;
                            user.role = role;
                            user.department = department;
                            user.position = position;
                            user.updated_at = new Date();
                          }
                          return [];
                        }

                        if (normalizedSql.includes('status =')) {
                          const status = values[0];
                          const deactivated_at = values[1];
                          const id = values[2];

                          const user = users.find((u) => u.id === id);
                          if (user) {
                            user.status = status;
                            user.deactivated_at = deactivated_at;
                            user.updated_at = new Date();
                          }
                          return [];
                        }

                        if (normalizedSql.includes('must_change_password =')) {
                          const must_change_password = values[0];
                          const id = values[1];

                          const user = users.find((u) => u.id === id);
                          if (user) {
                            user.must_change_password = must_change_password;
                            user.updated_at = new Date();
                          }
                          return [];
                        }
                      }

                      // 11. UPDATE user_credentials
                      if (normalizedSql.includes('UPDATE user_credentials')) {
                        const password_hash = values[0];
                        const failed_login_count = values[1];
                        const locked_until = values[2];
                        const password_changed_at = values[3];
                        const user_id = values[4];

                        const cred = credentials.find((c) => c.user_id === user_id);
                        if (cred) {
                          cred.password_hash = password_hash;
                          cred.failed_login_count = failed_login_count;
                          cred.locked_until = locked_until;
                          cred.password_changed_at = password_changed_at;
                        }
                        return [];
                      }

                      // 12. UPDATE auth_sessions (revocation)
                      if (normalizedSql.includes('UPDATE auth_sessions') && normalizedSql.includes('revoked_at =')) {
                        const revoked_at = values[0];
                        // Note the space in ' id =' or ' s.id =' to prevent matching 'user_id ='
                        if ((normalizedSql.includes(' id =') || normalizedSql.includes(' id=')) && normalizedSql.includes('user_id =')) {
                          const sessionId = values[1];
                          const userId = values[2];
                          const session = sessions.find((s) => s.id === sessionId && s.user_id === userId);
                          if (session) {
                            session.revoked_at = revoked_at;
                          }
                        } else if (normalizedSql.includes('user_id =')) {
                          const userId = values[1];
                          sessions.forEach((s) => {
                            if (s.user_id === userId) {
                              s.revoked_at = revoked_at;
                            }
                          });
                        }
                        return [];
                      }

                      // 13. SELECT COUNT(*)::int as count FROM auth_sessions WHERE user_id =
                      if (normalizedSql.includes('SELECT COUNT(*)::int') && normalizedSql.includes('FROM auth_sessions') && normalizedSql.includes('WHERE user_id =')) {
                        const userId = values[0];
                        const count = sessions.filter((s) => s.user_id === userId).length;
                        return [{ count }];
                      }

                      // 14. SELECT id, created_at ... FROM auth_sessions WHERE user_id =
                      if (normalizedSql.includes('FROM auth_sessions') && normalizedSql.includes('WHERE user_id =')) {
                        const userId = values[0];
                        const limit = values[1] || 20;
                        const offset = values[2] || 0;
                        const userSessions = sessions
                          .filter((s) => s.user_id === userId)
                          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
                          .slice(offset, offset + limit);
                        return userSessions;
                      }

                      if (normalizedSql.includes('SELECT COUNT(*)::int') && normalizedSql.includes('FROM users')) {
                        const searchParam = values.find(v => typeof v === 'string' && v.startsWith('%') && v.endsWith('%'));
                        const roleParam = values.find(v => v === 'admin' || v === 'member');
                        const statusParam = values.find(v => v === 'active' || v === 'locked' || v === 'inactive');

                        let filtered = [...users];
                        if (searchParam) {
                          const term = searchParam.replace(/%/g, '').toLowerCase();
                          filtered = filtered.filter((u) =>
                            u.username.toLowerCase().includes(term) ||
                            u.full_name.toLowerCase().includes(term) ||
                            (u.email && u.email.toLowerCase().includes(term)) ||
                            (u.department && u.department.toLowerCase().includes(term)) ||
                            (u.position && u.position.toLowerCase().includes(term)),
                          );
                        }
                        if (roleParam) {
                          filtered = filtered.filter((u) => u.role === roleParam);
                        }
                        if (statusParam) {
                          filtered = filtered.filter((u) => u.status === statusParam);
                        }
                        return [{ count: filtered.length }];
                      }

                      // 16. SELECT id, username ... FROM users WHERE (list query)
                      if (normalizedSql.includes('FROM users') && normalizedSql.includes('ORDER BY')) {
                        const searchParam = values.find(v => typeof v === 'string' && v.startsWith('%') && v.endsWith('%'));
                        const roleParam = values.find(v => v === 'admin' || v === 'member');
                        const statusParam = values.find(v => v === 'active' || v === 'locked' || v === 'inactive');

                        let filtered = [...users];
                        if (searchParam) {
                          const term = searchParam.replace(/%/g, '').toLowerCase();
                          filtered = filtered.filter((u) =>
                            u.username.toLowerCase().includes(term) ||
                            u.full_name.toLowerCase().includes(term) ||
                            (u.email && u.email.toLowerCase().includes(term)) ||
                            (u.department && u.department.toLowerCase().includes(term)) ||
                            (u.position && u.position.toLowerCase().includes(term)),
                          );
                        }
                        if (roleParam) {
                          filtered = filtered.filter((u) => u.role === roleParam);
                        }
                        if (statusParam) {
                          filtered = filtered.filter((u) => u.status === statusParam);
                        }

                        // Sort logic
                        const sortBy = values[10] || 'created_at';
                        const sortOrder = values[11] || 'desc';
                        filtered.sort((a: any, b: any) => {
                          let valA = a[sortBy];
                          let valB = b[sortBy];
                          if (sortBy === 'full_name') {
                            valA = a.full_name;
                            valB = b.full_name;
                          }
                          if (valA === undefined || valA === null) return 1;
                          if (valB === undefined || valB === null) return -1;
                          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                          return 0;
                        });

                        // Pagination
                        const limit = values[values.length - 2];
                        const offset = values[values.length - 1];
                        const paginated = filtered.slice(offset, offset + limit);
                        return paginated;
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
import meHandler from '../../api/users/me.js';
import listHandler from '../../api/users/list.js';
import createHandler from '../../api/users/create.js';
import updateHandler from '../../api/users/update.js';
import toggleStatusHandler from '../../api/users/toggle-status.js';
import resetPasswordHandler from '../../api/users/reset-password.js';
import sessionsHandler from '../../api/users/sessions.js';
import revokeHandler from '../../api/users/sessions/revoke.js';

// Request/Response Mocks
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

describe('User Management Integration Tests', () => {
  const adminId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const adminToken = 'admin_session_token';
  const adminTokenHash = crypto.createHash('sha256').update(adminToken).digest('hex');
  const memberToken = 'member_session_token';
  const memberTokenHash = crypto.createHash('sha256').update(memberToken).digest('hex');

  beforeAll(() => {
    // No specific database connections to seed since it's mocked, but let's clear mocks
  });

  beforeEach(() => {
    mockUsersTable.length = 0;
    mockCredentialsTable.length = 0;
    mockSessionsTable.length = 0;
    mockActivityLogsTable.length = 0;
    vi.clearAllMocks();

    // Populate default seed data
    mockUsersTable.push(
      {
        id: adminId,
        username: 'AdminUser',
        normalized_username: 'adminuser',
        full_name: 'System Admin',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        must_change_password: false,
        avatar_url: 'http://example.com/avatar.png',
        department: 'IT',
        position: 'Administrator',
        last_login_at: new Date(),
        created_at: new Date(Date.now() - 10000),
        updated_at: new Date(Date.now() - 10000),
        deactivated_at: null,
      },
      {
        id: memberId,
        username: 'MemberUser',
        normalized_username: 'memberuser',
        full_name: 'Regular Member',
        email: 'member@example.com',
        role: 'member',
        status: 'active',
        must_change_password: true,
        avatar_url: null,
        department: 'Engineering',
        position: 'Developer',
        last_login_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deactivated_at: null,
      },
    );

    mockCredentialsTable.push(
      {
        user_id: adminId,
        password_hash: 'adminpasshash',
        password_changed_at: new Date(),
        failed_login_count: 0,
        last_failed_login_at: null,
        locked_until: null,
      },
      {
        user_id: memberId,
        password_hash: 'memberpasshash',
        password_changed_at: new Date(),
        failed_login_count: 0,
        last_failed_login_at: null,
        locked_until: null,
      },
    );

    mockSessionsTable.push(
      {
        id: crypto.randomUUID(),
        token_hash: adminTokenHash,
        user_id: adminId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest Admin Client',
        ip_hash: 'mockip',
      },
      {
        id: crypto.randomUUID(),
        token_hash: memberTokenHash,
        user_id: memberId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest Member Client',
        ip_hash: 'mockip',
      },
    );
  });

  describe('GET /api/users/me', () => {
    it('should return profile information of current authenticated user', async () => {
      const req = mockRequest({
        headers: { cookie: `session_token=${adminToken}` },
      });
      const res = mockResponse();

      await meHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(adminId);
      expect(res.body.user.username).toBe('AdminUser');
      expect(res.body.user.role).toBe('admin');
      expect(res.body.user.department).toBe('IT');
    });

    it('should return 401 if request is unauthorized (invalid cookie)', async () => {
      const req = mockRequest({
        headers: { cookie: 'session_token=nonexistent' },
      });
      const res = mockResponse();

      await meHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/users/list', () => {
    it('should list all users for admin with search & filtering parameters', async () => {
      const req = mockRequest({
        headers: { cookie: `session_token=${adminToken}` },
        query: { search: 'Admin', role: 'admin', limit: '5', offset: '0' },
      });
      const res = mockResponse();

      await listHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(1);
      expect(res.body.users[0].id).toBe(adminId);
      expect(res.body.total).toBe(1);
    });

    it('should return 403 Forbidden for non-admin requests', async () => {
      const req = mockRequest({
        headers: { cookie: `session_token=${memberToken}` },
      });
      const res = mockResponse();

      await listHandler(req, res);

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('POST /api/users/create', () => {
    it('should allow admin to create a new user and generate temporary password & write audit log', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          username: 'NewMember',
          fullName: 'New User Name',
          email: 'newuser@example.com',
          role: 'member',
        },
      });
      const res = mockResponse();

      await createHandler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('NewMember');
      expect(res.body.temporaryPassword).toBeDefined();
      expect(res.body.temporaryPassword.length).toBeGreaterThanOrEqual(11);

      // Verify db insertion
      const newUser = mockUsersTable.find((u) => u.username === 'NewMember');
      expect(newUser).toBeDefined();
      expect(newUser?.email).toBe('newuser@example.com');

      // Verify credentials table has password hash
      const credentials = mockCredentialsTable.find((c) => c.user_id === newUser?.id);
      expect(credentials).toBeDefined();
      expect(credentials?.password_hash).toBeDefined();

      // Verify audit log
      const auditLog = mockActivityLogsTable.find((l) => l.action === 'create_user');
      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_id).toBe(adminId);
      expect(auditLog?.entity_id).toBe(newUser?.id);
      expect(auditLog?.new_values.username).toBe('NewMember');
      expect(auditLog?.old_values).toBeNull();
    });

    it('should fail creation if username already exists', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          username: 'MemberUser', // duplicate username
          fullName: 'Duplicate',
          email: 'dup@example.com',
          role: 'member',
        },
      });
      const res = mockResponse();

      await createHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Tên đăng nhập đã tồn tại.');
    });
  });

  describe('POST /api/users/update', () => {
    it('should allow admin to update user fields and write audit log', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          id: memberId,
          fullName: 'Updated Name',
          department: 'HR',
          position: 'Manager',
        },
      });
      const res = mockResponse();

      await updateHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.fullName).toBe('Updated Name');
      expect(res.body.user.department).toBe('HR');
      expect(res.body.user.position).toBe('Manager');

      // Verify database update
      const user = mockUsersTable.find((u) => u.id === memberId);
      expect(user?.full_name).toBe('Updated Name');
      expect(user?.department).toBe('HR');

      // Verify audit log
      const auditLog = mockActivityLogsTable.find((l) => l.action === 'update_user');
      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_id).toBe(adminId);
      expect(auditLog?.entity_id).toBe(memberId);
      expect(auditLog?.old_values.fullName).toBe('Regular Member');
      expect(auditLog?.new_values.fullName).toBe('Updated Name');
    });

    it('should prevent demoting the last active admin (Last Admin Guard)', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          id: adminId, // demote oneself
          role: 'member',
        },
      });
      const res = mockResponse();

      await updateHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Không thể giáng chức quản trị viên hoạt động cuối cùng.');
    });
  });

  describe('POST /api/users/toggle-status', () => {
    it('should allow admin to change a user status to inactive, write audit logs, and revoke all sessions', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          id: memberId,
          status: 'inactive',
        },
      });
      const res = mockResponse();

      await toggleStatusHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('inactive');

      // Verify user inactive status & deactivated_at in DB
      const user = mockUsersTable.find((u) => u.id === memberId);
      expect(user?.status).toBe('inactive');
      expect(user?.deactivated_at).toBeDefined();

      // Verify session for this user was revoked
      const sessions = mockSessionsTable.filter((s) => s.user_id === memberId);
      expect(sessions.every((s) => s.revoked_at !== null)).toBe(true);

      // Verify audit log
      const auditLog = mockActivityLogsTable.find((l) => l.action === 'toggle_status');
      expect(auditLog).toBeDefined();
      expect(auditLog?.old_values.status).toBe('active');
      expect(auditLog?.new_values.status).toBe('inactive');
    });

    it('should prevent deactivating/locking the last active admin (Last Admin Guard)', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          id: adminId,
          status: 'locked',
        },
      });
      const res = mockResponse();

      await toggleStatusHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Không thể khóa hoặc vô hiệu hóa quản trị viên hoạt động cuối cùng.');
    });
  });

  describe('POST /api/users/reset-password', () => {
    it('should allow admin to reset a user password, force must change password, write audit logs and revoke active sessions', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          id: memberId,
        },
      });
      const res = mockResponse();

      await resetPasswordHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.temporaryPassword).toBeDefined();

      const user = mockUsersTable.find((u) => u.id === memberId);
      expect(user?.must_change_password).toBe(true);

      const session = mockSessionsTable.find((s) => s.user_id === memberId);
      expect(session?.revoked_at).not.toBeNull();

      const auditLog = mockActivityLogsTable.find((l) => l.action === 'reset_password');
      expect(auditLog).toBeDefined();
      expect(auditLog?.actor_id).toBe(adminId);
      expect(auditLog?.entity_id).toBe(memberId);
    });
  });

  describe('GET /api/users/sessions', () => {
    it('should list sessions of a user', async () => {
      const req = mockRequest({
        headers: { cookie: `session_token=${adminToken}` },
        query: { userId: memberId },
      });
      const res = mockResponse();

      await sessionsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.sessions).toBeDefined();
      expect(res.body.sessions.length).toBeGreaterThan(0);
      expect(res.body.total).toBe(1);
    });
  });

  describe('POST /api/users/sessions/revoke', () => {
    it('should allow admin to revoke a specific session of a user', async () => {
      const targetSession = mockSessionsTable.find((s) => s.user_id === memberId);
      expect(targetSession?.revoked_at).toBeNull();

      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          userId: memberId,
          sessionId: targetSession?.id,
        },
      });
      const res = mockResponse();

      await revokeHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      expect(targetSession?.revoked_at).not.toBeNull();

      const auditLog = mockActivityLogsTable.find((l) => l.action === 'revoke_session');
      expect(auditLog).toBeDefined();
      expect(auditLog?.new_values.sessionId).toBe(targetSession?.id);
    });

    it('should allow admin to revoke all sessions of a user', async () => {
      const req = mockRequest({
        method: 'POST',
        headers: { cookie: `session_token=${adminToken}` },
        body: {
          userId: memberId,
        },
      });
      const res = mockResponse();

      await revokeHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const sessions = mockSessionsTable.filter((s) => s.user_id === memberId);
      expect(sessions.every((s) => s.revoked_at !== null)).toBe(true);

      const auditLog = mockActivityLogsTable.find((l) => l.action === 'revoke_all_sessions');
      expect(auditLog).toBeDefined();
    });
  });
});
