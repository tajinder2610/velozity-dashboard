import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Backs both the initial feed render AND the "I was offline, what did I
 * miss" catch-up (via ?since=<lastSeenActivityId>), always read from the
 * database — never from the in-memory socket layer — per the brief.
 *
 * Role filtering mirrors the socket room fan-out in sockets/index.ts:
 *   Admin      -> everything
 *   PM         -> only their own projects
 *   Developer  -> only activity on tasks assigned to them
 */
export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, since } = req.query as Record<string, string | undefined>;
  const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);

  const where: any = {};
  if (req.user!.role === 'PM') {
    where.project = { createdById: req.user!.id };
  } else if (req.user!.role === 'DEVELOPER') {
    // task is an optional relation (system-generated entries can have no
    // task), so Prisma requires the `is:` wrapper rather than a bare object
    // filter here.
    where.task = { is: { assignedToId: req.user!.id } };
  }
  if (projectId) where.projectId = projectId;
  // `since` is the last activity `seq` the client already has — seq is a
  // monotonically increasing integer (unlike the uuid `id`), so "give me
  // everything after this" is a simple, correct comparison.
  if (since) where.seq = { gt: parseInt(since, 10) };

  const activity = await prisma.activityLog.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      task: { select: { id: true, seq: true, title: true } },
    },
    orderBy: { seq: 'desc' },
    take: limit,
  });

  res.json(activity);
});
