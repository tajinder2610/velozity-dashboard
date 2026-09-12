import { Prisma } from '@prisma/client';
import { AuthedUser } from '../middleware/auth';

/**
 * The single source of truth for "which projects can this user see."
 * Reused by the project list endpoint, the task endpoints (via projectId),
 * the activity feed, and the dashboard — so the access rule can't drift
 * between them:
 *   Admin      -> all projects
 *   PM         -> only projects they created
 *   Developer  -> only projects containing a task assigned to them
 */
export function projectScopeWhere(user: AuthedUser): Prisma.ProjectWhereInput {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PM') return { createdById: user.id };
  return { tasks: { some: { assignedToId: user.id } } };
}

/** Same idea, expressed as a Task filter (used by task list/board endpoints). */
export function taskScopeWhere(user: AuthedUser): Prisma.TaskWhereInput {
  if (user.role === 'ADMIN') return {};
  if (user.role === 'PM') return { project: { createdById: user.id } };
  return { assignedToId: user.id };
}
