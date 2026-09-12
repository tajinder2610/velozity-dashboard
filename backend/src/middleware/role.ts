import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

/**
 * Restricts a route to one or more roles. Always used AFTER requireAuth.
 * A Developer hitting a PM/Admin-only endpoint — even with a technically
 * valid token — is rejected here with 403, regardless of what the frontend
 * would have shown them. This is the server-side half of the "frontend-only
 * role hiding is not acceptable" requirement.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`This action requires one of: ${roles.join(', ')}`));
    }
    next();
  };
}
