import { z } from 'zod';

// Username schema: length 3-50, no spaces, letters/numbers plus dot, underscore, hyphen.
export const usernameSchema = z
  .string()
  .min(3, { message: 'Username must be at least 3 characters' })
  .max(50, { message: 'Username must not exceed 50 characters' })
  .regex(/^[a-zA-Z0-9._-]+$/, {
    message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
  });

// Password schema: minimum 8 characters, at least 1 letter and 1 number
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must not exceed 128 characters' })
  .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' });

// Login Schema
export const loginSchema = z.object({
  username: z.string().trim().min(1, { message: 'Username is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

// User Creation Schema
export const createUserSchema = z.object({
  username: usernameSchema,
  fullName: z.string().trim().min(1, { message: 'Full name is required' }).max(100),
  email: z.string().email({ message: 'Invalid email address' }).nullable().optional(),
  department: z.string().trim().max(120).nullable().optional(),
  position: z.string().trim().max(120).nullable().optional(),
  role: z.enum(['admin', 'member']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// Change Password Schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required' }),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Project Creation Schema
export const createProjectSchema = z.object({
  name: z.string().trim().min(1, { message: 'Project name is required' }).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  managerId: z.string().uuid({ message: 'Manager ID must be a valid UUID' }).nullable().optional(),
  memberIds: z.array(z.string().uuid({ message: 'Member ID must be a valid UUID' })).max(100).optional(),
}).refine((data) => {
  if (data.startDate && data.dueDate) {
    return new Date(data.dueDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Due date must be greater than or equal to start date',
  path: ['dueDate'],
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// Project Update Schema
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, { message: 'Project name is required' }).max(200),
  description: z.string().trim().max(10000).nullable().optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'archived', 'rejected']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  managerId: z.string().uuid({ message: 'Manager ID must be a valid UUID' }).nullable().optional(),
}).refine((data) => {
  if (data.startDate && data.dueDate) {
    return new Date(data.dueDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Due date must be greater than or equal to start date',
  path: ['dueDate'],
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

// Add Project Member Schema
export const addProjectMemberSchema = z.object({
  projectId: z.string().uuid({ message: 'Project ID must be a valid UUID' }),
  userId: z.string().uuid({ message: 'User ID must be a valid UUID' }),
  projectRole: z.enum(['manager', 'member', 'viewer']),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;

// Task Creation / Update Schema
export const taskSchema = z.object({
  title: z.string().trim().min(1, { message: 'Task title is required' }).max(200),
  description: z.string().trim().max(1000).nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  ownerId: z.string().uuid({ message: 'Owner ID must be a valid UUID' }),
  percentComplete: z.number().min(0).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  reportRequired: z.boolean(),
  version: z.number().int().nonnegative(),
});

export type TaskInput = z.infer<typeof taskSchema>;

// Task Creation Schema
export const createTaskSchema = z.object({
  projectId: z.string().uuid({ message: 'Project ID must be a valid UUID' }),
  title: z.string().trim().min(1, { message: 'Task title is required' }).max(250),
  description: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  ownerId: z.string().uuid({ message: 'Owner ID must be a valid UUID' }).nullable().optional(),
  parentId: z.string().trim().min(1, { message: 'Parent ID is required' }).nullable().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  collaborators: z.array(z.string().uuid({ message: 'Collaborator ID must be a valid UUID' })).optional(),
  reviewers: z.array(z.string().uuid({ message: 'Reviewer ID must be a valid UUID' })).optional(),
}).refine((data) => {
  if (data.startDate && data.dueDate) {
    return new Date(data.dueDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Due date must be greater than or equal to start date',
  path: ['dueDate'],
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

// Task Update Schema
export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, { message: 'Task title is required' }).max(250),
  description: z.string().trim().max(20000).nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'waiting', 'done']),
  priority: z.enum(['low', 'medium', 'high']),
  ownerId: z.string().uuid({ message: 'Owner ID must be a valid UUID' }),
  percentComplete: z.number().min(0).max(100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).nullable().optional(),
  collaborators: z.array(z.string().uuid({ message: 'Collaborator ID must be a valid UUID' })).optional(),
  reviewers: z.array(z.string().uuid({ message: 'Reviewer ID must be a valid UUID' })).optional(),
  version: z.number().int().positive({ message: 'Version must be a positive integer >= 1' }),
}).refine((data) => {
  if (data.startDate && data.dueDate) {
    return new Date(data.dueDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Due date must be greater than or equal to start date',
  path: ['dueDate'],
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// Check-in Item Schema
export const checkInItemSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  const item = raw as Record<string, unknown>;
  return {
    ...item,
    percentCompleteProposed:
      item.percentCompleteProposed ?? item.progress ?? item.memberPercentComplete ?? item.member_percent_complete,
    proposedTaskStatus: item.proposedTaskStatus ?? item.statusUpdate,
    timeSpentHours: item.timeSpentHours ?? item.timeSpent,
  };
}, z.object({
  taskId: z.string().uuid({ message: 'Task ID must be a valid UUID' }),
  workDone: z.string().trim().min(1, { message: 'Description of work done is required' }).max(5000),
  memberPercentComplete: z.number().min(0).max(100).nullable().optional(),
  percentCompleteProposed: z.number().min(0).max(100).nullable().optional(),
  proposedTaskStatus: z.enum(['todo', 'in_progress', 'waiting', 'done']).nullable().optional(),
  timeSpentHours: z.number().min(0).max(24).nullable().optional(),
  helpNeeded: z.string().trim().max(3000).nullable().optional(),
  blockerDetails: z.string().trim().max(2000).nullable().optional(),
}));

// Check-in Submission Schema
export const submitCheckInSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }

  const body = raw as Record<string, unknown>;
  return {
    ...body,
    items: body.items ?? body.tasks ?? [],
  };
}, z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }).optional(),
  noActivity: z.boolean().optional(),
  noActivityReason: z.string().trim().max(1000).nullable().optional(),
  items: z.array(checkInItemSchema).max(20, { message: 'Too many check-in items' }).default([]),
  summaryToday: z.string().trim().max(5000).nullable().optional(),
  generalDifficulties: z.string().trim().max(3000).nullable().optional(),
  helpNeeded: z.string().trim().max(3000).nullable().optional(),
  planTomorrow: z.string().trim().max(3000).nullable().optional(),
  totalTimeSpentHours: z.number().min(0).max(24).nullable().optional(),
  adminEditReason: z.string().trim().max(1000).nullable().optional(),
})).refine((data) => {
  // Either items are present OR summaryToday is provided OR noActivityReason is provided
  const hasItems = data.items && data.items.length > 0;
  const hasReason = !!(data.noActivityReason && data.noActivityReason.trim().length > 0);
  const hasSummary = !!(data.summaryToday && data.summaryToday.trim().length > 0);
  return hasItems || hasReason || hasSummary;
}, {
  message: 'Vui lòng chọn công việc, nhập tóm tắt báo cáo hôm nay, hoặc cung cấp lý do không phát sinh công việc.',
  path: ['items'],
}).refine((data) => {
  if ((data.items && data.items.length > 0) || (data.summaryToday && data.summaryToday.trim().length > 0)) {
    return true;
  }

  return !!data.noActivityReason && data.noActivityReason.trim().length >= 10;
}, {
  message: 'Lý do không phát sinh công việc phải có ít nhất 10 ký tự',
  path: ['noActivityReason'],
});

export type SubmitCheckInInput = z.infer<typeof submitCheckInSchema>;
// Absence Schema
export const createAbsenceSchema = z.object({
  userId: z.string().uuid({ message: 'User ID must be a valid UUID' }),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }),
  reason: z.string().trim().min(1, { message: 'Reason is required' }).max(1000),
}).refine((data) => {
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'End date must be greater than or equal to start date',
  path: ['endDate'],
});

export type CreateAbsenceInput = z.infer<typeof createAbsenceSchema>;

// Non-Working Day Schema
export const createNonWorkingDaySchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Format must be YYYY-MM-DD' }),
  name: z.string().trim().min(1, { message: 'Name is required' }).max(200),
});

export type CreateNonWorkingDayInput = z.infer<typeof createNonWorkingDaySchema>;

// Blocker Creation Schema
export const createBlockerSchema = z.object({
  taskId: z.string().uuid({ message: 'Task ID must be a valid UUID' }),
  description: z.string().trim().min(10, { message: 'Description must be at least 10 characters' }).max(2000),
});

export type CreateBlockerInput = z.infer<typeof createBlockerSchema>;

// Blocker Resolution Schema
export const resolveBlockerSchema = z.object({
  blockerId: z.string().uuid({ message: 'Blocker ID must be a valid UUID' }),
  resolutionNote: z.string().trim().min(1, { message: 'Resolution note is required' }).max(2000),
});

export type ResolveBlockerInput = z.infer<typeof resolveBlockerSchema>;
