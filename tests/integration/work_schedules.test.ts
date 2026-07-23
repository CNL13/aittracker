import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';

import listWorkSchedules from '../../api/work-schedules/list.js';
import upsertWorkSchedule from '../../api/work-schedules/upsert.js';
import deleteWorkSchedule from '../../api/work-schedules/delete.js';
import exportWorkSchedules from '../../api/work-schedules/export.js';

vi.mock('../../api/_shared/auth.js', () => ({
  getSession: vi.fn(),
}));

vi.mock('../../api/_shared/db.js', () => {
  const mockSql = vi.fn() as any;
  mockSql.begin = vi.fn(async (cb: any) => cb(mockSql));
  return { sql: mockSql };
});

const adminSession = {
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'admin',
    username: 'admin',
    fullName: 'Admin',
    email: null,
    status: 'active',
    mustChangePassword: false,
  },
};

const memberSession = {
  user: {
    id: '00000000-0000-0000-0000-000000000002',
    role: 'member',
    username: 'member',
    fullName: 'Member',
    email: null,
    status: 'active',
    mustChangePassword: false,
  },
};

function mockRequest(method: string, query: any = {}, body: any = {}): VercelRequest {
  return {
    method,
    query,
    body,
    headers: {
      host: '127.0.0.1:3001',
      origin: 'http://127.0.0.1:5174',
    },
  } as unknown as VercelRequest;
}

function mockResponse(): VercelResponse & { body?: any; headersMap: Record<string, string> } {
  const res: any = { headersMap: {} };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.send = vi.fn((payload) => {
    res.body = payload;
    return res;
  });
  res.setHeader = vi.fn((name, value) => {
    res.headersMap[name] = value;
  });
  return res;
}

function sqlText(strings: any) {
  return Array.isArray(strings) ? strings.join(' ') : String(strings);
}

describe('Work schedule API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists people, schedule entries and holidays for a valid range', async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as any);
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const query = sqlText(strings);
      if (query.includes('FROM users')) {
        return [
          {
            id: memberSession.user.id,
            username: 'member',
            full_name: 'Nguyễn Văn A',
            email: 'a@example.com',
            role: 'member',
            status: 'active',
            avatar_url: null,
            department: 'Kỹ thuật',
            position: 'Nhân sự',
          },
        ];
      }
      if (query.includes('FROM work_schedules')) {
        return [
          {
            id: 'schedule-1',
            user_id: memberSession.user.id,
            username: 'member',
            full_name: 'Nguyễn Văn A',
            department: 'Kỹ thuật',
            position: 'Nhân sự',
            work_date: '2026-07-18',
            shift: 'morning',
            custom_start: null,
            custom_end: null,
            updated_at: '2026-07-18T01:00:00Z',
          },
        ];
      }
      if (query.includes('FROM non_working_days')) {
        return [{ id: 'holiday-1', work_date: '2026-07-20', name: 'Ngày nghỉ thử nghiệm', created_by: adminSession.user.id, created_at: '2026-07-18T01:00:00Z' }];
      }
      return [];
    });

    const req = mockRequest('GET', { startDate: '2026-07-13', endDate: '2026-07-19' });
    const res = mockResponse();

    await listWorkSchedules(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.entries[0]).toMatchObject({ userId: memberSession.user.id, shift: 'morning' });
  });

  it('rejects ranges before 2025', async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as any);

    const req = mockRequest('GET', { startDate: '2024-12-30', endDate: '2025-01-05' });
    const res = mockResponse();

    await listWorkSchedules(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error).toContain('2025');
  });

  it('blocks admins from saving a custom shift for another active user', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as any);

    const req = mockRequest('POST', {}, {
      userId: memberSession.user.id,
      workDate: '2026-07-18',
      shift: 'custom',
      customStart: '09:00',
      customEnd: '12:00',
    });
    const res = mockResponse();

    await upsertWorkSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks members from saving another person schedule', async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as any);

    const req = mockRequest('POST', {}, {
      userId: adminSession.user.id,
      workDate: '2026-07-18',
      shift: 'full',
    });
    const res = mockResponse();

    await upsertWorkSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks members from deleting another person schedule', async () => {
    vi.mocked(getSession).mockResolvedValue(memberSession as any);

    const req = mockRequest('DELETE', { userId: adminSession.user.id, workDate: '2026-07-18' });
    const res = mockResponse();

    await deleteWorkSchedule(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('exports a monthly Excel file and marks holidays', async () => {
    vi.mocked(getSession).mockResolvedValue(adminSession as any);
    vi.mocked(sql).mockImplementation(async (strings: any) => {
      const query = sqlText(strings);
      if (query.includes('FROM users')) {
        return [{ id: memberSession.user.id, username: 'member', full_name: 'Nguyễn Văn A', position: 'Nhân sự', department: 'Kỹ thuật' }];
      }
      if (query.includes('FROM work_schedules')) {
        return [{ user_id: memberSession.user.id, work_date: '2026-07-18', shift: 'online', custom_start: null, custom_end: null }];
      }
      if (query.includes('FROM non_working_days')) {
        return [{ work_date: '2026-07-18', name: 'Ngày nghỉ thử nghiệm' }];
      }
      return [];
    });

    const req = mockRequest('GET', { month: '2026-07' });
    const res = mockResponse();

    await exportWorkSchedules(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.headersMap['Content-Type']).toContain('application/vnd.ms-excel');
    expect(String(res.body)).toContain('Ngày nghỉ thử nghiệm');
    expect(String(res.body)).toContain('Làm ngày lễ');
  });
});
