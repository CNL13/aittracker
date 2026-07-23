import { Task, CheckInStatus } from '@ait/contracts';

// Business Rules definitions (e.g. Cutoff times, timezone)
export const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh';
export const CHECKIN_CUTOFF_HOUR = 17;
export const CHECKIN_CUTOFF_MINUTE = 0;

// Member Color status
export type MemberColor = 'red' | 'yellow' | 'grey' | 'green' | 'none';

/**
 * Calculates a task's computed status flags.
 * 'blocked' and 'overdue' are computed, not stored workflow status.
 */
export interface TaskComputedFlags {
  isOverdue: boolean;
  isDueSoon: boolean;
  isBlocked: boolean;
  hasNoDueDate: boolean;
}

/**
 * Evaluates computed flags for a given task.
 * Note: business date is calculated relative to today.
 */
export function evaluateTaskFlags(
  task: Task,
  hasOpenBlocker: boolean,
  currentDateStr: string, // YYYY-MM-DD in Asia/Ho_Chi_Minh
): TaskComputedFlags {
  if (task.status === 'done') {
    return {
      isOverdue: false,
      isDueSoon: false,
      isBlocked: false,
      hasNoDueDate: false,
    };
  }

  const hasNoDueDate = !task.dueDate;
  let isOverdue = false;
  let isDueSoon = false;

  if (task.dueDate) {
    const today = new Date(currentDateStr);
    const due = new Date(task.dueDate);

    // Reset times to compare dates purely
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      isOverdue = true;
    } else if (diffDays <= 2) {
      // Due soon is defined as due in 2 days or less
      isDueSoon = true;
    }
  }

  return {
    isOverdue,
    isDueSoon,
    isBlocked: hasOpenBlocker,
    hasNoDueDate,
  };
}

/**
 * Calculates a member's status color based on priority rules in SRS Section 9.
 *
 * Color Precedence:
 * 1. Red: has overdue tasks OR open blockers.
 * 2. Yellow: has due soon tasks OR unresolved help requests.
 * 3. Grey: required to check-in but hasn't submitted yet (missing).
 * 4. Green: submitted check-in (on_time or late), and no Red/Yellow conditions.
 * 5. None: not required to check-in, exempt, or non-working day.
 */
export function determineMemberColor(params: {
  hasOverdueTask: boolean;
  hasOpenBlocker: boolean;
  hasDueSoonTask: boolean;
  hasPendingHelpRequest: boolean;
  checkInStatus: CheckInStatus;
}): MemberColor {
  const {
    hasOverdueTask,
    hasOpenBlocker,
    hasDueSoonTask,
    hasPendingHelpRequest,
    checkInStatus,
  } = params;

  // 1. Red: has task overdue or open blocker
  if (hasOverdueTask || hasOpenBlocker) {
    return 'red';
  }

  // 2. Yellow: has task due soon or unresolved help request
  if (hasDueSoonTask || hasPendingHelpRequest) {
    return 'yellow';
  }

  // 3. Grey: required check-in but missing (or has not checked in yet)
  if (checkInStatus === 'missing') {
    return 'grey';
  }

  // 4. Green: submitted and no red/yellow
  if (checkInStatus === 'submitted_on_time' || checkInStatus === 'submitted_late') {
    return 'green';
  }

  // 5. None / Exempt / Not Required / Non-working day
  return 'none';
}
