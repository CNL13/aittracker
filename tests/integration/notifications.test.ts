import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';
import cronHandler from '../../api/notifications/cron.js';
import emailLogHandler from '../../api/admin/email-log.js';
import resendHandler from '../../api/admin/email-log/resend.js';

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

describe('Notifications & Cron Integration Tests', () => {
  let req: Partial<VercelRequest>;
  let res: Partial<VercelResponse>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    req = {
      method: 'POST',
      query: { secret: 'dev_secret' },
      body: {},
      headers: {},
    };
    res = {
      status: statusMock,
      setHeader: vi.fn(),
    };
    process.env.CRON_SECRET = 'dev_secret';
  });

  describe('Cron Endpoint', () => {
    it('should return 401 if secret is incorrect', async () => {
      req.query = { secret: 'wrong_secret' };
      await cronHandler(req as VercelRequest, res as VercelResponse);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should run successfully and return 200 on working day', async () => {
      // Mock getTzDate to be a Monday (e.g. 2026-07-20 is Monday)
      req.query = { secret: 'dev_secret', date: '2026-07-20' };

      // Mock database calls inside cron:
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim();
        if (query.includes('COUNT')) return [{ count: 0 }];
        if (query.includes('FROM non_working_days')) return [];
        if (query.includes('FROM users WHERE status = \'active\'')) {
          return [
            { id: 'u1', username: 'user1', full_name: 'User One', email: 'user1@example.com' },
          ];
        }
        if (query.includes('FROM users WHERE role = \'admin\'')) {
          return [
            { id: 'admin1', username: 'admin1', full_name: 'Admin One', email: 'admin1@example.com' },
          ];
        }
        if (query.includes('FROM daily_checkins')) return [];
        if (query.includes('FROM tasks')) return [];
        if (query.includes('FROM notifications_log')) return [];
        return [];
      });

      await cronHandler(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cron job executed successfully.' }));
    });

    it('should skip on non-working days', async () => {
      req.query = { secret: 'dev_secret', date: '2026-07-19' }; // Sunday

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        return []; // Not in non_working_days
      });

      await cronHandler(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Skipped: Not a working day.' }));
    });
  });

  describe('Email Log Endpoint', () => {
    it('should return 403 for non-admin users', async () => {
      req.method = 'GET';
      vi.mocked(getSession).mockResolvedValue({
        user: { id: 'user1', role: 'member' },
      } as any);

      await emailLogHandler(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should return list of logs for admin users', async () => {
      req.method = 'GET';
      vi.mocked(getSession).mockResolvedValue({
        user: { id: 'admin1', role: 'admin' },
      } as any);

      const mockLogs = [
        { id: 'log1', recipientUserId: 'u1', status: 'sent' },
      ];

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim();
        if (query.includes('COUNT')) return [{ count: 1 }];
        return mockLogs;
      });

      await emailLogHandler(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        data: mockLogs,
        total: 1,
      });
    });
  });

  describe('Resend Email Endpoint', () => {
    it('should allow admin to resend a failed notification', async () => {
      req.method = 'POST';
      req.body = { notificationId: 'log1' };
      vi.mocked(getSession).mockResolvedValue({
        user: { id: 'admin1', role: 'admin' },
      } as any);

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim();
        if (query.includes('FROM notifications_log')) {
          if (query.includes('WHERE id =')) {
            return [{
              id: 'log1',
              recipient_user_id: 'u1',
              notification_type: 'member_digest',
              dedupe_key: 'member_digest_u1_2026-07-20',
              status: 'failed',
            }];
          }
          if (query.includes('WHERE dedupe_key =')) {
            return []; // No dedupe match for new send
          }
        }
        if (query.includes('FROM users')) {
          return [{ id: 'u1', username: 'user1', full_name: 'User One', email: 'user1@example.com' }];
        }
        if (query.includes('INSERT INTO notifications_log')) {
          return [{ id: 'new-log-id' }];
        }
        return [];
      });

      await resendHandler(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'sent' }) }));
    });
  });
});
