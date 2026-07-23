export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  ownerId: string;
  ownerName?: string;
  memberRole?: string;
  percentComplete: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  reportRequired?: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  openBlockersCount?: number;
  commentCount?: number;
  pendingPercent?: number | null;
}

export interface TaskBlocker {
  id: string;
  task_id: string;
  reporter_id: string;
  description: string;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_note: string | null;
  created_at: string;
  reporter_username: string | null;
  reporter_full_name: string | null;
  resolver_username: string | null;
  resolver_full_name: string | null;
}

export interface TaskMember {
  id: string;
  taskId: string;
  userId: string;
  assignmentRole: 'owner' | 'collaborator' | 'reviewer';
  reportRequired: boolean;
  assignedAt: string;
  removed_at: string | null;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: 'admin' | 'member';
  status: 'active' | 'locked' | 'inactive';
  mustChangePassword: boolean;
  department?: string | null;
  position?: string | null;
  unit?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
}

export interface AuthSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipHash: string | null;
  revokedAt: string | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived' | 'rejected';
  startDate?: string | null;
  dueDate?: string | null;
  managerId?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface ProjectMember {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  email?: string | null;
  projectRole: 'manager' | 'member' | 'viewer';
  joinedAt: string;
}
