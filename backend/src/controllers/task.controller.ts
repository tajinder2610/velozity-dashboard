import { Request, Response } from 'express';
import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { taskScopeWhere } from '../utils/scope';
import { logActivity } from '../utils/activity';
import { notify } from '../utils/notify';
import { STATUS_LABEL } from '../utils/labels';

async function assertProjectAccess(userId: string, role: string, projectId: string) {
  if (role === 'ADMIN') {
    const p = await prisma.project.findUnique({ where: { id: projectId } });
    if (!p) throw ApiError.notFound('Project not found');
    return p;
  }
  if (role === 'PM') {
    const p = await prisma.project.findFirst({ where: { id: projectId, createdById: userId } });
    if (!p) throw ApiError.forbidden('You do not manage this project');
    return p;
  }
  throw ApiError.forbidden('Only Admins and Project Managers can do this');
}

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const { status, priority, dueBefore, dueAfter, projectId } = req.query as Record<string, string | undefined>;

  const where: any = { ...taskScopeWhere(req.user!) };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (projectId) where.projectId = projectId;
  if (dueBefore || dueAfter) {
    where.dueDate = {};
    if (dueBefore) where.dueDate.lte = new Date(dueBefore);
    if (dueAfter) where.dueDate.gte = new Date(dueAfter);
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
  res.json(tasks);
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id, ...taskScopeWhere(req.user!) },
    include: {
      assignedTo: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, createdById: true } },
    },
  });
  if (!task) throw ApiError.notFound('Task not found');
  res.json(task);
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId;
  await assertProjectAccess(req.user!.id, req.user!.role, projectId);

  const { title, description, assignedToId, priority, dueDate } = req.body;

  if (assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee || assignee.role !== 'DEVELOPER') {
      throw ApiError.badRequest('assignedToId must refer to a Developer');
    }
  }

  const task = await prisma.task.create({
    data: { projectId, title, description, assignedToId, priority, dueDate },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await logActivity({
    projectId,
    taskId: task.id,
    userId: req.user!.id,
    action: 'TASK_CREATED',
    message: `${req.user!.name} created Task #${task.seq} "${task.title}"`,
  });

  if (task.assignedToId) {
    await notify({
      userId: task.assignedToId,
      type: 'TASK_ASSIGNED',
      message: `You were assigned Task #${task.seq}: "${task.title}"`,
      taskId: task.id,
    });
  }

  res.status(201).json(task);
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Task not found');
  await assertProjectAccess(req.user!.id, req.user!.role, existing.projectId);

  const { assignedToId } = req.body;
  if (assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!assignee || assignee.role !== 'DEVELOPER') {
      throw ApiError.badRequest('assignedToId must refer to a Developer');
    }
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: req.body,
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  const reassigned = assignedToId && assignedToId !== existing.assignedToId;
  if (reassigned) {
    await logActivity({
      projectId: task.projectId,
      taskId: task.id,
      userId: req.user!.id,
      action: 'TASK_ASSIGNED',
      message: `${req.user!.name} assigned Task #${task.seq} to ${task.assignedTo?.name}`,
    });
    await notify({
      userId: assignedToId,
      type: 'TASK_ASSIGNED',
      message: `You were assigned Task #${task.seq}: "${task.title}"`,
      taskId: task.id,
    });
  }

  res.json(task);
});

/**
 * The one endpoint every role can reach, but each only for tasks they're
 * allowed to touch: Admin any task, PM any task in a project they created,
 * Developer only a task assigned to them. Every transition is recorded
 * (persisted, not derived) and broadcast, and — when a task moves into
 * In Review — the owning PM is notified.
 */
export const updateTaskStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as { status: TaskStatus };

  const existing = await prisma.task.findFirst({
    where: { id: req.params.id, ...taskScopeWhere(req.user!) },
    include: { project: { select: { id: true, createdById: true } } },
  });
  if (!existing) throw ApiError.notFound('Task not found');

  if (existing.status === status) {
    res.json(existing);
    return;
  }

  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      status,
      // Moving a task off Done, or back into an earlier stage, means it can
      // become overdue again on the next sweep if its due date has passed;
      // moving out of an overdue state manually (e.g. into Done) clears the flag.
      isOverdue: status === 'DONE' ? false : existing.isOverdue,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await logActivity({
    projectId: existing.projectId,
    taskId: task.id,
    userId: req.user!.id,
    action: 'STATUS_CHANGE',
    fromStatus: existing.status,
    toStatus: status,
    message: `${req.user!.name} moved Task #${task.seq} from ${STATUS_LABEL[existing.status]} to ${STATUS_LABEL[status]}`,
  });

  if (status === 'IN_REVIEW') {
    await notify({
      userId: existing.project.createdById,
      type: 'TASK_IN_REVIEW',
      message: `Task #${task.seq} "${task.title}" was moved to In Review`,
      taskId: task.id,
    });
  }

  res.json(task);
});
