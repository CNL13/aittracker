import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

// In-memory Database representations replicating PostgreSQL schemas and constraints
// defined in supabase/migrations/00000000000000_init.sql

interface User {
  id: string;
  username: string;
  role: 'admin' | 'member';
  status: 'active' | 'locked' | 'inactive';
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  status: 'todo' | 'in_progress' | 'waiting' | 'done';
  percentComplete: number;
  version: number;
  completedAt: Date | null;
  archivedAt: Date | null;
}

interface TaskMember {
  id: string;
  taskId: string;
  userId: string;
  assignmentRole: 'owner' | 'collaborator' | 'reviewer';
  removedAt: Date | null;
}

interface DailyCheckIn {
  id: string;
  userId: string;
  checkinDate: string; // YYYY-MM-DD
  summaryToday?: string;
  noActivity: boolean;
  noActivityReason?: string;
}

class MockDatabase {
  users: User[] = [];
  tasks: Task[] = [];
  taskMembers: TaskMember[] = [];
  dailyCheckins: DailyCheckIn[] = [];

  reset() {
    this.users = [];
    this.tasks = [];
    this.taskMembers = [];
    this.dailyCheckins = [];
  }

  // Constraint: UNIQUE (user_id, checkin_date)
  async createCheckIn(checkin: Omit<DailyCheckIn, 'id'>): Promise<DailyCheckIn> {
    const existing = this.dailyCheckins.find(
      (c) => c.userId === checkin.userId && c.checkinDate === checkin.checkinDate
    );
    if (existing) {
      throw new Error(`UNIQUE constraint violation: Check-in already exists for user ${checkin.userId} on date ${checkin.checkinDate}`);
    }

    if (checkin.noActivity && !checkin.noActivityReason) {
      throw new Error('CHECK constraint violation: no_activity_reason is required when no_activity is true');
    }

    const newCheckin: DailyCheckIn = {
      id: crypto.randomUUID(),
      ...checkin,
    };
    this.dailyCheckins.push(newCheckin);
    return newCheckin;
  }

  // Constraint: UNIQUE (task_id) WHERE assignment_role = 'owner' AND removed_at IS NULL
  // Constraint: UNIQUE (task_id, user_id) WHERE removed_at IS NULL
  async addTaskMember(member: Omit<TaskMember, 'id'>): Promise<TaskMember> {
    if (member.assignmentRole === 'owner' && member.removedAt === null) {
      const activeOwner = this.taskMembers.find(
        (m) => m.taskId === member.taskId && m.assignmentRole === 'owner' && m.removedAt === null
      );
      if (activeOwner) {
        throw new Error(`UNIQUE constraint violation: Task ${member.taskId} already has an active owner`);
      }
    }

    if (member.removedAt === null) {
      const activeMember = this.taskMembers.find(
        (m) => m.taskId === member.taskId && m.userId === member.userId && m.removedAt === null
      );
      if (activeMember) {
        throw new Error(`UNIQUE constraint violation: User ${member.userId} is already an active member of task ${member.taskId}`);
      }
    }

    const newMember: TaskMember = {
      id: crypto.randomUUID(),
      ...member,
    };
    this.taskMembers.push(newMember);
    return newMember;
  }

  // Constraint: Optimistic locking (version must match, increments on update)
  // Constraint: Done task invariants (percent_complete = 100, completed_at IS NOT NULL)
  async updateTask(
    taskId: string,
    expectedVersion: number,
    updates: Partial<Omit<Task, 'id' | 'version'>>
  ): Promise<Task> {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      throw new Error('Task not found');
    }

    const task = this.tasks[index]!;
    if (task.version !== expectedVersion) {
      throw new Error(`OptimisticLockingError: Version mismatch. Expected ${expectedVersion} but DB has ${task.version}`);
    }

    const nextStatus = updates.status !== undefined ? updates.status : task.status;
    const nextPercent = updates.percentComplete !== undefined ? updates.percentComplete : task.percentComplete;
    const nextCompletedAt = updates.completedAt !== undefined ? updates.completedAt : task.completedAt;

    if (nextStatus === 'done') {
      if (nextPercent !== 100) {
        throw new Error('CHECK constraint violation: done tasks must be 100% complete');
      }
      if (nextCompletedAt === null) {
        throw new Error('CHECK constraint violation: done tasks must have completed_at populated');
      }
    } else {
      if (nextCompletedAt !== null) {
        throw new Error('CHECK constraint violation: non-done tasks must not have completed_at populated');
      }
    }

    const updatedTask: Task = {
      ...task,
      ...updates,
      version: task.version + 1, // simulates trigger auto-increment
    };

    this.tasks[index] = updatedTask;
    return updatedTask;
  }
}

describe('Database Invariants Integration Tests', () => {
  const db = new MockDatabase();

  beforeEach(() => {
    db.reset();
  });

  describe('Invariant: Một check-in/user/ngày (One check-in per user per day)', () => {
    it('should successfully save a check-in for different days or different users', async () => {
      const userId1 = crypto.randomUUID();
      const userId2 = crypto.randomUUID();

      // Same user, different days
      await expect(
        db.createCheckIn({
          userId: userId1,
          checkinDate: '2026-07-17',
          noActivity: false,
        })
      ).resolves.toBeDefined();

      await expect(
        db.createCheckIn({
          userId: userId1,
          checkinDate: '2026-07-18',
          noActivity: false,
        })
      ).resolves.toBeDefined();

      // Different user, same day
      await expect(
        db.createCheckIn({
          userId: userId2,
          checkinDate: '2026-07-17',
          noActivity: false,
        })
      ).resolves.toBeDefined();
    });

    it('should reject duplicate check-ins for the same user on the same day', async () => {
      const userId = crypto.randomUUID();
      const date = '2026-07-17';

      await db.createCheckIn({
        userId,
        checkinDate: date,
        noActivity: false,
      });

      await expect(
        db.createCheckIn({
          userId,
          checkinDate: date,
          noActivity: false,
        })
      ).rejects.toThrow(/UNIQUE constraint violation/);
    });

    it('should respect no_activity constraint rules', async () => {
      const userId = crypto.randomUUID();

      await expect(
        db.createCheckIn({
          userId,
          checkinDate: '2026-07-17',
          noActivity: true,
        })
      ).rejects.toThrow(/no_activity_reason is required/);
    });
  });

  describe('Invariant: Đúng một owner active/task (Exactly one active owner per task)', () => {
    it('should allow adding collaborators and one active owner', async () => {
      const taskId = crypto.randomUUID();
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();
      const user3 = crypto.randomUUID();

      // Add owner
      await expect(
        db.addTaskMember({
          taskId,
          userId: user1,
          assignmentRole: 'owner',
          removedAt: null,
        })
      ).resolves.toBeDefined();

      // Add collaborator
      await expect(
        db.addTaskMember({
          taskId,
          userId: user2,
          assignmentRole: 'collaborator',
          removedAt: null,
        })
      ).resolves.toBeDefined();

      // Add reviewer
      await expect(
        db.addTaskMember({
          taskId,
          userId: user3,
          assignmentRole: 'reviewer',
          removedAt: null,
        })
      ).resolves.toBeDefined();
    });

    it('should reject adding a second active owner to the same task', async () => {
      const taskId = crypto.randomUUID();
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();

      // First owner
      await db.addTaskMember({
        taskId,
        userId: user1,
        assignmentRole: 'owner',
        removedAt: null,
      });

      // Second active owner must fail
      await expect(
        db.addTaskMember({
          taskId,
          userId: user2,
          assignmentRole: 'owner',
          removedAt: null,
        })
      ).rejects.toThrow(/already has an active owner/);
    });

    it('should allow a new owner if the previous owner is removed (soft-deleted)', async () => {
      const taskId = crypto.randomUUID();
      const user1 = crypto.randomUUID();
      const user2 = crypto.randomUUID();

      // First owner is removed
      await db.addTaskMember({
        taskId,
        userId: user1,
        assignmentRole: 'owner',
        removedAt: new Date(),
      });

      // Second owner is active
      await expect(
        db.addTaskMember({
          taskId,
          userId: user2,
          assignmentRole: 'owner',
          removedAt: null,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('Invariant: Optimistic locking versioning', () => {
    it('should successfully mutate a task and increment version when the expected version matches', async () => {
      const taskId = crypto.randomUUID();
      db.tasks.push({
        id: taskId,
        projectId: crypto.randomUUID(),
        title: 'Initial Task',
        status: 'todo',
        percentComplete: 0,
        version: 1,
        completedAt: null,
        archivedAt: null,
      });

      // Update 1
      const taskV2 = await db.updateTask(taskId, 1, { title: 'Updated Title' });
      expect(taskV2.version).toBe(2);
      expect(taskV2.title).toBe('Updated Title');

      // Update 2
      const taskV3 = await db.updateTask(taskId, 2, { percentComplete: 50 });
      expect(taskV3.version).toBe(3);
      expect(taskV3.percentComplete).toBe(50);
    });

    it('should throw an error and prevent mutation when the version is mismatched', async () => {
      const taskId = crypto.randomUUID();
      db.tasks.push({
        id: taskId,
        projectId: crypto.randomUUID(),
        title: 'Initial Task',
        status: 'todo',
        percentComplete: 0,
        version: 1,
        completedAt: null,
        archivedAt: null,
      });

      // Mismatched expected version (expects 2 but DB is 1)
      await expect(
        db.updateTask(taskId, 2, { title: 'Updated Title' })
      ).rejects.toThrow(/OptimisticLockingError/);

      // Verify task in DB remains unchanged
      expect(db.tasks[0]?.version).toBe(1);
      expect(db.tasks[0]?.title).toBe('Initial Task');
    });

    it('should enforce completed constraints for done tasks', async () => {
      const taskId = crypto.randomUUID();
      db.tasks.push({
        id: taskId,
        projectId: crypto.randomUUID(),
        title: 'Task',
        status: 'todo',
        percentComplete: 0,
        version: 1,
        completedAt: null,
        archivedAt: null,
      });

      // status = done but completed_at is null -> reject
      await expect(
        db.updateTask(taskId, 1, { status: 'done', percentComplete: 100 })
      ).rejects.toThrow(/done tasks must have completed_at populated/);

      // status = done but percent_complete !== 100 -> reject
      await expect(
        db.updateTask(taskId, 1, { status: 'done', completedAt: new Date() })
      ).rejects.toThrow(/done tasks must be 100% complete/);

      // Valid done transition -> succeed
      await expect(
        db.updateTask(taskId, 1, { status: 'done', percentComplete: 100, completedAt: new Date() })
      ).resolves.toBeDefined();
    });
  });
});
