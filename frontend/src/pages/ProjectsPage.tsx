import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProjectsApi, ReferenceApi } from '../api/endpoints';
import { Client } from '../types';
import { useAuth } from '../context/AuthContext';

export function ProjectsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => ProjectsApi.list().then((res) => res.data),
  });

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'PM') {
      ReferenceApi.clients().then((res) => setClients(res.data));
    }
  }, [user]);

  const canCreate = user?.role === 'ADMIN' || user?.role === 'PM';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Projects</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
          >
            {showForm ? 'Cancel' : 'New project'}
          </button>
        )}
      </div>

      {showForm && (
        <CreateProjectForm
          clients={clients}
          onCreated={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
          }}
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        {projects.map((p) => (
          <Link
            key={p.id}
            to={`/projects/${p.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
          >
            <p className="font-medium text-slate-800">{p.name}</p>
            <p className="text-xs text-slate-400">{p.client?.name}</p>
            <p className="mt-2 text-sm text-slate-500">{p._count?.tasks ?? 0} tasks</p>
          </Link>
        ))}
        {projects.length === 0 && <p className="text-sm text-slate-400">No projects yet.</p>}
      </div>
    </div>
  );
}

function CreateProjectForm({ clients, onCreated }: { clients: Client[]; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await ProjectsApi.create({ name, description, clientId });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Could not create project');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <input
        required
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      />
      <select
        required
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
      >
        <option value="">Select a client…</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800">
        Create project
      </button>
    </form>
  );
}
