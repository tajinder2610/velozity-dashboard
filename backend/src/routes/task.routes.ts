import { Router } from 'express';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createTaskSchema } from '../validators/task.validators';
import { createTask } from '../controllers/task.controller';

// mergeParams so :projectId from the parent router (project.routes.ts) is
// visible here for the nested "create task under project" route.
const router = Router({ mergeParams: true });

router.post('/', requireRole('ADMIN', 'PM'), validate(createTaskSchema), createTask);

export default router;
