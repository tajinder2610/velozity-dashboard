import { api } from './client';
import { Project, Task, ActivityEvent, NotificationItem, Client, User, TaskStatus, TaskPriority } from '../types';

export const AuthApi = {
  login: (email: string, password: string) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
};

export const ProjectsApi = {
  list: () => api.get<Project[]>('/projects'),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  create: (data: { name: string; description?: string; clientId: string }) =>
    api.post<Project>('/projects', data),
  createTask: (
    projectId: string,
    data: { title: string; description?: string; assignedToId?: string | null; priority?: TaskPriority; dueDate?: string }
  ) => api.post<Task>(`/projects/${projectId}/tasks`, data),
};

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  dueBefore?: string;
  dueAfter?: string;
}

export const TasksApi = {
  list: (filters: TaskFilters = {}) => api.get<Task[]>('/tasks', { params: filters }),
  updateStatus: (id: string, status: TaskStatus) =>
    api.patch<Task>(`/tasks/${id}/status`, { status }),
  update: (id: string, data: Partial<{ title: string; description: string; assignedToId: string | null; priority: TaskPriority; dueDate: string }>) =>
    api.patch<Task>(`/tasks/${id}`, data),
};

export const ActivityApi = {
  list: (params: { projectId?: string; since?: number; limit?: number } = {}) =>
    api.get<ActivityEvent[]>('/activity', { params }),
};

export const NotificationsApi = {
  list: () => api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const ReferenceApi = {
  clients: () => api.get<Client[]>('/clients'),
  createClient: (name: string) => api.post<Client>('/clients', { name }),
  developers: () => api.get<User[]>('/developers'),
};

export const DashboardApi = {
  get: () => api.get<any>('/dashboard'),
};
