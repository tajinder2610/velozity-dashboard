import { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { emitNotification } from '../sockets/index';

interface NotifyInput {
  userId: string;
  type: NotificationType;
  message: string;
  taskId?: string | null;
}

export async function notify(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      taskId: input.taskId ?? null,
    },
  });
  emitNotification(notification);
  return notification;
}
