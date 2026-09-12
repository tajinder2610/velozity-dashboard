export type Role = 'ADMIN' | 'PM' | 'DEVELOPER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
};

export const STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  client?: Client;
  createdById: string;
  createdBy?: { id: string; name: string };
  createdAt: string;
  _count?: { tasks: number };
}

export interface Task {
  id: string;
  seq: number;
  projectId: string;
  project?: { id: string; name: string };
  title: string;
  description?: string | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  seq: number;
  projectId: string;
  taskId?: string | null;
  task?: { id: string; seq: number; title: string } | null;
  userId?: string | null;
  user?: { id: string; name: string } | null;
  action: string;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  message: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: 'TASK_ASSIGNED' | 'TASK_IN_REVIEW' | 'TASK_OVERDUE';
  message: string;
  taskId?: string | null;
  read: boolean;
  createdAt: string;
}
