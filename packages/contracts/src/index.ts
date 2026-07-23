// User Roles
export type UserRole = 'admin' | 'member';

// User Status
export type UserStatus = 'active' | 'locked' | 'inactive';

// User Account
export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  status: UserStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Project Status
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'archived' | 'rejected';

// Project
export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  managerId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// Project Member
export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  projectRole: 'manager' | 'member' | 'viewer';
  joinedAt: string;
  removedAt: string | null;
}

// Task Status (Workflow Status)
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done';

// Task Priority
export type TaskPriority = 'low' | 'medium' | 'high';

// Task
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId: string;
  percentComplete: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  reportRequired: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// Task Member (Assignment)
export interface TaskMember {
  id: string;
  taskId: string;
  userId: string;
  assignmentRole: 'owner' | 'collaborator' | 'reviewer';
  reportRequired: boolean;
  assignedAt: string;
  removedAt: string | null;
}

// Check-in Status
export type CheckInStatus =
  | 'submitted_on_time'
  | 'submitted_late'
  | 'missing'
  | 'not_required'
  | 'exempt'
  | 'non_working_day';

// Check-in
export interface CheckIn {
  id: string;
  userId: string;
  checkInDate: string; // YYYY-MM-DD
  status: CheckInStatus;
  noActivityReason: string | null;
  submittedAt: string;
  createdAt: string;
}

// Check-in Item
export interface CheckInItem {
  id: string;
  checkInId: string;
  taskId: string;
  workDone: string;
  percentCompleteProposed: number;
  blockerDetails: string | null;
  createdAt: string;
}

// Blocker Status
export type BlockerStatus = 'open' | 'resolved';

// Blocker
export interface Blocker {
  id: string;
  taskId: string;
  reportedById: string;
  details: string;
  status: BlockerStatus;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// Absence Reason
export type AbsenceReason = 'leave' | 'sick' | 'public_holiday' | 'other';

// Absence / Exemption
export interface Absence {
  id: string;
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: AbsenceReason;
  notes: string | null;
  createdAt: string;
}

// Audit Log
export interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: string | null;
  newValue: string | null;
  clientIp: string | null;
  createdAt: string;
}
