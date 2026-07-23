/* eslint-disable @typescript-eslint/no-explicit-any, no-var */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
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
  last_login_at: Date | null;
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

interface LoginAttemptRecord {
  id: string;
  normalized_username: string;
  ip_hash: string | null;
  success: boolean;
  attempted_at: Date;
  failure_reason: string | null;
}

// Initialize tables on globalThis to ensure single references across hoisted mocks
declare global {
  var mockUsersTable: UserRecord[];
  var mockCredentialsTable: CredentialRecord[];
  var mockSessionsTable: SessionRecord[];
  var mockAttemptsTable: LoginAttemptRecord[];
}

globalThis.mockUsersTable = globalThis.mockUsersTable || [];
globalThis.mockCredentialsTable = globalThis.mockCredentialsTable || [];
globalThis.mockSessionsTable = globalThis.mockSessionsTable || [];
globalThis.mockAttemptsTable = globalThis.mockAttemptsTable || [];

const mockUsersTable = globalThis.mockUsersTable;
const mockCredentialsTable = globalThis.mockCredentialsTable;
const mockSessionsTable = globalThis.mockSessionsTable;
const mockAttemptsTable = globalThis.mockAttemptsTable;

// Hoist mock definition
vi.mock('../../api/_shared/db.js', () => {
  // Use global `vi` directly
  const mockSql = vi.fn() as any;
  mockSql.begin = vi.fn(async (cb: any) => {
    return cb(mockSql);
  });

  mockSql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
    const sqlText = strings.join('?').trim();
    // Collapse all whitespace and newlines for stable matching
    const normalizedSql = sqlText.replace(/\s+/g, ' ');

    // Retrieve tables dynamically from globalThis to prevent any closure binding issues
    const users = globalThis.mockUsersTable;
    const credentials = globalThis.mockCredentialsTable;
    const sessions = globalThis.mockSessionsTable;
    const attempts = globalThis.mockAttemptsTable;

    // 1. SELECT COUNT(*)::int as count FROM auth_login_attempts
    if (normalizedSql.includes('SELECT COUNT(*)::int') && normalizedSql.includes('auth_login_attempts')) {
      const normalizedUsername = values[0];
      const ipHash = values[1];
      const timeLimit = values[2];

      const count = attempts.filter(
        (att) =>
          (att.normalized_username === normalizedUsername || att.ip_hash === ipHash) &&
          att.attempted_at > timeLimit,
      ).length;

      return [{ count }];
    }

    // 2. SELECT u.id, u.username ... FROM users u JOIN/LEFT JOIN user_credentials
    if (
      normalizedSql.includes('FROM users u') &&
      normalizedSql.includes('user_credentials uc') &&
      normalizedSql.includes('normalized_username')
    ) {
      const normalizedUsername = values[0];
      const user = users.find((u) => u.normalized_username === normalizedUsername);
      if (!user) return [];

      const cred = credentials.find((c) => c.user_id === user.id);
      return [
        {
          id: user.id,
          username: user.username,
          normalized_username: user.normalized_username,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          status: user.status,
          must_change_password: user.must_change_password,
          password_hash: cred?.password_hash,
          failed_login_count: cred?.failed_login_count,
          locked_until: cred?.locked_until,
        },
      ];
    }

    // 3. INSERT INTO auth_login_attempts
    if (normalizedSql.includes('INSERT INTO auth_login_attempts')) {
      const normalizedUsername = values[0];
      const ipHash = values[1];
      const success = values[2];
      const attemptedAt = values[3];
      const failureReason = values[4] || null;

      const newAttempt: LoginAttemptRecord = {
        id: globalThis.crypto.randomUUID(),
        normalized_username: normalizedUsername,
        ip_hash: ipHash,
        success: !!success,
        attempted_at: attemptedAt,
        failure_reason: failureReason,
      };
      attempts.push(newAttempt);
      return [newAttempt];
    }

    // 4. UPDATE user_credentials
    if (normalizedSql.includes('UPDATE user_credentials')) {
      if (normalizedSql.includes('failed_login_count = 0') || normalizedSql.includes('failed_login_count = ?')) {
        if (values.length === 1) {
          const userId = values[0];
          const cred = credentials.find((c) => c.user_id === userId);
          if (cred) {
            cred.failed_login_count = 0;
            cred.locked_until = null;
          }
        } else if (values.length === 3) {
          const failedCount = values[0];
          const lockedUntil = values[1];
          const userId = values[2];
          const cred = credentials.find((c) => c.user_id === userId);
          if (cred) {
            cred.failed_login_count = failedCount;
            cred.locked_until = lockedUntil;
          }
        } else {
          const failedCount = values[0];
          const lastFailed = values[1];
          const lockedUntil = values[2];
          const userId = values[3];
          const cred = credentials.find((c) => c.user_id === userId);
          if (cred) {
            cred.failed_login_count = failedCount;
            cred.last_failed_login_at = lastFailed;
            cred.locked_until = lockedUntil;
          }
        }
        return [];
      }

      if (normalizedSql.includes('password_hash')) {
        const newHash = values[0];
        const changedAt = values[1];
        const userId = values[2];

        const cred = credentials.find((c) => c.user_id === userId);
        if (cred) {
          cred.password_hash = newHash;
          cred.password_changed_at = changedAt;
        }
        return [];
      }
    }

    // 5. UPDATE users
    if (normalizedSql.includes('UPDATE users')) {
      if (normalizedSql.includes('last_login_at')) {
        const lastLogin = values[0];
        const id = values[1];
        const user = users.find((u) => u.id === id);
        if (user) {
          user.last_login_at = lastLogin;
        }
        return [];
      }

      if (normalizedSql.includes('must_change_password')) {
        const mustChange = values[0];
        const id = values[1];
        const user = users.find((u) => u.id === id);
        if (user) {
          user.must_change_password = mustChange;
        }
        return [];
      }
    }

    // 6. INSERT INTO auth_sessions
    if (normalizedSql.includes('INSERT INTO auth_sessions')) {
      const tokenHash = values[0];
      const userId = values[1];
      const expiresAt = values[2];
      const lastSeenAt = values[3];
      const userAgent = values[4];
      const ipHash = values[5];

      const newSession: SessionRecord = {
        id: globalThis.crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: lastSeenAt,
        last_seen_at: lastSeenAt,
        expires_at: expiresAt,
        revoked_at: null,
        user_agent: userAgent,
        ip_hash: ipHash,
      };
      sessions.push(newSession);
      return [newSession];
    }

    // 7. SELECT s.id as session_id ... FROM auth_sessions s JOIN users u
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

    // 8. UPDATE auth_sessions
    if (normalizedSql.includes('UPDATE auth_sessions')) {
      if (normalizedSql.includes('last_seen_at')) {
        const lastSeen = values[0];
        const sessionId = values[1];
        const session = sessions.find((s) => s.id === sessionId);
        if (session) {
          session.last_seen_at = lastSeen;
        }
        return [];
      }

      if (normalizedSql.includes('revoked_at')) {
        if (normalizedSql.includes('token_hash')) {
          const revokedAt = values[0];
          const tokenHash = values[1];
          const session = sessions.find((s) => s.token_hash === tokenHash && s.revoked_at === null);
          if (session) {
            session.revoked_at = revokedAt;
          }
          return [];
        }

        if (normalizedSql.includes('user_id') && normalizedSql.includes('id !=') && normalizedSql.includes('revoked_at IS NULL')) {
          const revokedAt = values[0];
          const userId = values[1];
          const currentSessionId = values[2];
          sessions.forEach((s) => {
            if (s.user_id === userId && s.id !== currentSessionId && s.revoked_at === null) {
              s.revoked_at = revokedAt;
            }
          });
          return [];
        }
      }
    }

    // 9. SELECT password_hash FROM user_credentials
    if (normalizedSql.includes('SELECT password_hash FROM user_credentials')) {
      const userId = values[0];
      const cred = credentials.find((c) => c.user_id === userId);
      if (!cred) return [];
      return [{ password_hash: cred.password_hash }];
    }

    return [];
  });

  return {
    sql: mockSql,
  };
});

// Import handlers and helpers
import loginHandler from '../../api/auth/login.js';
import logoutHandler from '../../api/auth/logout.js';
import changePasswordHandler from '../../api/auth/change-password.js';
import { getSession } from '../../api/_shared/auth.js';

// Request/Response Mocks
function mockRequest(options: {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  socket?: any;
}) {
  return {
    method: options.method || 'POST',
    body: options.body || {},
    headers: options.headers || {},
    socket: options.socket || { remoteAddress: '127.0.0.1' },
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

describe('Auth & Session Integration Tests', () => {
  const defaultPassword = 'Password123';
  let defaultPasswordHash = '';

  beforeAll(async () => {
    defaultPasswordHash = await bcrypt.hash(defaultPassword, 10);
  });

  beforeEach(() => {
    mockUsersTable.length = 0;
    mockCredentialsTable.length = 0;
    mockSessionsTable.length = 0;
    mockAttemptsTable.length = 0;
    vi.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in with valid credentials, reset failed count, save session and set cookie', async () => {
      const userId = crypto.randomUUID();
      mockUsersTable.push({
        id: userId,
        username: 'TestUser',
        normalized_username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        status: 'active',
        must_change_password: true,
        last_login_at: null,
      });
      mockCredentialsTable.push({
        user_id: userId,
        password_hash: defaultPasswordHash,
        password_changed_at: new Date(),
        failed_login_count: 2,
        last_failed_login_at: new Date(),
        locked_until: null,
      });

      const req = mockRequest({
        body: { username: '  TestUser  ', password: defaultPassword },
      });
      const res = mockResponse();

      await loginHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe('TestUser');
      expect(res.headers['set-cookie']).toContain('session_token=');

      const cred = mockCredentialsTable.find((c) => c.user_id === userId);
      expect(cred?.failed_login_count).toBe(0);
      expect(cred?.locked_until).toBeNull();

      expect(mockSessionsTable.length).toBe(1);
      expect(mockSessionsTable[0]?.user_id).toBe(userId);

      const attempt = mockAttemptsTable[0];
      expect(attempt).toBeDefined();
      expect(attempt?.success).toBe(true);
      expect(attempt?.normalized_username).toBe('testuser');
    });

    it('should fail to log in with invalid username or password and return ambiguous error message', async () => {
      const userId = crypto.randomUUID();
      mockUsersTable.push({
        id: userId,
        username: 'TestUser',
        normalized_username: 'testuser',
        full_name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        status: 'active',
        must_change_password: true,
        last_login_at: null,
      });
      mockCredentialsTable.push({
        user_id: userId,
        password_hash: defaultPasswordHash,
        password_changed_at: new Date(),
        failed_login_count: 0,
        last_failed_login_at: null,
        locked_until: null,
      });

      const reqNotFound = mockRequest({
        body: { username: 'nonexistent', password: 'Password123' },
      });
      const resNotFound = mockResponse();
      await loginHandler(reqNotFound, resNotFound);

      expect(resNotFound.statusCode).toBe(401);
      expect(resNotFound.body.error).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');

      const reqWrongPass = mockRequest({
        body: { username: 'TestUser', password: 'wrongpassword' },
      });
      const resWrongPass = mockResponse();
      await loginHandler(reqWrongPass, resWrongPass);

      expect(resWrongPass.statusCode).toBe(401);
      expect(resWrongPass.body.error).toBe('Tên đăng nhập hoặc mật khẩu không chính xác');

      const cred = mockCredentialsTable.find((c) => c.user_id === userId);
      expect(cred?.failed_login_count).toBe(1);

      expect(mockAttemptsTable.length).toBe(2);
      expect(mockAttemptsTable.every((a) => a.success === false)).toBe(true);
    });

    it('should reject login for inactive, locked, or time-locked accounts', async () => {
      const userId1 = crypto.randomUUID();
      const userId2 = crypto.randomUUID();
      const userId3 = crypto.randomUUID();

      mockUsersTable.push(
        {
          id: userId1,
          username: 'InactiveUser',
          normalized_username: 'inactiveuser',
          full_name: 'Inactive User',
          email: 'inactive@example.com',
          role: 'member',
          status: 'inactive',
          must_change_password: false,
          last_login_at: null,
        },
        {
          id: userId2,
          username: 'LockedUser',
          normalized_username: 'lockeduser',
          full_name: 'Locked User',
          email: 'locked@example.com',
          role: 'member',
          status: 'locked',
          must_change_password: false,
          last_login_at: null,
        },
        {
          id: userId3,
          username: 'TimeLockedUser',
          normalized_username: 'timelockeduser',
          full_name: 'Time Locked User',
          email: 'timelocked@example.com',
          role: 'member',
          status: 'active',
          must_change_password: false,
          last_login_at: null,
        },
      );

      mockCredentialsTable.push(
        {
          user_id: userId1,
          password_hash: defaultPasswordHash,
          password_changed_at: new Date(),
          failed_login_count: 0,
          last_failed_login_at: null,
          locked_until: null,
        },
        {
          user_id: userId2,
          password_hash: defaultPasswordHash,
          password_changed_at: new Date(),
          failed_login_count: 0,
          last_failed_login_at: null,
          locked_until: null,
        },
        {
          user_id: userId3,
          password_hash: defaultPasswordHash,
          password_changed_at: new Date(),
          failed_login_count: 5,
          last_failed_login_at: new Date(),
          locked_until: new Date(Date.now() + 10 * 60 * 1000),
        },
      );

      const reqInactive = mockRequest({ body: { username: 'InactiveUser', password: defaultPassword } });
      const resInactive = mockResponse();
      await loginHandler(reqInactive, resInactive);
      expect(resInactive.statusCode).toBe(401);
      expect(resInactive.body.error).toBe('Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.');

      const reqLocked = mockRequest({ body: { username: 'LockedUser', password: defaultPassword } });
      const resLocked = mockResponse();
      await loginHandler(reqLocked, resLocked);
      expect(resLocked.statusCode).toBe(401);
      expect(resLocked.body.error).toBe('Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.');

      const reqTimeLocked = mockRequest({ body: { username: 'TimeLockedUser', password: defaultPassword } });
      const resTimeLocked = mockResponse();
      await loginHandler(reqTimeLocked, resTimeLocked);
      expect(resTimeLocked.statusCode).toBe(401);
      expect(resTimeLocked.body.error).toBe('Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt.');
    });

    it('should lock the account on the 5th consecutive login failure', async () => {
      const userId = crypto.randomUUID();
      mockUsersTable.push({
        id: userId,
        username: 'TestLock',
        normalized_username: 'testlock',
        full_name: 'Test Lock',
        email: 'lock@example.com',
        role: 'member',
        status: 'active',
        must_change_password: false,
        last_login_at: null,
      });
      mockCredentialsTable.push({
        user_id: userId,
        password_hash: defaultPasswordHash,
        password_changed_at: new Date(),
        failed_login_count: 4,
        last_failed_login_at: new Date(),
        locked_until: null,
      });

      const req = mockRequest({ body: { username: 'TestLock', password: 'wrongpassword' } });
      const res = mockResponse();
      await loginHandler(req, res);

      expect(res.statusCode).toBe(401);

      const cred = mockCredentialsTable.find((c) => c.user_id === userId);
      expect(cred?.failed_login_count).toBe(5);
      expect(cred?.locked_until).not.toBeNull();
      
      const lockedUntilVal = cred?.locked_until;
      if (lockedUntilVal) {
        expect(new Date(lockedUntilVal).getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should enforce rate-limiting of 10 attempts in 15 minutes', async () => {
      const username = 'ratelimituser';
      const ipHash = crypto.createHash('sha256').update('127.0.0.1').digest('hex');

      for (let i = 0; i < 10; i++) {
        mockAttemptsTable.push({
          id: crypto.randomUUID(),
          normalized_username: username,
          ip_hash: ipHash,
          success: false,
          attempted_at: new Date(Date.now() - 5 * 60 * 1000),
          failure_reason: 'Invalid password',
        });
      }

      const req = mockRequest({ body: { username, password: 'password' } });
      const res = mockResponse();
      await loginHandler(req, res);

      expect(res.statusCode).toBe(429);
      expect(res.body.error).toBe('Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau.');
    });
  });

  describe('GET Session Check (getSession helper)', () => {
    it('should successfully validate session, update last_seen_at and return user context', async () => {
      const userId = crypto.randomUUID();
      const token = 'validopaqueuuidortoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockUsersTable.push({
        id: userId,
        username: 'SessionUser',
        normalized_username: 'sessionuser',
        full_name: 'Session User',
        email: 'session@example.com',
        role: 'member',
        status: 'active',
        must_change_password: false,
        last_login_at: new Date(),
      });

      const lastSeenInitial = new Date(Date.now() - 60 * 1000);
      mockSessionsTable.push({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: new Date(Date.now() - 60 * 1000),
        last_seen_at: lastSeenInitial,
        expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest',
        ip_hash: 'mockip',
      });

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
      });

      const sessionContext = await getSession(req);
      expect(sessionContext).not.toBeNull();
      expect(sessionContext?.user.id).toBe(userId);
      expect(sessionContext?.user.username).toBe('SessionUser');

      const session = mockSessionsTable.find((s) => s.token_hash === tokenHash);
      expect(session?.last_seen_at.getTime()).toBeGreaterThan(lastSeenInitial.getTime());
    });

    it('should reject session on absolute expiration timeout', async () => {
      const userId = crypto.randomUUID();
      const token = 'expiredtoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockUsersTable.push({
        id: userId,
        username: 'ExpiredUser',
        normalized_username: 'expireduser',
        full_name: 'Expired User',
        email: 'expired@example.com',
        role: 'member',
        status: 'active',
        must_change_password: false,
        last_login_at: new Date(),
      });

      mockSessionsTable.push({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        last_seen_at: new Date(Date.now() - 10 * 60 * 1000),
        expires_at: new Date(Date.now() - 1 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest',
        ip_hash: 'mockip',
      });

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
      });

      const sessionContext = await getSession(req);
      expect(sessionContext).toBeNull();
    });

    it('should reject session on idle timeout (12 hours)', async () => {
      const userId = crypto.randomUUID();
      const token = 'idleexpiredtoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockUsersTable.push({
        id: userId,
        username: 'IdleUser',
        normalized_username: 'idleuser',
        full_name: 'Idle User',
        email: 'idle@example.com',
        role: 'member',
        status: 'active',
        must_change_password: false,
        last_login_at: new Date(),
      });

      mockSessionsTable.push({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
        last_seen_at: new Date(Date.now() - 13 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest',
        ip_hash: 'mockip',
      });

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
      });

      const sessionContext = await getSession(req);
      expect(sessionContext).toBeNull();
    });

    it('should reject session if user status is locked or inactive', async () => {
      const userId = crypto.randomUUID();
      const token = 'statuschecktoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockUsersTable.push({
        id: userId,
        username: 'LockedUserSession',
        normalized_username: 'lockedusersession',
        full_name: 'Locked User Session',
        email: 'locked@example.com',
        role: 'member',
        status: 'locked',
        must_change_password: false,
        last_login_at: new Date(),
      });

      mockSessionsTable.push({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest',
        ip_hash: 'mockip',
      });

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
      });

      const sessionContext = await getSession(req);
      expect(sessionContext).toBeNull();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully revoke session in database and delete cookie', async () => {
      const userId = crypto.randomUUID();
      const token = 'logouttoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockSessionsTable.push({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest',
        ip_hash: 'mockip',
      });

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
      });
      const res = mockResponse();

      await logoutHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toContain('Max-Age=0');

      const session = mockSessionsTable.find((s) => s.token_hash === tokenHash);
      expect(session?.revoked_at).not.toBeNull();
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully, update must_change_password, and revoke other sessions of the user', async () => {
      const userId = crypto.randomUUID();
      const token = 'currentsessiontoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      const otherToken1 = 'othertoken1';
      const otherTokenHash1 = crypto.createHash('sha256').update(otherToken1).digest('hex');

      const otherToken2 = 'othertoken2';
      const otherTokenHash2 = crypto.createHash('sha256').update(otherToken2).digest('hex');

      mockUsersTable.push({
        id: userId,
        username: 'PwdUser',
        normalized_username: 'pwduser',
        full_name: 'Password User',
        email: 'pwd@example.com',
        role: 'member',
        status: 'active',
        must_change_password: true,
        last_login_at: new Date(),
      });

      mockCredentialsTable.push({
        user_id: userId,
        password_hash: defaultPasswordHash,
        password_changed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        failed_login_count: 0,
        last_failed_login_at: null,
        locked_until: null,
      });

      const currentSessionId = crypto.randomUUID();
      mockSessionsTable.push(
        {
          id: currentSessionId,
          token_hash: tokenHash,
          user_id: userId,
          created_at: new Date(),
          last_seen_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revoked_at: null,
          user_agent: 'Vitest',
          ip_hash: 'mockip',
        },
        {
          id: crypto.randomUUID(),
          token_hash: otherTokenHash1,
          user_id: userId,
          created_at: new Date(),
          last_seen_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revoked_at: null,
          user_agent: 'Vitest',
          ip_hash: 'mockip',
        },
        {
          id: crypto.randomUUID(),
          token_hash: otherTokenHash2,
          user_id: userId,
          created_at: new Date(),
          last_seen_at: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          revoked_at: null,
          user_agent: 'Vitest',
          ip_hash: 'mockip',
        },
      );

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
        body: {
          currentPassword: defaultPassword,
          newPassword: 'NewPassword987',
        },
      });
      const res = mockResponse();

      await changePasswordHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const cred = mockCredentialsTable.find((c) => c.user_id === userId);
      expect(cred?.password_hash).not.toBe(defaultPasswordHash);
      const isNewPasswordMatch = await bcrypt.compare('NewPassword987', cred?.password_hash || '');
      expect(isNewPasswordMatch).toBe(true);

      const user = mockUsersTable.find((u) => u.id === userId);
      expect(user?.must_change_password).toBe(false);

      const currentSession = mockSessionsTable.find((s) => s.id === currentSessionId);
      expect(currentSession?.revoked_at).toBeNull();

      const otherSession1 = mockSessionsTable.find((s) => s.token_hash === otherTokenHash1);
      expect(otherSession1?.revoked_at).not.toBeNull();

      const otherSession2 = mockSessionsTable.find((s) => s.token_hash === otherTokenHash2);
      expect(otherSession2?.revoked_at).not.toBeNull();
    });

    it('should reject password change with incorrect current password', async () => {
      const userId = crypto.randomUUID();
      const token = 'pwdfailtoken';
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      mockUsersTable.push({
        id: userId,
        username: 'PwdFailUser',
        normalized_username: 'pwdfailuser',
        full_name: 'Password Fail User',
        email: 'pwdfail@example.com',
        role: 'member',
        status: 'active',
        must_change_password: true,
        last_login_at: new Date(),
      });

      mockCredentialsTable.push({
        user_id: userId,
        password_hash: defaultPasswordHash,
        password_changed_at: new Date(),
        failed_login_count: 0,
        last_failed_login_at: null,
        locked_until: null,
      });

      mockSessionsTable.push({
        id: crypto.randomUUID(),
        token_hash: tokenHash,
        user_id: userId,
        created_at: new Date(),
        last_seen_at: new Date(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revoked_at: null,
        user_agent: 'Vitest',
        ip_hash: 'mockip',
      });

      const req = mockRequest({
        headers: { cookie: `session_token=${token}` },
        body: {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword987',
        },
      });
      const res = mockResponse();

      await changePasswordHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Mật khẩu hiện tại không chính xác.');

      const cred = mockCredentialsTable.find((c) => c.user_id === userId);
      expect(cred?.password_hash).toBe(defaultPasswordHash);
    });
  });
});
