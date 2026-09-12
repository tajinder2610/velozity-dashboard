import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

type Part = 'body' | 'query' | 'params';

/**
 * Server-side validation for every API input. Frontend validation exists too,
 * but per the brief it is never sufficient on its own — this is what actually
 * blocks a bad payload, including one sent directly via curl/Postman.
 */
export function validate(schema: ZodSchema, part: Part = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return next(
        ApiError.badRequest('Validation failed', result.error.flatten().fieldErrors)
      );
    }
    (req as any)[part] = result.data;
    next();
  };
}
