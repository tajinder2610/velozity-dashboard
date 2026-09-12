import { Router } from 'express';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validators';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
} from '../controllers/project.controller';
import taskRouter from './task.routes';

const router = Router();

// All roles can list/view — results are scoped per-role inside the controller.
router.get('/', listProjects);
router.get('/:id', getProject);

// Only Admin/PM can create or edit a project.
router.post('/', requireRole('ADMIN', 'PM'), validate(createProjectSchema), createProject);
router.patch('/:id', requireRole('ADMIN', 'PM'), validate(updateProjectSchema), updateProject);

// Nested: /api/projects/:projectId/tasks
router.use('/:projectId/tasks', taskRouter);

export default router;
