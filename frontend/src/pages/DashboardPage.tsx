import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { DashboardApi } from '../api/endpoints';
import { ActivityFeed } from '../components/ActivityFeed';
import { StatusBadge, PriorityBadge, OverdueBadge } from '../components/Badges';
import { STATUS_LABEL, TaskStatus } from '../types';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const { socket, onlineCount } = useSocket();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => DashboardApi.get().then((res) => res.data),
  });

  // Server state lives in the Query cache (see Technology_Decisions.md #6);
  // socket events invalidate it directly instead of maintaining a second,
  // separate store that could drift out of sync with the REST snapshot.
  useEffect(() => {
    if (!socket) return;
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    socket.on('activity:new', invalidate);
    return () => {
      socket.off('activity:new', invalidate);
    };
  }, [socket, queryClient]);

  if (isLoading || !data) return <p className="text-slate-400">Loading dashboard…</p>;

  if (user?.role === 'ADMIN') return <AdminView data={data} onlineCount={onlineCount} />;
  if (user?.role === 'PM') return <PMView data={data} />;
  return <DeveloperView data={data} />;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}

function AdminView({ data, onlineCount }: { data: any; onlineCount: number }) {
  const statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total projects" value={data.totalProjects} />
        <StatCard label="Overdue tasks" value={data.overdueCount} />
        <StatCard label="Online now" value={onlineCount} />
        <StatCard
          label="Total tasks"
          value={statuses.reduce((sum, s) => sum + (data.tasksByStatus[s] || 0), 0)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statuses.map((s) => (
          <div key={s} className="rounded-lg border border-slate-200 bg-white p-3">
            <StatusBadge status={s} />
            <p className="mt-1 text-xl font-semibold">{data.tasksByStatus[s] || 0}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Global activity feed</h2>
        <ActivityFeed />
      </div>
    </div>
  );
}

function PMView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Your projects</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {data.projects.map((p: any) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
            >
              <p className="font-medium text-slate-800">{p.name}</p>
              <p className="text-sm text-slate-400">{p._count.tasks} tasks</p>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Tasks by priority</h2>
        <div className="flex gap-3">
          {Object.entries(data.tasksByPriority).map(([priority, count]) => (
            <div key={priority} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
              <PriorityBadge priority={priority as any} /> <span className="ml-1 font-semibold">{count as number}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Due this week</h2>
        <div className="space-y-1">
          {data.upcomingDue.length === 0 && <p className="text-sm text-slate-400">Nothing due this week.</p>}
          {data.upcomingDue.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm">
              <span>#{t.seq} {t.title} — {t.assignedTo?.name ?? 'Unassigned'}</span>
              <span className="text-slate-400">{new Date(t.dueDate).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Activity on your projects</h2>
        <ActivityFeed />
      </div>
    </div>
  );
}

function DeveloperView({ data }: { data: any }) {
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-slate-700">Your tasks</h2>
      <div className="space-y-2">
        {data.tasks.length === 0 && <p className="text-sm text-slate-400">No tasks assigned to you yet.</p>}
        {data.tasks.map((t: any) => (
          <Link
            key={t.id}
            to={`/projects/${t.project.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-slate-300"
          >
            <div>
              <p className="font-medium text-slate-800">#{t.seq} {t.title}</p>
              <p className="text-xs text-slate-400">{t.project.name} · {STATUS_LABEL[t.status as TaskStatus]}</p>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={t.priority} />
              {t.isOverdue && <OverdueBadge />}
            </div>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Activity on your tasks</h2>
        <ActivityFeed />
      </div>
    </div>
  );
}
