import { Router } from 'express';
import { validate } from '../middleware/validate';
import {
  updateTaskSchema,
  updateTaskStatusSchema,
  taskListQuerySchema,
} from '../validators/task.validators';
import {
  listTasks,
  getTask,
  updateTask,
  updateTaskStatus,
} from '../controllers/task.controller';

// Flat /api/tasks — used for cross-project filtered views (dashboards, "my
// tasks", ?status=&priority=&dueBefore=&dueAfter= as real query params so
// filtered views are shareable URLs, per the brief).
const router = Router();

router.get('/', validate(taskListQuerySchema, 'query'), listTasks);
router.get('/:id', getTask);
router.patch('/:id', validate(updateTaskSchema), updateTask);
router.patch('/:id/status', validate(updateTaskStatusSchema), updateTaskStatus);

export default router;
