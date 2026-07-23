import { describe, it, expect, beforeAll, vi } from 'vitest';
import createAbsenceHandler from '../../api/absences/create';
import listAbsenceHandler from '../../api/absences/list';
import deleteAbsenceHandler from '../../api/absences/delete';
import createNwdHandler from '../../api/calendar/non-working-days/create';
import listNwdHandler from '../../api/calendar/non-working-days/list';
import deleteNwdHandler from '../../api/calendar/non-working-days/delete';

vi.mock('../../api/_shared/auth.js', () => ({
  getSession: vi.fn(),
}));

const mockSql = vi.fn() as any;
mockSql.begin = vi.fn();
vi.mock('../../api/_shared/db.js', () => {
  const sql = vi.fn() as any;
  sql.begin = vi.fn(async (cb: any) => { await cb(sql); });
  return { sql };
});

import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';

describe('Absence & Non-Working Days API', () => {
  const adminSession = { user: { id: '123e4567-e89b-12d3-a456-426614174001', role: 'admin' } };
  const memberSession = { user: { id: '123e4567-e89b-12d3-a456-426614174000', role: 'member' } };

  beforeAll(() => {
    (sql as any).mockResolvedValue([{ id: '123e4567-e89b-12d3-a456-426614174002', work_date: '2026-08-01', user_id: '123e4567-e89b-12d3-a456-426614174000', count: 1 }]);
  });

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

  it('should allow admin to create a non-working day', async () => {
    (getSession as any).mockResolvedValue(adminSession);
    const req = mockRequest('POST', { workDate: '2026-08-01', name: 'Test Holiday' });
    const res = mockResponse();

    await createNwdHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should list non-working days', async () => {
    (getSession as any).mockResolvedValue(memberSession);
    const req = mockRequest('GET', null, { startDate: '2026-07-01', endDate: '2026-08-31' });
    const res = mockResponse();

    await listNwdHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should allow admin to create an absence for member', async () => {
    (getSession as any).mockResolvedValue(adminSession);
    const req = mockRequest('POST', {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Vacation',
    });
    const res = mockResponse();

    await createAbsenceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should let members see only their own absences', async () => {
    (getSession as any).mockResolvedValue(memberSession);
    const req = mockRequest('GET');
    const res = mockResponse();

    await listAbsenceHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should allow admin to delete non working day', async () => {
    (getSession as any).mockResolvedValue(adminSession);
    const req = mockRequest('DELETE', null, { workDate: '2026-08-01' });
    const res = mockResponse();

    await deleteNwdHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should allow admin to delete absence', async () => {
    (getSession as any).mockResolvedValue(adminSession);
    const reqDel = mockRequest('DELETE', null, { id: '123e4567-e89b-12d3-a456-426614174002' });
    const resDel = mockResponse();
    await deleteAbsenceHandler(reqDel, resDel);
    expect(resDel.status).toHaveBeenCalledWith(200);
  });
});

