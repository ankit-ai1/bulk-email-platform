import http from 'http';
import { handleRequest } from './api.js';

const PORT = parseInt(process.env.PORT || process.env.WORKER_PORT) || 3001;

export function startHttpServer() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      console.error('[HTTP] Unhandled:', err.message);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Worker API listening on port ${PORT}`);
  });
}
