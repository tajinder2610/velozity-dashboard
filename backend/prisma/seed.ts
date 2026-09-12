import { PrismaClient, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Password123!';

async function hashed() {
  return bcrypt.hash(PASSWORD, 10);
}

async function main() {
  console.log('Seeding database...');

  // ---- Users -------------------------------------------------------------
  const passwordHash = await hashed();

  const admin = await prisma.user.create({
    data: { name: 'Asha Menon', email: 'admin@velozity.dev', role: 'ADMIN', passwordHash },
  });

  const pm1 = await prisma.user.create({
    data: { name: 'Rahul Verma', email: 'pm1@velozity.dev', role: 'PM', passwordHash },
  });
  const pm2 = await prisma.user.create({
    data: { name: 'Sneha Kapoor', email: 'pm2@velozity.dev', role: 'PM', passwordHash },
  });

  const dev1 = await prisma.user.create({
    data: { name: 'Ravi Shankar', email: 'dev1@velozity.dev', role: 'DEVELOPER', passwordHash },
  });
  const dev2 = await prisma.user.create({
    data: { name: 'Priya Nair', email: 'dev2@velozity.dev', role: 'DEVELOPER', passwordHash },
  });
  const dev3 = await prisma.user.create({
    data: { name: 'Karan Malhotra', email: 'dev3@velozity.dev', role: 'DEVELOPER', passwordHash },
  });
  const dev4 = await prisma.user.create({
    data: { name: 'Fatima Sheikh', email: 'dev4@velozity.dev', role: 'DEVELOPER', passwordHash },
  });

  // ---- Clients -------------------------------------------------------------
  const clientA = await prisma.client.create({ data: { name: 'Northwind Retail' } });
  const clientB = await prisma.client.create({ data: { name: 'BlueRiver Logistics' } });
  const clientC = await prisma.client.create({ data: { name: 'Solstice Media' } });

  // ---- Projects -------------------------------------------------------------
  const projectA = await prisma.project.create({
    data: {
      name: 'Storefront Redesign',
      description: 'Full redesign of the e-commerce storefront and checkout flow.',
      clientId: clientA.id,
      createdById: pm1.id,
    },
  });
  const projectB = await prisma.project.create({
    data: {
      name: 'Fleet Tracking Dashboard',
      description: 'Internal dashboard for real-time fleet location and delivery status.',
      clientId: clientB.id,
      createdById: pm1.id,
    },
  });
  const projectC = await prisma.project.create({
    data: {
      name: 'Content Publishing Platform',
      description: 'CMS and publishing workflow for editorial staff.',
      clientId: clientC.id,
      createdById: pm2.id,
    },
  });

  const now = Date.now();
  const daysFromNow = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000);

  type SeedTask = {
    title: string;
    description: string;
    assignedToId: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    forceOverdue?: boolean;
  };

  async function seedProjectTasks(projectId: string, tasks: SeedTask[]) {
    const created = [];
    for (const t of tasks) {
      const task = await prisma.task.create({
        data: {
          projectId,
          title: t.title,
          description: t.description,
          assignedToId: t.assignedToId,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          isOverdue: !!t.forceOverdue,
        },
      });
      created.push(task);
    }
    return created;
  }

  const tasksA = await seedProjectTasks(projectA.id, [
    { title: 'Set up design tokens', description: 'Define color/typography tokens for the new theme.', assignedToId: dev1.id, status: 'DONE', priority: 'MEDIUM', dueDate: daysFromNow(-10) },
    { title: 'Build product listing page', description: 'Grid layout with filters and pagination.', assignedToId: dev1.id, status: 'IN_PROGRESS', priority: 'HIGH', dueDate: daysFromNow(3) },
    { title: 'Rework checkout flow', description: 'Three-step checkout with saved addresses.', assignedToId: dev2.id, status: 'IN_REVIEW', priority: 'CRITICAL', dueDate: daysFromNow(1) },
    { title: 'Fix cart total rounding bug', description: 'Totals off by a cent on multi-currency carts.', assignedToId: dev2.id, status: 'TODO', priority: 'HIGH', dueDate: daysFromNow(-2), forceOverdue: true },
    { title: 'Add wishlist feature', description: 'Let users save products for later.', assignedToId: null, status: 'TODO', priority: 'LOW', dueDate: daysFromNow(14) },
    { title: 'Mobile nav polish', description: 'Fix overflow on small screens.', assignedToId: dev1.id, status: 'TODO', priority: 'MEDIUM', dueDate: daysFromNow(5) },
  ]);

  const tasksB = await seedProjectTasks(projectB.id, [
    { title: 'Integrate GPS provider webhook', description: 'Ingest live location pings.', assignedToId: dev3.id, status: 'IN_PROGRESS', priority: 'CRITICAL', dueDate: daysFromNow(2) },
    { title: 'Design fleet map component', description: 'Map with vehicle clustering.', assignedToId: dev3.id, status: 'DONE', priority: 'HIGH', dueDate: daysFromNow(-5) },
    { title: 'Delivery ETA calculation', description: 'Estimate ETA from route + traffic data.', assignedToId: dev4.id, status: 'TODO', priority: 'HIGH', dueDate: daysFromNow(-1), forceOverdue: true },
    { title: 'Driver status badges', description: 'Online/offline/on-break indicators.', assignedToId: dev4.id, status: 'IN_REVIEW', priority: 'MEDIUM', dueDate: daysFromNow(4) },
    { title: 'Historical route playback', description: 'Replay a vehicle\'s route for a given day.', assignedToId: null, status: 'TODO', priority: 'LOW', dueDate: daysFromNow(20) },
  ]);

  const tasksC = await seedProjectTasks(projectC.id, [
    { title: 'Rich text editor integration', description: 'WYSIWYG editor for articles.', assignedToId: dev4.id, status: 'IN_PROGRESS', priority: 'HIGH', dueDate: daysFromNow(6) },
    { title: 'Editorial approval workflow', description: 'Draft → Review → Published states.', assignedToId: dev4.id, status: 'TODO', priority: 'CRITICAL', dueDate: daysFromNow(2) },
    { title: 'Media library uploads', description: 'Drag-and-drop image uploads with resizing.', assignedToId: dev1.id, status: 'DONE', priority: 'MEDIUM', dueDate: daysFromNow(-8) },
    { title: 'Tag & category management', description: 'CRUD for taxonomy used across articles.', assignedToId: dev1.id, status: 'IN_REVIEW', priority: 'LOW', dueDate: daysFromNow(9) },
    { title: 'Scheduled publishing', description: 'Publish articles at a future timestamp.', assignedToId: null, status: 'TODO', priority: 'MEDIUM', dueDate: daysFromNow(12) },
  ]);

  // ---- Activity log (pre-existing, so the feed isn't empty on first load) --
  const activityData: Array<{
    projectId: string;
    taskId: string;
    userId: string;
    action: string;
    fromStatus?: TaskStatus;
    toStatus?: TaskStatus;
    message: string;
    minutesAgo: number;
  }> = [
    { projectId: projectA.id, taskId: tasksA[2].id, userId: dev2.id, action: 'STATUS_CHANGE', fromStatus: 'IN_PROGRESS', toStatus: 'IN_REVIEW', message: `${dev2.name} moved Task #${tasksA[2].seq} from In Progress to In Review`, minutesAgo: 2 },
    { projectId: projectA.id, taskId: tasksA[1].id, userId: dev1.id, action: 'STATUS_CHANGE', fromStatus: 'TODO', toStatus: 'IN_PROGRESS', message: `${dev1.name} moved Task #${tasksA[1].seq} from To Do to In Progress`, minutesAgo: 45 },
    { projectId: projectA.id, taskId: tasksA[0].id, userId: dev1.id, action: 'STATUS_CHANGE', fromStatus: 'IN_REVIEW', toStatus: 'DONE', message: `${dev1.name} moved Task #${tasksA[0].seq} from In Review to Done`, minutesAgo: 60 * 6 },
    { projectId: projectB.id, taskId: tasksB[0].id, userId: dev3.id, action: 'STATUS_CHANGE', fromStatus: 'TODO', toStatus: 'IN_PROGRESS', message: `${dev3.name} moved Task #${tasksB[0].seq} from To Do to In Progress`, minutesAgo: 20 },
    { projectId: projectB.id, taskId: tasksB[3].id, userId: dev4.id, action: 'STATUS_CHANGE', fromStatus: 'IN_PROGRESS', toStatus: 'IN_REVIEW', message: `${dev4.name} moved Task #${tasksB[3].seq} from In Progress to In Review`, minutesAgo: 10 },
    { projectId: projectB.id, taskId: tasksB[2].id, userId: undefined as any, action: 'OVERDUE_FLAGGED', message: `"${tasksB[2].title}" passed its due date and was flagged Overdue`, minutesAgo: 60 * 12 },
    { projectId: projectA.id, taskId: tasksA[3].id, userId: undefined as any, action: 'OVERDUE_FLAGGED', message: `"${tasksA[3].title}" passed its due date and was flagged Overdue`, minutesAgo: 60 * 20 },
    { projectId: projectC.id, taskId: tasksC[0].id, userId: dev4.id, action: 'STATUS_CHANGE', fromStatus: 'TODO', toStatus: 'IN_PROGRESS', message: `${dev4.name} moved Task #${tasksC[0].seq} from To Do to In Progress`, minutesAgo: 30 },
    { projectId: projectC.id, taskId: tasksC[3].id, userId: dev1.id, action: 'STATUS_CHANGE', fromStatus: 'IN_PROGRESS', toStatus: 'IN_REVIEW', message: `${dev1.name} moved Task #${tasksC[3].seq} from In Progress to In Review`, minutesAgo: 15 },
    { projectId: projectC.id, taskId: tasksC[2].id, userId: dev1.id, action: 'STATUS_CHANGE', fromStatus: 'IN_REVIEW', toStatus: 'DONE', message: `${dev1.name} moved Task #${tasksC[2].seq} from In Review to Done`, minutesAgo: 60 * 30 },
  ];

  for (const a of activityData) {
    await prisma.activityLog.create({
      data: {
        projectId: a.projectId,
        taskId: a.taskId,
        userId: a.userId ?? null,
        action: a.action,
        fromStatus: a.fromStatus,
        toStatus: a.toStatus,
        message: a.message,
        createdAt: new Date(now - a.minutesAgo * 60 * 1000),
      },
    });
  }

  // ---- Notifications ---------------------------------------------------
  await prisma.notification.create({
    data: {
      userId: dev2.id,
      type: 'TASK_ASSIGNED',
      message: `You were assigned Task #${tasksA[2].seq}: "${tasksA[2].title}"`,
      taskId: tasksA[2].id,
    },
  });
  await prisma.notification.create({
    data: {
      userId: pm1.id,
      type: 'TASK_IN_REVIEW',
      message: `Task #${tasksA[2].seq} "${tasksA[2].title}" was moved to In Review`,
      taskId: tasksA[2].id,
    },
  });

  console.log('Seed complete.');
  console.log('----------------------------------------------------');
  console.log('Login with any of the following (password for all):', PASSWORD);
  console.log('Admin:            admin@velozity.dev');
  console.log('PM (Storefront):  pm1@velozity.dev');
  console.log('PM (Content):     pm2@velozity.dev');
  console.log('Developer:        dev1@velozity.dev .. dev4@velozity.dev');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
