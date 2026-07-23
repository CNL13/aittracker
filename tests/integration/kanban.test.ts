import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';
import listTasks from '../../api/tasks/list.js';

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

describe('Kanban Integration Tests', () => {
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
      query: { projectId: '00000000-0000-0000-0000-000000000001' },
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

  it('should query tasks and return openBlockersCount and ownerId', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);

    const mockTasks = [
      {
        id: 'task-1',
        projectId: 'proj-1',
        title: 'Task 1',
        status: 'todo',
        openBlockersCount: 1,
        ownerId: 'owner-1',
      },
    ];

    vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
      const query = strings.join('?').trim();
      if (query.includes('COUNT(DISTINCT t.id)')) {
        return [{ total: 1 }];
      }
      return mockTasks;
    });

    await listTasks(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      tasks: mockTasks,
      total: 1,
    });
  });

  it('should support the blocked status filter', async () => {
    vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
    req.query = {
      projectId: '00000000-0000-0000-0000-000000000001',
      status: 'blocked',
    };

    let ranBlockedQuery = false;
    vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
      const query = strings.join('?').trim();
      if (query.includes('EXISTS (SELECT 1 FROM task_blockers')) {
        ranBlockedQuery = true;
      }
      if (query.includes('COUNT(DISTINCT t.id)')) {
        return [{ total: 0 }];
      }
      return [];
    });

    await listTasks(req as VercelRequest, res as VercelResponse);

    expect(ranBlockedQuery).toBe(true);
    expect(statusMock).toHaveBeenCalledWith(200);
  });
});
