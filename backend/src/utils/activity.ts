import { TaskStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emitActivity } from '../sockets/index';

interface LogActivityInput {
  projectId: string;
  taskId?: string | null;
  userId?: string | null; // null => system-generated (e.g. overdue sweep)
  action: string;
  fromStatus?: TaskStatus | null;
  toStatus?: TaskStatus | null;
  message: string;
}

/**
 * Single choke point for "something happened" — always writes to the
 * database first (the brief is explicit: the log must be persisted, not
 * derived from other tables at read time), then broadcasts over the socket.
 * If the broadcast were to happen without the write, a page refresh would
 * lose events; writing first means the missed-event catch-up query and the
 * live feed are always backed by the same source of truth.
 */
export async function logActivity(input: LogActivityInput) {
  const entry = await prisma.activityLog.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      userId: input.userId ?? null,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      message: input.message,
    },
    include: { task: { select: { assignedToId: true } } },
  });

  emitActivity(entry);
  return entry;
}
