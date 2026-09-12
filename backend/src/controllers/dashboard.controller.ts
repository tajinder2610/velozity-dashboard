import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { getOnlineCount } from '../sockets/index';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'ADMIN') {
    const [totalProjects, statusCounts, overdueCount] = await Promise.all([
      prisma.project.count(),
      prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.task.count({ where: { isOverdue: true } }),
    ]);
    return res.json({
      role: 'ADMIN',
      totalProjects,
      tasksByStatus: Object.fromEntries(
        statusCounts.map((s: { status: string; _count: { _all: number } }) => [s.status, s._count._all])
      ),
      overdueCount,
      onlineUsers: getOnlineCount(),
    });
  }

  if (user.role === 'PM') {
    const projects = await prisma.project.findMany({
      where: { createdById: user.id },
      include: { _count: { select: { tasks: true } } },
    });
    const projectIds = projects.map((p: { id: string }) => p.id);

    const [priorityCounts, weekStart, weekEnd] = await Promise.all([
      prisma.task.groupBy({
        by: ['priority'],
        where: { projectId: { in: projectIds } },
        _count: { _all: true },
      }),
      Promise.resolve(new Date()),
      Promise.resolve(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    ]);

    const upcomingDue = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: weekStart, lte: weekEnd },
        status: { not: 'DONE' },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    return res.json({
      role: 'PM',
      projects,
      tasksByPriority: Object.fromEntries(
        priorityCounts.map((p: { priority: string; _count: { _all: number } }) => [p.priority, p._count._all])
      ),
      upcomingDue,
    });
  }

  // DEVELOPER
  const tasks = await prisma.task.findMany({
    where: { assignedToId: user.id },
    include: { project: { select: { id: true, name: true } } },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });
  return res.json({ role: 'DEVELOPER', tasks });
});
