import React, { useEffect, useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ActivityApi } from '../api/endpoints';
import { useSocket } from '../context/SocketContext';
import { ActivityEvent } from '../types';

export function ActivityFeed({ projectId }: { projectId?: string }) {
  const { socket } = useSocket();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const maxSeqRef = useRef<number>(0);

  // Initial load, and re-fetch anything missed (?since=<lastSeenSeq>) any
  // time the tab was backgrounded/offline and the socket reconnects — the
  // brief requires this to come from the database, not an in-memory cache,
  // which is exactly what /api/activity does.
  const loadInitial = async () => {
    const res = await ActivityApi.list({ projectId, limit: 20 });
    setEvents(res.data);
    maxSeqRef.current = res.data.reduce((m, e) => Math.max(m, e.seq), 0);
  };

  const catchUp = async () => {
    if (!maxSeqRef.current) return loadInitial();
    const res = await ActivityApi.list({ projectId, since: maxSeqRef.current, limit: 20 });
    if (res.data.length) {
      setEvents((prev) => dedupe([...res.data, ...prev]).slice(0, 20));
      maxSeqRef.current = Math.max(maxSeqRef.current, ...res.data.map((e) => e.seq));
    }
  };

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!socket) return;

    if (projectId) socket.emit('project:join', { projectId });

    const onNew = (event: ActivityEvent) => {
      if (projectId && event.projectId !== projectId) return;
      setEvents((prev) => dedupe([event, ...prev]).slice(0, 20));
      maxSeqRef.current = Math.max(maxSeqRef.current, event.seq);
    };
    const onReconnect = () => catchUp();

    socket.on('activity:new', onNew);
    socket.io.on('reconnect', onReconnect);

    return () => {
      if (projectId) socket.emit('project:leave', { projectId });
      socket.off('activity:new', onNew);
      socket.io.off('reconnect', onReconnect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, projectId]);

  return (
    <div className="space-y-2">
      {events.length === 0 && (
        <p className="text-sm text-slate-400">No activity yet.</p>
      )}
      {events.map((e) => (
        <div key={e.id} className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <span>
            {e.message}
            {e.task && <span className="text-slate-400"> · #{e.task.seq}</span>}
          </span>
          <span className="ml-3 shrink-0 whitespace-nowrap text-xs text-slate-400">
            {formatDistanceToNowStrict(new Date(e.createdAt), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}

function dedupe(events: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}
