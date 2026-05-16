import 'dotenv/config';
import { processCampaigns } from './campaignProcessor.js';
import { startHttpServer } from './httpServer.js';

const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL) || 10000;

// Prevent overlapping poll cycles — if the previous cycle is still running,
// skip the next tick rather than stacking calls.
let isProcessing = false;

async function poll() {
  if (isProcessing) return;

  isProcessing = true;
  try {
    await processCampaigns();
  } catch (err) {
    // Top-level catch: log and continue — the worker must never crash.
    console.error('[Worker] Unhandled error in poll cycle:', err.message);
  } finally {
    isProcessing = false;
  }
}

function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SENDGRID_API_KEY', 'FROM_EMAIL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error('[Worker] Missing required environment variables:', missing.join(', '));
    console.error('[Worker] Copy .env.example to .env and fill in the values.');
    process.exit(1);
  }
}

validateEnv();
startHttpServer();

console.log('[Worker] Email worker started');
console.log(`[Worker] Poll interval: ${POLL_INTERVAL}ms | Batch size: ${process.env.BATCH_SIZE || 100} | Batch delay: ${process.env.DELAY_BETWEEN_BATCHES || 2000}ms`);

// Run immediately on startup, then on every interval tick.
poll();
setInterval(poll, POLL_INTERVAL);
