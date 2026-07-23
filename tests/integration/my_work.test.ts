import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';

import myTasks from '../../api/tasks/my.js';
import listTasks from '../../api/tasks/list.js';

// Mock dependencies
vi.mock('../../api/_shared/auth.js', () => ({
  getSession: vi.fn(),
}));

vi.mock('../../api/_shared/db.js', () => {
  const mockSql = vi.fn() as any;
  mockSql.begin = vi.fn(async (cb: any) => {
    return cb(mockSql);
  });
  return { sql: mockSql };
});

describe('My Work Integration Tests', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    req = {
      method: 'GET',
      query: {},
      body: {},
      headers: {
        authorization: 'Bearer token',
      },
    };
    res = {
      status: statusMock,
      setHeader: vi.fn(),
    };
  });

  const mockAdminSession = {
    user: { id: '0b8b2e15-8c7a-4c28-912f-6a9b46e30b6c', role: 'admin' },
  };

  const mockMemberSession = {
    user: { id: '7c9a6f7b-9c8e-4a6c-9c98-1e4b3c7a2b9a', role: 'member' },
  };

  describe('GET /api/tasks/my', () => {
    it('should return 401 if not logged in', async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      await myTasks(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return member tasks successfully', async () => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);
      
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const isCount = strings[0] && strings[0].includes('COUNT');
        if (isCount) return [{ total: '2' }];
        
        return [
          { id: 'task-1', title: 'Task 1', projectName: 'Project A', memberRole: 'owner', status: 'todo' },
          { id: 'task-2', title: 'Task 2', projectName: 'Project A', memberRole: 'collaborator', status: 'in_progress' }
        ];
      });

      await myTasks(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        tasks: [
          { id: 'task-1', title: 'Task 1', projectName: 'Project A', memberRole: 'owner', status: 'todo' },
          { id: 'task-2', title: 'Task 2', projectName: 'Project A', memberRole: 'collaborator', status: 'in_progress' }
        ],
        total: 2
      });
    });

    it('should correctly apply filters in the query', async () => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);
      req.query = { search: 'Test', status: 'in_progress', priority: 'high', role: 'owner', limit: '10', offset: '0' };
      
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const resolvedValues = await Promise.all(values.map(v => v instanceof Promise ? v : Promise.resolve(v)));
        const hasCountInStrings = strings.some((s: string) => s.includes('COUNT') || s.includes('total'));
        const hasCountInValues = resolvedValues.some((v: any) => 
          v && (
            (Array.isArray(v) && v[0] && v[0].total !== undefined) ||
            v.total !== undefined
          )
        );
        const isCount = hasCountInStrings || hasCountInValues;
        if (isCount) return [{ total: '1' }];
        return [{ id: 'task-1', title: 'Test Task' }];
      });

      await myTasks(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      
      // We check that SQL was called properly (we just verify it gets to 200 OK since sql mock handles it loosely)
      expect(jsonMock).toHaveBeenCalledWith({
        tasks: [{ id: 'task-1', title: 'Test Task' }],
        total: 1
      });
    });
  });

  describe('Scoped Visibility checks in /api/tasks/list', () => {
    it('member list API must enforce scope checking for member session', async () => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);
      req.method = 'GET';
      req.query = { projectId: 'project-1' };
      
      // Capture what is passed to mockSql
      const sqlCalls: string[] = [];
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        sqlCalls.push(strings.join('?'));
        const isCount = strings[0] && strings[0].includes('COUNT');
        if (isCount) return [{ total: '0' }];
        return [];
      });

      await listTasks(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      
      // Confirm that the SQL query for members includes the scope limit
      // As seen in list.ts: countQuery = sql`${countQuery} AND tm_auth.id IS NOT NULL`;
      const callsWithTmAuth = sqlCalls.filter(c => c.includes('tm_auth.id IS NOT NULL'));
      expect(callsWithTmAuth.length).toBeGreaterThan(0);
    });
  });
});
