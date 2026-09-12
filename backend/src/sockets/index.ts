import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Role, ActivityLog, Notification } from '@prisma/client';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';

let io: Server | undefined;

// userId -> number of open sockets for that user (a user can have multiple
// tabs open). Online = key present with count > 0. This is presence state,
// which is allowed to live in memory — unlike activity history, presence is
// inherently "right now" and re-derives itself as sockets reconnect.
const onlineSockets = new Map<string, number>();

interface SocketUser {
  id: string;
  role: Role;
  name: string;
}

function markOnline(userId: string) {
  onlineSockets.set(userId, (onlineSockets.get(userId) || 0) + 1);
}
function markOffline(userId: string) {
  const next = (onlineSockets.get(userId) || 1) - 1;
  if (next <= 0) onlineSockets.delete(userId);
  else onlineSockets.set(userId, next);
}
function broadcastPresence() {
  io?.to('role:admin').emit('presence:count', { count: onlineSockets.size });
}

export function initSockets(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
      credentials: true,
    },
  });

  // Auth happens once, at handshake — not per-message — using the same
  // short-lived access token the REST API uses (sent via the `auth` payload,
  // never a query string, so it doesn't end up in server logs).
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      (socket.data as { user: SocketUser }).user = {
        id: payload.sub,
        role: payload.role,
        name: payload.name,
      };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket.data as { user: SocketUser }).user;

    socket.join(`user:${user.id}`);
    socket.join('presence');
    if (user.role === 'ADMIN') socket.join('role:admin');

    // PMs are auto-subscribed to every project they own, so the feed is live
    // the moment they land on any page — no per-project join round-trip needed.
    if (user.role === 'PM') {
      const owned = await prisma.project.findMany({
        where: { createdById: user.id },
        select: { id: true },
      });
      owned.forEach((p: { id: string }) => socket.join(`project:${p.id}`));
    }

    markOnline(user.id);
    broadcastPresence();

    // Explicit join for a project detail page. Authorization mirrors the
    // REST-side project access rule exactly: Admin = any project, PM = only
    // projects they created. Developers never join a project room — they
    // only ever receive events scoped to `user:<id>` for their own tasks,
    // which is enforced server-side in emitActivity below, not by trusting
    // the client not to ask.
    socket.on('project:join', async (payload: { projectId?: string }) => {
      const projectId = payload?.projectId;
      if (!projectId) return;
      if (user.role === 'DEVELOPER') return; // silently ignored — no room to join
      if (user.role === 'ADMIN') {
        socket.join(`project:${projectId}`);
        return;
      }
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (project && project.createdById === user.id) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('project:leave', (payload: { projectId?: string }) => {
      if (payload?.projectId) socket.leave(`project:${payload.projectId}`);
    });

    socket.on('disconnect', () => {
      markOffline(user.id);
      broadcastPresence();
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized yet');
  return io;
}

export function getOnlineCount(): number {
  return onlineSockets.size;
}

/**
 * Fan-out for a single activity event to exactly the rooms that should see
 * it, per the brief's role-filtering rules:
 *  - role:admin           -> global feed, every event
 *  - project:<projectId>  -> the PM(s) who own that project
 *  - user:<assignedToId>  -> the developer the task belongs to (if any)
 */
export function emitActivity(
  activity: ActivityLog & { task?: { assignedToId: string | null } | null }
) {
  if (!io) return;
  const payload = { ...activity };
  io.to('role:admin').emit('activity:new', payload);
  io.to(`project:${activity.projectId}`).emit('activity:new', payload);
  const assigneeId = activity.task?.assignedToId;
  if (assigneeId) {
    io.to(`user:${assigneeId}`).emit('activity:new', payload);
  }
}

export function emitNotification(notification: Notification) {
  if (!io) return;
  io.to(`user:${notification.userId}`).emit('notification:new', notification);
}
