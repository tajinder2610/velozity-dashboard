import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken, api, setAccessToken } from '../api/client';

interface SocketContextValue {
  socket: Socket | null;
  onlineCount: number;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, onlineCount: 0 });

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      return;
    }

    // Same access token the REST API uses, passed once at handshake (see
    // Technology_Decisions.md #2) — not re-sent per message, and never put
    // in a query string where it could end up in server access logs.
    const s = io(API_URL, {
      auth: { token: getAccessToken() },
      withCredentials: true,
    });

    s.on('presence:count', (payload: { count: number }) => setOnlineCount(payload.count));

    // The access token is short-lived (15 min, see Technology_Decisions.md
    // #5). If the socket disconnects because the token it handshook with has
    // since expired, refresh via the REST client's own refresh flow and
    // reconnect with the new one, instead of retrying forever with a token
    // that will never become valid again.
    s.on('connect_error', async (err) => {
      if (err.message === 'unauthorized') {
        try {
          const res = await api.post('/auth/refresh');
          setAccessToken(res.data.accessToken);
          s.auth = { token: res.data.accessToken };
          s.connect();
        } catch {
          // refresh failed too — user will be routed to /login by the
          // regular REST 401 handling on their next request.
        }
      }
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, onlineCount }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
