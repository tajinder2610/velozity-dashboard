import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { projectScopeWhere } from '../utils/scope';

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    where: projectScopeWhere(req.user!),
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(projects);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, ...projectScopeWhere(req.user!) },
    include: {
      client: true,
      createdBy: { select: { id: true, name: true } },
    },
  });
  // findFirst (not findUnique) so a Developer/PM outside the scope gets a
  // clean 404 instead of leaking "it exists but you can't see it" via a 403.
  if (!project) throw ApiError.notFound('Project not found');
  res.json(project);
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, clientId } = req.body;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw ApiError.badRequest('clientId does not refer to an existing client');

  const project = await prisma.project.create({
    data: { name, description, clientId, createdById: req.user!.id },
    include: { client: true, createdBy: { select: { id: true, name: true } } },
  });
  res.status(201).json(project);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  // PMs can only edit projects they created — Admins can edit any project.
  const where = req.user!.role === 'ADMIN'
    ? { id: req.params.id }
    : { id: req.params.id, createdById: req.user!.id };

  const existing = await prisma.project.findFirst({ where });
  if (!existing) throw ApiError.notFound('Project not found');

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: req.body,
  });
  res.json(project);
});
