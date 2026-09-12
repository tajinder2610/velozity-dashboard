import React from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from '../components/NotificationBell';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-bold text-slate-800">
              Velozity Dashboard
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link to="/" className="hover:text-slate-900">Dashboard</Link>
              <Link to="/projects" className="hover:text-slate-900">Projects</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-slate-500">
              {user?.name} <span className="text-slate-300">·</span> {user?.role}
            </span>
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
