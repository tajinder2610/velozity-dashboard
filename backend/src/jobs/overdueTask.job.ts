import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { logActivity } from '../utils/activity';

/**
 * Flags tasks whose due date has passed and are not yet Done as Overdue.
 * Runs on a schedule (default every 5 minutes, see OVERDUE_SWEEP_CRON) —
 * deliberately NOT computed on page load, per the brief.
 *
 * Idempotent by construction: the WHERE clause only ever selects tasks that
 * are not already isOverdue, so re-running the sweep (e.g. if the process
 * restarts mid-cycle, or — see Technology_Decisions.md #4 — if the app is
 * horizontally scaled and the sweep runs once per instance) never produces
 * duplicate activity log entries.
 */
export async function runOverdueSweep() {
  const now = new Date();
  const overdueTasks = await prisma.task.findMany({
    where: {
      isOverdue: false,
      status: { not: 'DONE' },
      dueDate: { lt: now },
    },
    select: { id: true, projectId: true, title: true },
  });

  if (overdueTasks.length === 0) return;

  for (const task of overdueTasks) {
    await prisma.task.update({
      where: { id: task.id },
      data: { isOverdue: true },
    });

    await logActivity({
      projectId: task.projectId,
      taskId: task.id,
      userId: null, // system-generated
      action: 'OVERDUE_FLAGGED',
      message: `"${task.title}" passed its due date and was flagged Overdue`,
    });
  }

  console.log(`[overdue-sweep] flagged ${overdueTasks.length} task(s) at ${now.toISOString()}`);
}

export function startOverdueScheduler() {
  const schedule = process.env.OVERDUE_SWEEP_CRON || '*/5 * * * *';
  cron.schedule(schedule, () => {
    runOverdueSweep().catch((err) => console.error('[overdue-sweep] failed', err));
  });
  console.log(`[overdue-sweep] scheduled with cron "${schedule}"`);
}
