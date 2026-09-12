import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { TaskStatus, TaskPriority, STATUS_ORDER, STATUS_LABEL } from '../types';

const PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// All filter state lives in the URL (?status=&priority=&dueBefore=&dueAfter=)
// rather than component state, so a filtered board can be bookmarked or
// pasted to a teammate and reopen exactly as configured — this is the
// "filters must work via query parameters so they are shareable" requirement.
export function TaskFiltersBar() {
  const [params, setParams] = useSearchParams();

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2 text-sm">
      <select
        value={params.get('status') || ''}
        onChange={(e) => update('status', e.target.value)}
        className="rounded border border-slate-200 px-2 py-1"
      >
        <option value="">All statuses</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s as TaskStatus]}
          </option>
        ))}
      </select>

      <select
        value={params.get('priority') || ''}
        onChange={(e) => update('priority', e.target.value)}
        className="rounded border border-slate-200 px-2 py-1"
      >
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1 text-slate-500">
        Due after
        <input
          type="date"
          value={params.get('dueAfter') || ''}
          onChange={(e) => update('dueAfter', e.target.value)}
          className="rounded border border-slate-200 px-2 py-1"
        />
      </label>

      <label className="flex items-center gap-1 text-slate-500">
        Due before
        <input
          type="date"
          value={params.get('dueBefore') || ''}
          onChange={(e) => update('dueBefore', e.target.value)}
          className="rounded border border-slate-200 px-2 py-1"
        />
      </label>

      {(params.get('status') || params.get('priority') || params.get('dueAfter') || params.get('dueBefore')) && (
        <button
          onClick={() => setParams(new URLSearchParams(), { replace: true })}
          className="text-slate-400 underline hover:text-slate-600"
        >
          Clear
        </button>
      )}
    </div>
  );
}
