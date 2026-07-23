import { describe, it, expect, beforeEach, vi } from 'vitest';
import dashboardHandler from '../../api/dashboard/metrics';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';

vi.mock('../../api/_shared/auth.js', () => ({
  getSession: vi.fn(),
}));

vi.mock('../../api/_shared/db.js', () => {
  const sqlMock = vi.fn();
  return { sql: sqlMock };
});

describe('Dashboard API', () => {
  const adminSession = { user: { id: 'admin-123', role: 'admin' } };
  const memberSession = { user: { id: 'member-123', role: 'member' } };

  const mockRequest = (method: string, query?: any): any => ({
    method,
    query: query || {},
    headers: {},
  });

  const mockResponse = (): any => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn();
    return res;
  };

  const mockSqlByQuery = (resolver: (query: string) => any[]) => {
    vi.mocked(sql).mockImplementation((async (strings: any) => {
      if (!Array.isArray(strings)) {
        return { raw: strings } as any;
      }
      const query = strings.join('?').toLowerCase().replace(/\s+/g, ' ');
      return resolver(query);
    }) as any);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-GET requests', async () => {
    const req = mockRequest('POST');
    const res = mockResponse();

    await dashboardHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(null);
    const req = mockRequest('GET');
    const res = mockResponse();

    await dashboardHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects non-admin requests', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(memberSession as any);
    const req = mockRequest('GET');
    const res = mockResponse();

    await dashboardHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calculates metrics and member check-in details without project filter', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(adminSession as any);
    mockSqlByQuery((q) => {
      if (q.includes('from projects') && q.includes('count(id)')) return [{ count: '5' }];
      if (q.includes('from tasks where') && q.includes("status != 'done'")) return [{ count: '10' }];
      if (q.includes('from task_blockers b')) return [{ count: '3' }];
      if (q.includes('count(distinct a.user_id)')) return [{ count: '2' }];
      if (q.includes('from non_working_days')) return [];
      if (q.includes('group by status')) return [{ status: 'todo', count: '4' }, { status: 'in_progress', count: '6' }];
      if (q.includes('from tasks t') && q.includes('filter')) return [{ overdue: '1', due_soon: '2', no_due_date: '1', blocked: '0' }];
      if (q.includes('from users') && q.includes("where status = 'active'")) {
        return [{ id: 'u1', username: 'user1', full_name: 'User One', role: 'member' }];
      }
      if (q.includes('from daily_checkins')) {
        return [{
          id: 'c1',
          user_id: 'u1',
          summary_today: 'done stuff',
          no_activity: false,
          total_time_spent_hours: null,
          first_submitted_at: '2026-07-20T08:00:00.000Z',
        }];
      }
      if (q.includes('from daily_checkin_items')) return [{ checkin_id: 'c1', count: '2' }];
      if (q.includes('from user_absences')) return [];
      if (q.includes('from task_members tm')) {
        return [{
          user_id: 'u1',
          active_tasks_count: '4',
          required_tasks_count: '4',
          overdue_tasks_count: '0',
          due_soon_tasks_count: '0',
          no_due_date_tasks_count: '0',
          blocked_tasks_count: '0',
        }];
      }
      return [];
    });

    const req = mockRequest('GET', { date: '2026-07-20' });
    const res = mockResponse();

    await dashboardHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.metrics).toEqual(expect.objectContaining({
      totalActiveProjects: 5,
      totalActiveTasks: 10,
      totalOpenBlockers: 3,
      totalExemptMembers: 2,
      taskStatusCounts: expect.objectContaining({ todo: 4, in_progress: 6 }),
      taskFlagCounts: expect.objectContaining({ overdue: 1, dueSoon: 2, noDueDate: 1, blocked: 0 }),
      checkInCounts: expect.objectContaining({ required: 1, submittedOnTime: 1 }),
    }));
    expect(responseData.members[0]).toEqual(expect.objectContaining({
      id: 'u1',
      username: 'user1',
      fullName: 'User One',
      role: 'member',
      statusColor: 'green',
      activeTasksCount: 4,
      openBlockersCount: 0,
      checkinDetails: expect.objectContaining({
        summaryToday: 'done stuff',
        noActivity: false,
        totalTimeSpentHours: null,
        itemsCount: 2,
      }),
    }));
  });

  it('assigns status color according to precedence', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(adminSession as any);
    mockSqlByQuery((q) => {
      if (q.includes('from non_working_days')) return [];
      if (q.includes('group by status')) return [];
      if (q.includes('from tasks t') && q.includes('filter')) return [{ overdue: '0', due_soon: '0', no_due_date: '0', blocked: '0' }];
      if (q.includes('from users') && q.includes("where status = 'active'")) {
        return [
          { id: 'u1', username: 'red_user', full_name: 'Has blockers', role: 'member' },
          { id: 'u2', username: 'green_user', full_name: 'Checked in', role: 'member' },
          { id: 'u3', username: 'blue_user', full_name: 'Exempt', role: 'member' },
          { id: 'u4', username: 'grey_user', full_name: 'Missing', role: 'member' },
        ];
      }
      if (q.includes('from daily_checkins')) {
        return [
          { id: 'c1', user_id: 'u1', summary_today: 'x', no_activity: false, first_submitted_at: '2026-07-20T08:00:00.000Z' },
          { id: 'c2', user_id: 'u2', summary_today: 'y', no_activity: false, first_submitted_at: '2026-07-20T08:00:00.000Z' },
        ];
      }
      if (q.includes('from daily_checkin_items')) return [];
      if (q.includes('from user_absences')) return [{ user_id: 'u3' }];
      if (q.includes('from task_members tm')) {
        return [
          { user_id: 'u1', active_tasks_count: '1', required_tasks_count: '1', overdue_tasks_count: '0', due_soon_tasks_count: '0', no_due_date_tasks_count: '0', blocked_tasks_count: '1' },
          { user_id: 'u2', active_tasks_count: '1', required_tasks_count: '1', overdue_tasks_count: '0', due_soon_tasks_count: '0', no_due_date_tasks_count: '0', blocked_tasks_count: '0' },
          { user_id: 'u3', active_tasks_count: '1', required_tasks_count: '1', overdue_tasks_count: '0', due_soon_tasks_count: '0', no_due_date_tasks_count: '0', blocked_tasks_count: '0' },
          { user_id: 'u4', active_tasks_count: '1', required_tasks_count: '1', overdue_tasks_count: '0', due_soon_tasks_count: '0', no_due_date_tasks_count: '0', blocked_tasks_count: '0' },
        ];
      }
      if (q.includes('count(')) return [{ count: '0' }];
      return [];
    });

    const req = mockRequest('GET', { date: '2026-07-20' });
    const res = mockResponse();

    await dashboardHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const members = res.json.mock.calls[0][0].members;
    expect(members.find((m: any) => m.id === 'u1').statusColor).toBe('red');
    expect(members.find((m: any) => m.id === 'u2').statusColor).toBe('green');
    expect(members.find((m: any) => m.id === 'u3').statusColor).toBe('blue');
    expect(members.find((m: any) => m.id === 'u4').statusColor).toBe('grey');
  });

  it('marks members without required work as not required', async () => {
    vi.mocked(getSession).mockResolvedValueOnce(adminSession as any);
    mockSqlByQuery((q) => {
      if (q.includes('from non_working_days')) return [];
      if (q.includes('group by status')) return [];
      if (q.includes('from tasks t') && q.includes('filter')) return [{ overdue: '0', due_soon: '0', no_due_date: '0', blocked: '0' }];
      if (q.includes('from users') && q.includes("where status = 'active'")) {
        return [{ id: 'u1', username: 'idle_user', full_name: 'Idle', role: 'member' }];
      }
      if (q.includes('from task_members tm')) return [];
      if (q.includes('count(')) return [{ count: '0' }];
      return [];
    });

    const req = mockRequest('GET', { date: '2026-07-20' });
    const res = mockResponse();

    await dashboardHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const member = res.json.mock.calls[0][0].members[0];
    expect(member.checkInStatus).toBe('not_required');
    expect(member.statusColor).toBe('none');
  });
});
