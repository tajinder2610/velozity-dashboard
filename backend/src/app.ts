import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import taskFlatRoutes from './routes/taskFlat.routes';
import activityRoutes from './routes/activity.routes';
import notificationRoutes from './routes/notification.routes';
import referenceRoutes from './routes/reference.routes';
import dashboardRoutes from './routes/dashboard.routes';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Public auth routes (login itself obviously can't require a token; /me
  // guards itself internally with requireAuth so it can share this router).
  app.use('/api/auth', authRoutes);

  // Everything below this line is mounted behind requireAuth centrally —
  // this is what makes "role middleware enforced on every protected route"
  // true by construction rather than by remembering to add it to each file.
  const api = express.Router();
  api.use(requireAuth);
  api.use('/projects', projectRoutes);
  api.use('/tasks', taskFlatRoutes);
  api.use('/activity', activityRoutes);
  api.use('/notifications', notificationRoutes);
  api.use('/', referenceRoutes); // /api/clients, /api/developers
  api.use('/dashboard', dashboardRoutes);
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
