import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ProjectsApi, TasksApi, ReferenceApi } from '../api/endpoints';
import { Project, Task, TaskStatus, User } from '../types';
import { TaskBoard } from '../components/TaskBoard';
import { TaskFiltersBar } from '../components/TaskFiltersBar';
import { ActivityFeed } from '../components/ActivityFeed';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [params] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [developers, setDevelopers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PM';

  const loadProject = () => id && ProjectsApi.get(id).then((res) => setProject(res.data));

  const loadTasks = () => {
    if (!id) return;
    const filters: any = { projectId: id };
    if (params.get('status')) filters.status = params.get('status');
    if (params.get('priority')) filters.priority = params.get('priority');
    if (params.get('dueBefore')) filters.dueBefore = params.get('dueBefore');
    if (params.get('dueAfter')) filters.dueAfter = params.get('dueAfter');
    TasksApi.list(filters).then((res) => setTasks(res.data));
  };

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, params.toString()]);

  useEffect(() => {
    if (canManage) ReferenceApi.developers().then((res) => setDevelopers(res.data));
  }, [canManage]);

  // Live task updates: any activity event for a task in this project means
  // that task's state may have changed, so refetch it in place rather than
  // waiting for a manual reload.
  useEffect(() => {
    if (!socket || !id) return;
    const onActivity = (event: any) => {
      if (event.projectId === id) loadTasks();
    };
    socket.on('activity:new', onActivity);
    return () => {
      socket.off('activity:new', onActivity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id, params.toString()]);

  const onStatusChange = async (taskId: string, status: TaskStatus) => {
    // Optimistic update — the board should feel instant, then reconcile
    // with whatever the server actually persisted (also arrives via socket).
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await TasksApi.updateStatus(taskId, status);
    } catch {
      loadTasks();
    }
  };

  if (!project) return <p className="text-slate-400">Loading project…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-slate-800">{project.name}</h1>
        <p className="text-sm text-slate-500">{project.client?.name}</p>
        {project.description && <p className="mt-1 text-sm text-slate-600">{project.description}</p>}
      </div>

      <div className="flex items-center justify-between">
        <TaskFiltersBar />
        {canManage && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="mb-4 h-fit rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            {showForm ? 'Cancel' : 'New task'}
          </button>
        )}
      </div>

      {showForm && id && (
        <CreateTaskForm
          projectId={id}
          developers={developers}
          onCreated={() => {
            setShowForm(false);
            loadTasks();
          }}
        />
      )}

      <TaskBoard tasks={tasks} onStatusChange={onStatusChange} />

      <div>
        <h2 className="mb-2 font-semibold text-slate-700">Project activity</h2>
        <ActivityFeed projectId={id} />
      </div>
    </div>
  );
}

function CreateTaskForm({
  projectId,
  developers,
  onCreated,
}: {
  projectId: string;
  developers: User[];
  onCreated: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ProjectsApi.createTask(projectId, {
        title,
        description: description || undefined,
        assignedToId: assignedToId || null,
        priority: priority as any,
        dueDate: dueDate || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not create task');
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-2">
      {error && <div className="col-span-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <input
        required
        placeholder="Task title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2"
      />
      <select
        value={assignedToId}
        onChange={(e) => setAssignedToId(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Unassigned</option>
        {developers.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      >
        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800 md:col-span-2">
        Create task
      </button>
    </form>
  );
}
