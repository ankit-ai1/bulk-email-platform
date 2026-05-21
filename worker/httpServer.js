import http from 'http';
import { sendEmail } from './emailSender.js';
import { supabase } from './logger.js';

const PORT = parseInt(process.env.PORT || process.env.WORKER_PORT) || 3001;

// Helper to send response with guaranteed CORS headers
function sendWithCORS(res, statusCode, body) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };

  res.writeHead(statusCode, corsHeaders);
  res.end(JSON.stringify(body));
}

export function startHttpServer() {
  const server = http.createServer(async (req, res) => {
    try {
      // Always add CORS headers first, regardless of anything
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      };

      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Handle preflight requests - MUST be before body parsing
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      // Handle POST /send-verification-otp
      if (req.method === 'POST' && req.url === '/send-verification-otp') {
        let body = '';
        
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { email, name, userId } = JSON.parse(body);
            if (!email || !userId) {
              sendWithCORS(res, 400, { error: 'Missing email or userId' });
              return;
            }

            const { data: existing } = await supabase
              .from('sender_emails')
              .select('is_verified')
              .eq('user_id', userId)
              .eq('email', email)
              .maybeSingle();

            if (existing?.is_verified) {
              sendWithCORS(res, 400, { error: 'This email is already verified' });
              return;
            }

            if (!existing) {
              const { count } = await supabase
                .from('sender_emails')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
              if (count >= 20) {
                sendWithCORS(res, 400, { error: 'Maximum 20 sender emails allowed' });
                return;
              }
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

            const { error: dbError } = await supabase
              .from('sender_emails')
              .upsert({
                user_id: userId,
                email,
                name: name || '',
                is_verified: false,
                otp_code: otp,
                otp_expires_at: expiresAt,
              }, { onConflict: 'user_id,email' });

            if (dbError) throw new Error(dbError.message);

            await sendEmail({
              to: email,
              subject: 'Verify your sender email — MailForge',
              body: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
                <h2 style="color:#6c63ff;margin-bottom:16px;">Verify Your Email</h2>
                <p style="color:#333;">Use the code below to verify <strong>${email}</strong> as a sender in MailForge.</p>
                <div style="background:#f4f3ff;border:2px solid #6c63ff;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                  <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#6c63ff;">${otp}</span>
                </div>
                <p style="color:#888;font-size:13px;">Expires in 15 minutes. If you didn't request this, ignore this email.</p>
              </div>`,
              isHtml: true,
              fromEmail: process.env.FROM_EMAIL,
              fromName: process.env.FROM_NAME || 'MailForge',
            });

            sendWithCORS(res, 200, { success: true });
          } catch (err) {
            const detail = err.response?.body?.errors?.[0]?.message || err.message;
            sendWithCORS(res, 500, { error: detail });
          }
        });

        req.on('error', (err) => {
          sendWithCORS(res, 400, { error: 'Invalid request' });
        });
        return;
      }

      // Handle POST /verify-sender-otp
      if (req.method === 'POST' && req.url === '/verify-sender-otp') {
        let body = '';

        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { email, userId, otp } = JSON.parse(body);
            if (!email || !userId || !otp) {
              sendWithCORS(res, 400, { error: 'Missing required fields' });
              return;
            }

            const { data: record } = await supabase
              .from('sender_emails')
              .select('*')
              .eq('user_id', userId)
              .eq('email', email)
              .maybeSingle();

            if (!record) {
              sendWithCORS(res, 400, { error: 'Email not found' });
              return;
            }
            if (record.is_verified) {
              sendWithCORS(res, 400, { error: 'Email already verified' });
              return;
            }
            if (record.otp_code !== otp) {
              sendWithCORS(res, 400, { error: 'Invalid verification code' });
              return;
            }
            if (new Date(record.otp_expires_at) < new Date()) {
              sendWithCORS(res, 400, { error: 'Code expired — please resend' });
              return;
            }

            const { error: updateError } = await supabase
              .from('sender_emails')
              .update({ is_verified: true, otp_code: null, otp_expires_at: null })
              .eq('user_id', userId)
              .eq('email', email);

            if (updateError) throw new Error(updateError.message);

            sendWithCORS(res, 200, { success: true });
          } catch (err) {
            sendWithCORS(res, 500, { error: err.message });
          }
        });

        req.on('error', (err) => {
          sendWithCORS(res, 400, { error: 'Invalid request' });
        });
        return;
      }

      // Handle POST /test-email
      if (req.method === 'POST' && req.url === '/test-email') {
        let body = '';

        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { to, fromEmail, fromName } = JSON.parse(body);
            if (!to) {
              sendWithCORS(res, 400, { error: 'Missing recipient email' });
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
            sendWithCORS(res, 200, { success: true });
          } catch (err) {
            const detail = err.response?.body?.errors?.[0]?.message || err.message;
            sendWithCORS(res, 500, { error: detail });
          }
        });

        req.on('error', (err) => {
          sendWithCORS(res, 400, { error: 'Invalid request' });
        });
        return;
      }

      // Handle GET /health
      if (req.method === 'GET' && req.url === '/health') {
        sendWithCORS(res, 200, { status: 'ok' });
        return;
      }

      // 404 Not Found
      sendWithCORS(res, 404, { error: 'Endpoint not found' });
    } catch (err) {
      // Catch-all error handler
      sendWithCORS(res, 500, { error: 'Internal server error' });
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Worker API listening on port ${PORT}`);
  });
}
