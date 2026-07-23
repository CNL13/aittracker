import { describe, it, expect, beforeEach, vi } from 'vitest';
import submitCheckInHandler from '../../api/checkins/submit';
import contextHandler from '../../api/checkins/context';
import historyHandler from '../../api/checkins/history';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';

vi.mock('../../api/_shared/auth.js', () => ({
  getSession: vi.fn(),
}));

vi.mock('../../api/_shared/db.js', () => {
  const sql = vi.fn() as any;
  sql.begin = vi.fn(async (cb: any) => { await cb(sql); });
  return { sql };
});

describe('Check-ins API', () => {
  const adminSession = { user: { id: 'admin-123', role: 'admin' } };
  const memberSession = { user: { id: 'member-123', role: 'member' } };

  const mockRequest = (method: string, body?: any, query?: any): any => ({
    method,
    body,
    query: query || {},
  });

  const mockResponse = (): any => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn();
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('context: non-working day & absence exemptions correctly detected', async () => {
    (getSession as any).mockResolvedValue(memberSession);
    
    // sql calls in context.ts:
    // 1. active tasks
    // 2. existing checkins
    // 3. items + blockers (if checkin exists)
    // 4. absences
    // 5. non-working days
    (sql as any).mockImplementation((strings: any) => {
      const q = (strings.join ? strings.join(' ') : strings[0] || '').replace(/\s+/g, ' ');
      if (q.includes('tasks t')) return Promise.resolve([{ taskId: 'task-1' }]);
      if (q.includes('daily_checkins')) return Promise.resolve([]); // no checkin today
      if (q.includes('user_absences')) return Promise.resolve([{ id: 'absence-1' }]); // exempt
      if (q.includes('non_working_days')) return Promise.resolve([{ name: 'Holiday' }]); // non working day
      return Promise.resolve([]);
    });

    const req = mockRequest('GET');
    const res = mockResponse();

    await contextHandler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      exempt: true,
      nonWorkingDay: true,
      tasks: [{ taskId: 'task-1' }],
    }));
  });

  it('submit: only one check-in per day per user (editing check-in)', async () => {
    (getSession as any).mockResolvedValue(memberSession);

    // Mock sql to return an existing check-in to trigger the edit logic
    (sql as any).mockImplementation((strings: any) => {
      const q = (strings.join ? strings.join(' ') : strings[0] || '').replace(/\s+/g, ' ');
      if (q.includes('SELECT id FROM daily_checkins')) return Promise.resolve([{ id: 'checkin-1' }]);
      if (q.includes('task_members')) return Promise.resolve([{ assignment_role: 'owner' }]);
      if (q.includes('INSERT INTO daily_checkin_items')) return Promise.resolve([{ id: 'item-1' }]);
      return Promise.resolve([]);
    });

    const req = mockRequest('POST', {
      summaryToday: 'Did some work',
      items: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        workDone: 'Fixed bugs',
        percentCompleteProposed: 50,
      }],
    });
    const res = mockResponse();

    await submitCheckInHandler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    const upsertCheckinsCalls = (sql as any).mock.calls.filter((call: any) => {
      const query = call[0]?.join?.('') || call[0]?.[0] || '';
      return query.includes('INSERT INTO daily_checkins') && query.includes('ON CONFLICT');
    });
    expect(upsertCheckinsCalls.length).toBeGreaterThan(0);
  });

  it('submit: collaborator cannot update main task percent', async () => {
    (getSession as any).mockResolvedValue(memberSession);

    // Mock sql to simulate new checkin, user is collaborator
    (sql as any).mockImplementation((strings: any) => {
      const q = (strings.join ? strings.join(' ') : strings[0] || '').replace(/\s+/g, ' ');
      if (q.includes('SELECT id FROM daily_checkins')) return Promise.resolve([]); // no existing checkin
      if (q.includes('task_members')) return Promise.resolve([{ assignment_role: 'collaborator' }]); // User is collaborator
      if (q.includes('INSERT INTO daily_checkins')) return Promise.resolve([{ id: 'new-checkin-id' }]);
      if (q.includes('INSERT INTO daily_checkin_items')) return Promise.resolve([{ id: 'new-item-id' }]);
      return Promise.resolve([]);
    });

    const req = mockRequest('POST', {
      summaryToday: 'Did some work',
      items: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        workDone: 'Fixed bugs',
        percentCompleteProposed: 100, // Proposed done
      }],
    });
    const res = mockResponse();

    await submitCheckInHandler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    
    // Check that 'UPDATE tasks' was NOT called
    const updateTasksCalls = (sql as any).mock.calls.filter((call: any) => call[0] && call[0][0] && call[0][0].includes('UPDATE tasks'));
    expect(updateTasksCalls.length).toBe(0);
  });

  it('submit: owner can update main task percent', async () => {
    (getSession as any).mockResolvedValue(memberSession);

    // Mock sql to simulate new checkin, user is owner
    (sql as any).mockImplementation((strings: any) => {
      const q = (strings.join ? strings.join(' ') : strings[0] || '').replace(/\s+/g, ' ');
      if (q.includes('SELECT id FROM daily_checkins')) return Promise.resolve([]); // no existing checkin
      if (q.includes('task_members')) return Promise.resolve([{ assignment_role: 'owner' }]); // User is owner
      if (q.includes('INSERT INTO daily_checkins')) return Promise.resolve([{ id: 'new-checkin-id' }]);
      if (q.includes('INSERT INTO daily_checkin_items')) return Promise.resolve([{ id: 'new-item-id' }]);
      return Promise.resolve([]);
    });

    const req = mockRequest('POST', {
      summaryToday: 'Did some work',
      items: [{
        taskId: '123e4567-e89b-12d3-a456-426614174000',
        workDone: 'Fixed bugs',
        percentCompleteProposed: 100, // Proposed done
      }],
    });
    const res = mockResponse();

    await submitCheckInHandler(req, res);
    
    expect(res.status).toHaveBeenCalledWith(200);
    
    // Check that 'UPDATE tasks' WAS called with status = 'done'
    const updateTasksCalls = (sql as any).mock.calls.filter((call: any) => call[0] && call[0][0] && call[0][0].includes('UPDATE tasks'));
    expect(updateTasksCalls.length).toBeGreaterThan(0);
    expect(updateTasksCalls[0][0][0]).toContain('status = \'done\'');
  });

  it('submit: transaction rollback on error', async () => {
    (getSession as any).mockResolvedValue(memberSession);

    // Simulate DB error during transaction
    (sql as any).mockImplementation((strings: any) => {
      const q = (strings.join ? strings.join(' ') : strings[0] || '').replace(/\s+/g, ' ');
      if (q.includes('SELECT id FROM daily_checkins')) {
        return Promise.reject(new Error('DB connection lost'));
      }
      return Promise.resolve([]);
    });

    const req = mockRequest('POST', {
      items: [],
      noActivityReason: 'Sick leave',
    });
    const res = mockResponse();

    await submitCheckInHandler(req, res);
    
    // Expect 500 status because of unhandled DB error
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('history: retrieves check-in history', async () => {
    (getSession as any).mockResolvedValue(adminSession);
    
    (sql as any).mockImplementation((strings: any) => {
      const q = (strings.join ? strings.join(' ') : strings[0] || '').replace(/\s+/g, ' ');
      if (q.includes('SELECT * FROM daily_checkins')) return Promise.resolve([{ id: 'checkin-1', checkin_date: '2026-07-18' }]);
      if (q.includes('daily_checkin_items')) return Promise.resolve([{ taskId: 'task-1' }]);
      return Promise.resolve([]);
    });

    const req = mockRequest('GET', null, { limit: '10' });
    const res = mockResponse();

    await historyHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ id: 'checkin-1' })]),
    }));
  });
});
