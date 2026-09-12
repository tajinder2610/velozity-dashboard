import React from 'react';
import { Task, TaskStatus, STATUS_ORDER, STATUS_LABEL } from '../types';
import { PriorityBadge, OverdueBadge } from './Badges';
import { useAuth } from '../context/AuthContext';

export function TaskBoard({
  tasks,
  onStatusChange,
}: {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const { user } = useAuth();

  // Frontend hides controls a role shouldn't use, but the actual enforcement
  // is server-side (task.controller.ts / taskScopeWhere) — a Developer
  // sending a PATCH for someone else's task is rejected there regardless of
  // what this component renders.
  const canEditTask = (task: Task) => {
    if (!user) return false;
    if (user.role === 'ADMIN' || user.role === 'PM') return true;
    return task.assignedToId === user.id;
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      {STATUS_ORDER.map((status) => (
        <div key={status} className="rounded-lg bg-slate-100 p-3">
          <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-600">
            {STATUS_LABEL[status]}
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
              {tasks.filter((t) => t.status === status).length}
            </span>
          </h3>
          <div className="space-y-2">
            {tasks
              .filter((t) => t.status === status)
              .map((task) => (
                <div key={task.id} className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug">
                      <span className="text-slate-400">#{task.seq}</span> {task.title}
                    </p>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-1">
                    <PriorityBadge priority={task.priority} />
                    {task.isOverdue && <OverdueBadge />}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{task.assignedTo?.name ?? 'Unassigned'}</span>
                    {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                  </div>
                  {canEditTask(task) && (
                    <select
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                      className="mt-2 w-full rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
