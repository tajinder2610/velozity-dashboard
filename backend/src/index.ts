import 'dotenv/config';
import { createServer } from 'http';
import { createApp } from './app';
import { initSockets } from './sockets/index';
import { startOverdueScheduler } from './jobs/overdueTask.job';

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = createApp();
const httpServer = createServer(app);

// Socket.io attaches to the same HTTP server as Express — one process, one
// port. See Technology_Decisions.md #7 for why this whole server (not just
// the Express half) is deployed to a long-running host rather than Vercel.
initSockets(httpServer);
startOverdueScheduler();

httpServer.listen(PORT, () => {
  console.log(`API + WebSocket server listening on :${PORT}`);
});
