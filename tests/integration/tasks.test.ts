import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSession } from '../../api/_shared/auth.js';
import { sql } from '../../api/_shared/db.js';

import createTask from '../../api/tasks/create.js';
import listTasks from '../../api/tasks/list.js';
import detailTask from '../../api/tasks/detail.js';
import updateTask from '../../api/tasks/update.js';
import archiveTask from '../../api/tasks/archive.js';

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

describe('Tasks API Integration Tests', () => {
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

  describe('POST /api/tasks/create', () => {
    beforeEach(() => {
      req.method = 'POST';
    });

    it('should return 403 if user is not admin', async () => {
      vi.mocked(getSession).mockResolvedValue(mockMemberSession as any);

      await createTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Forbidden' });
    });

    it('should return 400 for invalid body', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      req.body = {}; // missing required fields

      await createTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Invalid Request' }));
    });

    it('should create a task successfully as admin', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      req.body = {
        projectId: '00000000-0000-0000-0000-000000000001',
        title: 'Task 1',
        status: 'todo',
        priority: 'high',
        ownerId: '00000000-0000-0000-0000-000000000002',
      };

      // Mock SQL responses for create task
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim(); 
        // Check if project exists and not archived
        if (query.includes('FROM projects WHERE id =')) {
          return [{ status: 'active', archived_at: null }];
        }
        // Check if owner is active member
        if (query.includes('FROM project_members pm') && query.includes('pm.user_id =')) {
          return [{ id: 'pm1' }];
        }
        // Insert Task
        if (query.includes('INSERT INTO tasks')) {
          return [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' }];
        }
        return [];
      });

      await createTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Tạo nhiệm vụ thành công.', taskId: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' });
    });

    it('should create a subtask under the selected project', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      req.body = {
        projectId: '00000000-0000-0000-0000-000000000001',
        parentId: 'task-1',
        title: 'Subtask 1',
        status: 'todo',
        priority: 'medium',
      };

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim();
        if (query.includes('FROM projects WHERE id =')) {
          return [{ status: 'active', archived_at: null, manager_id: mockAdminSession.user.id }];
        }
        if (query.includes('FROM tasks') && query.includes('WHERE id =')) {
          return [{ id: 'task-1', project_id: '00000000-0000-0000-0000-000000000001', parent_id: null, archived_at: null }];
        }
        if (query.includes('INSERT INTO tasks')) {
          return [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' }];
        }
        return [];
      });

      await createTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ taskId: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' }));
    });

    it('should reject a subtask when parent task belongs to another project', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      req.body = {
        projectId: '00000000-0000-0000-0000-000000000001',
        parentId: 'task-1',
        title: 'Wrong Project Subtask',
        status: 'todo',
        priority: 'medium',
      };

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim();
        if (query.includes('FROM projects WHERE id =')) {
          return [{ status: 'active', archived_at: null, manager_id: mockAdminSession.user.id }];
        }
        if (query.includes('FROM tasks') && query.includes('WHERE id =')) {
          return [{ id: 'task-1', project_id: '00000000-0000-0000-0000-000000000099', parent_id: null, archived_at: null }];
        }
        return [];
      });

      await createTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Task nho phai thuoc cung du an voi task cha.' });
    });
  });

  describe('GET /api/tasks/list', () => {
    beforeEach(() => {
      req.method = 'GET';
      req.query = { projectId: '37b98f24-2c35-4e3a-9694-8178d4615ec6' };
    });

    it('should list tasks for admin', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      
      // We must handle the query mocking
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        // sql is also used as a template literal tag for appending queries.
        // It's tricky because the mockSql itself might be passed as an array if not handled.
        // But let's assume it works or we just return an array.
        // Actually `countQuery` returns `[{ total: 1 }]` and `dataQuery` returns `[{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' }]`
        // Wait, the API awaits `countQuery` and `dataQuery`.
        // Let's just make `sql` return a generic promise resolving to our dummy data.
        // We can track the number of calls.
        const isCount = strings[0] && strings[0].includes('COUNT');
        if (isCount) return [{ total: '1' }];
        
        return [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b', title: 'Task 1' }];
      });

      await listTasks(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ tasks: [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b', title: 'Task 1' }], total: 1 });
    });
  });

  describe('GET /api/tasks/detail', () => {
    beforeEach(() => {
      req.method = 'GET';
      req.query = { taskId: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' };
    });

    it('should return task detail', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?');
        if (query.includes('FROM tasks')) {
          return [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b', title: 'Task 1', projectId: '37b98f24-2c35-4e3a-9694-8178d4615ec6' }];
        }
        if (query.includes('FROM task_members tm')) {
          return [{ id: 'tm1', userId: '12a95c47-3a1b-4d43-8557-0a2b534b8c6e', assignmentRole: 'owner' }];
        }
        return [];
      });

      await detailTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ task: expect.any(Object), members: expect.any(Array) }));
    });
  });

  describe('POST /api/tasks/update', () => {
    beforeEach(() => {
      req.method = 'POST';
    });

    it('should update a task', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      req.query = { taskId: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' };
      req.body = {
        title: 'Task 1 updated',
        status: 'todo',
        priority: 'high',
        ownerId: '00000000-0000-0000-0000-000000000002',
        percentComplete: 0,
        version: 1
      };

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim(); 
        if (query.includes('FROM tasks')) {
          return [{ id: 'task1', title: 'Task 1', projectId: 'proj1', version: 1, status: 'active', project_status: 'active' }];
        }
        if (query.includes('FROM task_members')) {
          return [{ id: 'tm1', userId: 'user1', assignmentRole: 'owner' }];
        }
        if (query.includes('FROM task_blockers')) return [];
        if (query.includes('FROM activity_logs')) return [];
        if (query.includes('UPDATE tasks')) {
          return [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' }];
        }
        return [];
      });

      await updateTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Task updated successfully' }));
    });
    
    it('should return 409 on version conflict', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      req.query = { taskId: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' };
      req.body = {
        title: 'Task 1 updated',
        status: 'todo',
        priority: 'high',
        ownerId: '00000000-0000-0000-0000-000000000002',
        percentComplete: 0,
        version: 1 // request version
      };

      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?');
        if (query.includes('FROM tasks')) {
          return [{ id: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b', version: 2, archived_at: null }]; // db version is higher
        }
        return [];
      });

      await updateTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Conflict: Dữ liệu đã bị thay đổi bởi người khác.' }));
    });
  });

  describe('POST /api/tasks/archive', () => {
    beforeEach(() => {
      req.method = 'POST';
      req.query = { taskId: '8f8a1c6a-4d2b-4c5e-8b6a-9f5a4e3d2c1b' };
    });

    it('should archive a task as admin', async () => {
      vi.mocked(getSession).mockResolvedValue(mockAdminSession as any);
      
      vi.mocked(sql).mockImplementation(async (strings: any, ...values: any[]) => {
        const query = strings.join('?').trim(); 
        if (query.includes('FROM tasks')) {
          return [{ id: 'task1', version: 1, archived_at: null }];
        }
        return [];
      });

      await archiveTask(req as VercelRequest, res as VercelResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: 'Lưu trữ nhiệm vụ thành công.' }));
    });
  });
});
