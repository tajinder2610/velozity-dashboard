import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';

// Clients and the developer roster are reference data used to populate
// dropdowns in the "create project" / "assign task" forms. Any authenticated
// user can read them (no sensitive data here); only Admin/PM can act on them,
// which is enforced on the write endpoints (project/task creation), not here.

export const listClients = asyncHandler(async (_req: Request, res: Response) => {
  const clients = await prisma.client.findMany({ orderBy: { name: 'asc' } });
  res.json(clients);
});

export const createClient = asyncHandler(async (req: Request, res: Response) => {
  const client = await prisma.client.create({ data: { name: req.body.name } });
  res.status(201).json(client);
});

export const listDevelopers = asyncHandler(async (_req: Request, res: Response) => {
  const developers = await prisma.user.findMany({
    where: { role: 'DEVELOPER' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
  res.json(developers);
});
