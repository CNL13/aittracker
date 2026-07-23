import { describe, it, expect } from 'vitest';
import { determineMemberColor, evaluateTaskFlags } from '@ait/domain';
import { Task } from '@ait/contracts';

describe('Domain Business Logic Tests', () => {
  describe('determineMemberColor', () => {
    it('should return red if there is an overdue task', () => {
      const color = determineMemberColor({
        hasOverdueTask: true,
        hasOpenBlocker: false,
        hasDueSoonTask: true,
        hasPendingHelpRequest: false,
        checkInStatus: 'submitted_on_time',
      });
      expect(color).toBe('red');
    });

    it('should return red if there is an open blocker', () => {
      const color = determineMemberColor({
        hasOverdueTask: false,
        hasOpenBlocker: true,
        hasDueSoonTask: false,
        hasPendingHelpRequest: false,
        checkInStatus: 'submitted_on_time',
      });
      expect(color).toBe('red');
    });

    it('should return yellow if there is a due soon task but no red conditions', () => {
      const color = determineMemberColor({
        hasOverdueTask: false,
        hasOpenBlocker: false,
        hasDueSoonTask: true,
        hasPendingHelpRequest: false,
        checkInStatus: 'submitted_on_time',
      });
      expect(color).toBe('yellow');
    });

    it('should return grey if check-in is missing and no red/yellow conditions exist', () => {
      const color = determineMemberColor({
        hasOverdueTask: false,
        hasOpenBlocker: false,
        hasDueSoonTask: false,
        hasPendingHelpRequest: false,
        checkInStatus: 'missing',
      });
      expect(color).toBe('grey');
    });

    it('should return green if checked in on time with no flags', () => {
      const color = determineMemberColor({
        hasOverdueTask: false,
        hasOpenBlocker: false,
        hasDueSoonTask: false,
        hasPendingHelpRequest: false,
        checkInStatus: 'submitted_on_time',
      });
      expect(color).toBe('green');
    });

    it('should return none if check-in is exempt or not required', () => {
      const color1 = determineMemberColor({
        hasOverdueTask: false,
        hasOpenBlocker: false,
        hasDueSoonTask: false,
        hasPendingHelpRequest: false,
        checkInStatus: 'exempt',
      });
      expect(color1).toBe('none');

      const color2 = determineMemberColor({
        hasOverdueTask: false,
        hasOpenBlocker: false,
        hasDueSoonTask: false,
        hasPendingHelpRequest: false,
        checkInStatus: 'not_required',
      });
      expect(color2).toBe('none');
    });
  });

  describe('evaluateTaskFlags', () => {
    const mockTask: Task = {
      id: 'task-1',
      projectId: 'proj-1',
      title: 'Mock Task',
      description: 'Test description',
      status: 'in_progress',
      priority: 'medium',
      ownerId: 'owner-1',
      percentComplete: 50,
      startDate: '2026-07-15',
      dueDate: '2026-07-20',
      completedAt: null,
      reportRequired: true,
      version: 0,
      createdAt: '2026-07-15T00:00:00Z',
      updatedAt: '2026-07-15T00:00:00Z',
    };

    it('should return overdue if dueDate is in the past', () => {
      const flags = evaluateTaskFlags(
        { ...mockTask, dueDate: '2026-07-10' },
        false,
        '2026-07-17',
      );
      expect(flags.isOverdue).toBe(true);
      expect(flags.isDueSoon).toBe(false);
    });

    it('should return dueSoon if dueDate is within 2 days', () => {
      const flags = evaluateTaskFlags(
        { ...mockTask, dueDate: '2026-07-19' },
        false,
        '2026-07-17',
      );
      expect(flags.isOverdue).toBe(false);
      expect(flags.isDueSoon).toBe(true);
    });

    it('should return blocked if hasOpenBlocker is true', () => {
      const flags = evaluateTaskFlags(mockTask, true, '2026-07-17');
      expect(flags.isBlocked).toBe(true);
    });

    it('should not be overdue or dueSoon if status is done', () => {
      const flags = evaluateTaskFlags(
        { ...mockTask, status: 'done', dueDate: '2026-07-10' },
        true,
        '2026-07-17',
      );
      expect(flags.isOverdue).toBe(false);
      expect(flags.isDueSoon).toBe(false);
      expect(flags.isBlocked).toBe(false);
    });
  });
});
