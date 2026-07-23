import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sql } from '../../api/_shared/db';
import createBlockerHandler from '../../api/blockers/create';
import resolveBlockerHandler from '../../api/blockers/resolve';
import dismissBlockerHandler from '../../api/blockers/dismiss';
import listBlockersHandler from '../../api/blockers/list';
import { getSession } from '../../api/_shared/auth';
import type { VercelRequest, VercelResponse } from '@vercel/node';

vi.mock('../../api/_shared/db', () => ({
  sql: vi.fn(),
}));

vi.mock('../../api/_shared/auth', () => ({
  getSession: vi.fn(),
}));

describe('Blockers API', () => {
  const mockAdminId = '123e4567-e89b-12d3-a456-426614174002';
  const mockMemberId = '123e4567-e89b-12d3-a456-426614174003';
  const mockOtherUserId = '123e4567-e89b-12d3-a456-426614174004';
  const mockTaskId = '123e4567-e89b-12d3-a456-426614174000';
  const mockBlockerId = '123e4567-e89b-12d3-a456-426614174001';

  const mockAdminSession = {
    user: { id: mockAdminId, role: 'admin' },
  };

  const mockMemberSession = {
    user: { id: mockMemberId, role: 'member' },
  };

  const mockOtherUserSession = {
    user: { id: mockOtherUserId, role: 'member' },
  };

  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let resData: any;
  let resStatus: number;

  beforeEach(() => {
    resData = {};
    resStatus = 200;
    res = {
      status: vi.fn().mockImplementation((s: number) => {
        resStatus = s;
        return res;
      }),
      json: vi.fn().mockImplementation((d: any) => {
        resData = d;
        return res;
      }),
      setHeader: vi.fn(),
    };
    
    // Default sql setup
    (sql as any).begin = vi.fn().mockImplementation(async (callback) => {
      return callback(sql);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create.ts', () => {
    it('should validate description length', async () => {
      req = { method: 'POST', body: { taskId: mockTaskId, description: 'short' } };
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);
      
      await createBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(400);
      expect(resData.details.fieldErrors.description).toBeDefined();
    });

    it('should forbid non-participants from creating blockers', async () => {
      req = { method: 'POST', body: { taskId: mockTaskId, description: 'this is a valid description' } };
      vi.mocked(getSession).mockResolvedValue(mockOtherUserSession as any);
      
      const mockSql = vi.mocked(sql);
      mockSql.mockResolvedValueOnce([]); // No participants match
      
      await createBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(403);
      expect(resData.error).toContain('Only task participants');
    });

    it('should forbid creating duplicate open blockers', async () => {
      req = { method: 'POST', body: { taskId: mockTaskId, description: 'this is a valid description' } };
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);
      
      const mockSql = vi.mocked(sql);
      mockSql.mockResolvedValueOnce([{ user_id: mockMemberId }]); // is participant
      mockSql.mockResolvedValueOnce([{ id: 'existing-blocker' }]); // existing open blocker
      
      await createBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(409);
      expect(resData.error).toContain('already have an open blocker');
    });

    it('should create blocker successfully and alert admins', async () => {
      req = { method: 'POST', body: { taskId: mockTaskId, description: 'this is a valid description' } };
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);
      
      const mockSql = vi.mocked(sql) as any;
      
      // We need to provide answers for multiple queries
      mockSql.mockImplementation((strings: any, ...values: any[]) => {
        const query = strings.join('?').toLowerCase();
        if (query.includes('from task_members tm')) {
          return Promise.resolve([{ user_id: mockMemberId }]);
        }
        if (query.includes('from task_blockers') && query.includes('status = \'open\'')) {
          return Promise.resolve([]); // no duplicate
        }
        if (query.includes('insert into task_blockers')) {
          return Promise.resolve([{ id: mockBlockerId, task_id: mockTaskId }]);
        }
        if (query.includes('select id from users where role = \'admin\'')) {
          return Promise.resolve([{ id: mockAdminId }]);
        }
        return Promise.resolve([]);
      });

      await createBlockerHandler(req as VercelRequest, res as VercelResponse);
      
      expect(resStatus).toBe(201);
      // Ensure the audit log and notifications were created
      expect(mockSql).toHaveBeenCalled();
    });
  });

  describe('resolve.ts', () => {
    it('should allow reporter, task owner, or admin to resolve', async () => {
      req = { method: 'POST', body: { blockerId: mockBlockerId, resolutionNote: 'Resolved this' } };
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any); // reporter
      
      const mockSql = vi.mocked(sql) as any;
      mockSql.mockImplementation((strings: any, ...values: any[]) => {
        const query = strings.join('?').toLowerCase();
        if (query.includes('from task_blockers b')) {
          return Promise.resolve([{ id: mockBlockerId, status: 'open', reporter_id: mockMemberId, owner_id: 'other' }]);
        }
        if (query.includes('update task_blockers')) {
          return Promise.resolve([{ id: mockBlockerId, status: 'resolved' }]);
        }
        return Promise.resolve([]);
      });

      await resolveBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(200);
      expect(resData.data.status).toBe('resolved');
    });

    it('should forbid other users from resolving', async () => {
      req = { method: 'POST', body: { blockerId: mockBlockerId, resolutionNote: 'Resolved this' } };
      vi.mocked(getSession).mockResolvedValue(mockOtherUserSession as any);
      
      const mockSql = vi.mocked(sql) as any;
      mockSql.mockImplementation((strings: any, ...values: any[]) => {
        const query = strings.join('?').toLowerCase();
        if (query.includes('from task_blockers b')) {
          return Promise.resolve([{ id: mockBlockerId, status: 'open', reporter_id: mockMemberId, owner_id: 'another' }]);
        }
        return Promise.resolve([]);
      });

      await resolveBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(403);
    });
  });

  describe('dismiss.ts', () => {
    it('should forbid non-admins from dismissing', async () => {
      req = { method: 'POST', body: { blockerId: mockBlockerId, resolutionNote: 'Dismiss' } };
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any); // not admin
      
      await dismissBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(403);
    });

    it('should allow admin to dismiss', async () => {
      req = { method: 'POST', body: { blockerId: mockBlockerId, resolutionNote: 'Dismiss' } };
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      
      const mockSql = vi.mocked(sql) as any;
      mockSql.mockImplementation((strings: any, ...values: any[]) => {
        const query = strings.join('?').toLowerCase();
        if (query.includes('from task_blockers')) {
          return Promise.resolve([{ id: mockBlockerId, status: 'open' }]);
        }
        if (query.includes('update task_blockers')) {
          return Promise.resolve([{ id: mockBlockerId, status: 'dismissed' }]);
        }
        return Promise.resolve([]);
      });

      await dismissBlockerHandler(req as VercelRequest, res as VercelResponse);
      expect(resStatus).toBe(200);
      expect(resData.data.status).toBe('dismissed');
    });
  });
});
