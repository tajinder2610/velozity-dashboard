import { Router } from 'express';
import { login, refresh, logout, me } from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema } from '../validators/auth.validators';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

export default router;
