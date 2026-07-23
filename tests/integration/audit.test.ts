import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';
import auditHandler from '../../api/admin/audit.js';

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

describe('Audit Log Integration Tests', () => {
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
      headers: {},
    };
    res = {
      status: statusMock,
      setHeader: vi.fn(),
    };
  });

  it('should return 403 for non-admin users', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'member1', role: 'member' },
    } as any);

    await auditHandler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('should return 401 if user session is invalid', async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    await auditHandler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('should allow admin to retrieve activity logs', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin' },
    } as any);

    const mockLogs = [
      {
        id: 'log-1',
        actorId: 'admin-1',
        actorType: 'user',
        entityType: 'user',
        entityId: 'user-2',
        action: 'create_user',
        oldValues: null,
        newValues: { username: 'newuser' },
        createdAt: '2026-07-20T10:00:00Z',
        actorUsername: 'admin',
        actorFullName: 'Admin User',
      },
    ];

    vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
      const query = strings.join('?').trim();
      if (query.includes('COUNT')) {
        return [{ count: 1 }];
      }
      return mockLogs;
    });

    await auditHandler(req as VercelRequest, res as VercelResponse);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            action: 'create_user',
          }),
        ]),
        total: 1,
      })
    );
  });
});
