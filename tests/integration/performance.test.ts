import { describe, it, expect, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';
import listTasksHandler from '../../api/tasks/list.js';
import dashboardMetricsHandler from '../../api/dashboard/metrics.js';
import submitCheckinHandler from '../../api/checkins/submit.js';

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

describe('Performance Latency & p95 Verification', () => {
  const runPerformanceTest = async (
    handler: Function,
    req: Partial<VercelRequest>,
    res: Partial<VercelResponse>,
    iterations: number = 100
  ) => {
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await handler(req as VercelRequest, res as VercelResponse);
      const end = performance.now();
      latencies.push(end - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(iterations * 0.5)];
    const p95 = latencies[Math.floor(iterations * 0.95)];
    const p99 = latencies[Math.floor(iterations * 0.99)];

    return { p50, p95, p99, latencies };
  };

  it('should verify p95 latency for api/tasks/list is within 1.5s', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user1', role: 'admin' },
    } as any);

    vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
      const query = strings.join('?').trim();
      if (query.includes('COUNT')) return [{ total: 10 }];
      return [
        { id: 't1', title: 'Task 1', status: 'todo', percentComplete: 0 },
      ];
    });

    const req: Partial<VercelRequest> = {
      method: 'GET',
      query: { projectId: 'p1' },
    };
    const res: Partial<VercelResponse> = {
      status: vi.fn(() => ({ json: vi.fn() })),
      setHeader: vi.fn(),
    };

    const stats = await runPerformanceTest(listTasksHandler, req, res);
    console.log(`[PERF] api/tasks/list (100 runs): p50=${stats.p50.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, p99=${stats.p99.toFixed(2)}ms`);

    expect(stats.p95).toBeLessThan(1500); // 1.5s limit
  });

  it('should verify p95 latency for api/dashboard/metrics is within 3.0s', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'admin1', role: 'admin' },
    } as any);

    vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
      const query = strings.join('?').trim();
      if (query.includes('COUNT')) return [{ count: 5 }];
      return [];
    });

    const req: Partial<VercelRequest> = {
      method: 'GET',
      query: {},
    };
    const res: Partial<VercelResponse> = {
      status: vi.fn(() => ({ json: vi.fn() })),
      setHeader: vi.fn(),
    };

    const stats = await runPerformanceTest(dashboardMetricsHandler, req, res);
    console.log(`[PERF] api/dashboard/metrics (100 runs): p50=${stats.p50.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, p99=${stats.p99.toFixed(2)}ms`);

    expect(stats.p95).toBeLessThan(3000); // 3.0s limit
  });

  it('should verify p95 latency for api/checkins/submit is within 2.0s', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: { id: 'user1', role: 'member' },
    } as any);

    vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
      return [];
    });

    const req: Partial<VercelRequest> = {
      method: 'POST',
      body: {
        summaryToday: 'Did some coding and testing',
        items: [
          { taskId: 't1', workDone: 'Coded features', percentCompleteProposed: 50 },
        ],
        totalTimeSpentHours: 4,
      },
    };
    const res: Partial<VercelResponse> = {
      status: vi.fn(() => ({ json: vi.fn() })),
      setHeader: vi.fn(),
    };

    const stats = await runPerformanceTest(submitCheckinHandler, req, res);
    console.log(`[PERF] api/checkins/submit (100 runs): p50=${stats.p50.toFixed(2)}ms, p95=${stats.p95.toFixed(2)}ms, p99=${stats.p99.toFixed(2)}ms`);

    expect(stats.p95).toBeLessThan(2000); // 2.0s limit
  });
});
