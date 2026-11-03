import 'dotenv/config';

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;
const INBOX_SYNC_INTERVAL = parseInt(process.env.INBOX_SYNC_INTERVAL) || 300000;

function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ANON_KEY', 'SECRETS_KEY', 'PUBLIC_WORKER_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('[Worker] Missing required environment variables:', missing.join(', '));
    console.error('[Worker] Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

validateEnv();

// Imported after validation: these modules build the Supabase client at load time.
const { processCampaigns } = await import('./campaignProcessor.js');
const { processAutomations } = await import('./automation.js');
const { syncAllMailboxes } = await import('./inbox.js');
const { startHttpServer } = await import('./httpServer.js');

// Prevent overlapping poll cycles — if the previous cycle is still running,
// skip the next tick rather than stacking calls.
let isProcessing = false;

async function poll() {
  if (isProcessing) return;

  isProcessing = true;
  try {
    await processCampaigns();
    await processAutomations();
  } catch (err) {
    // Top-level catch: log and continue — the worker must never crash.
    console.error('[Worker] Unhandled error in poll cycle:', err.message);
  } finally {
    isProcessing = false;
  }
}

process.on('uncaughtException', (err) => {
  console.error('[Worker] Uncaught exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker] Unhandled rejection:', reason);
});

startHttpServer();

console.log('[Worker] Email worker started');

// Run immediately on startup, then on every interval tick.
poll();
setInterval(poll, POLL_INTERVAL);
setInterval(() => syncAllMailboxes().catch((err) => console.error('[Inbox]', err.message)), INBOX_SYNC_INTERVAL);
