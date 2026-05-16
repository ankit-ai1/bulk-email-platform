import http from 'http';
import { sendEmail } from './emailSender.js';

const PORT = parseInt(process.env.WORKER_PORT) || 3001;

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/test-email') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const { to, fromEmail, fromName } = JSON.parse(body);
          if (!to) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing recipient email' }));
            return;
          }
          await sendEmail({
            to,
            subject: 'Test Email — MailForge',
            body: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                <h2 style="color:#6c63ff;">Test Email</h2>
                <p>Your SendGrid configuration is working correctly!</p>
                <p style="color:#888;font-size:13px;">Sent from <strong>MailForge</strong> worker.</p>
              </div>`,
            isHtml: true,
            fromEmail: fromEmail || process.env.FROM_EMAIL,
            fromName: fromName || process.env.FROM_NAME,
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          const detail = err.response?.body?.errors?.[0]?.message || err.message;
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: detail }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[HTTP] Worker API listening on http://127.0.0.1:${PORT}`);
  });
}
