import { supabase } from './logger.js';
import { assertPublicHost, signWebhook } from './security.js';
import { getSecret } from './mailer.js';

/** Fire-and-forget delivery to tenant endpoints, signed so receivers can verify origin. */
export async function emitWebhook(orgId, event, payload) {
  const { data: endpoints } = await supabase.from('webhook_endpoints')
    .select('id, url, events').eq('org_id', orgId).eq('is_active', true);
  await Promise.all((endpoints || [])
    .filter((e) => e.events.length === 0 || e.events.includes(event))
    .map((e) => deliver(e, event, payload)));
}

async function deliver(endpoint, event, payload) {
  let status = 0;
  try {
    await assertPublicHost(new URL(endpoint.url).hostname);
    const secret = await getSecret('webhook', endpoint.id, 'signing_secret');
    const body = JSON.stringify({ event, created_at: new Date().toISOString(), data: payload });
    const res = await fetch(endpoint.url, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
      headers: { 'Content-Type': 'application/json', 'X-Synerax-Signature': signWebhook(secret, body) },
      body,
    });
    status = res.status;
  } catch (err) {
    console.warn(`[Webhook] ${endpoint.id} failed: ${err.message}`);
  }
  await supabase.from('webhook_endpoints').update({ last_status: status, last_delivery_at: new Date().toISOString() }).eq('id', endpoint.id);
}
