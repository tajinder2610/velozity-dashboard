import { Router } from 'express';
import { requireRole } from '../middleware/role';
import { listClients, createClient, listDevelopers } from '../controllers/reference.controller';

const router = Router();
router.get('/clients', listClients);
router.post('/clients', requireRole('ADMIN'), createClient);
router.get('/developers', listDevelopers);
export default router;
