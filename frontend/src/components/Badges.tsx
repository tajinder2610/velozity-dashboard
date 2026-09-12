import React from 'react';
import { TaskStatus, TaskPriority, STATUS_LABEL } from '../types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: 'bg-slate-200 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-amber-100 text-amber-800',
  DONE: 'bg-emerald-100 text-emerald-700',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-sky-100 text-sky-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
      {priority}
    </span>
  );
}

export function OverdueBadge() {
  return (
    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
      Overdue
    </span>
  );
}
