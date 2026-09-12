import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { verifyAccessToken } from '../lib/jwt';
import { ApiError } from '../utils/ApiError';

export interface AuthedUser {
  id: string;
  role: Role;
  name: string;
}

// Express's type augmentation — req.user is populated only after this
// middleware runs and only from a verified JWT, never trusted from the body.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

/**
 * Verifies the Bearer access token and attaches req.user.
 * This runs on EVERY protected route (mounted centrally in app.ts on the
 * /api router, not opted into per-route) so there is no route that can
 * accidentally skip it.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired access token'));
  }
}
