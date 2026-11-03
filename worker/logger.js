import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 0 } },
  }
);

/**
 * Insert a row into email_logs for a single sent email.
 */
export async function logEmail({ userId, orgId, campaignId, email, recipientName, status, errorMessage, messageId, smtpAccountId }) {
  const { error } = await supabase.from('email_logs').insert({
    user_id: userId,
    org_id: orgId,
    campaign_id: campaignId,
    email,
    recipient_name: recipientName || null,
    status,
    error_message: errorMessage || null,
    message_id: messageId || null,
    smtp_account_id: smtpAccountId || null,
  });

  if (error) {
    console.error(`[Logger] Failed to insert email log for ${email}:`, error.message);
  }
}

/**
 * Overwrite campaign counters with the running totals tracked in memory.
 * Using absolute values (not deltas) to avoid race conditions.
 */
export async function updateCampaignCounts(campaignId, { sentCount, deliveredCount, failedCount }) {
  const { error } = await supabase
    .from('campaigns')
    .update({
      sent_count: sentCount,
      delivered_count: deliveredCount,
      failed_count: failedCount,
    })
    .eq('id', campaignId);

  if (error) {
    console.error(`[Logger] Failed to update counts for campaign ${campaignId}:`, error.message);
  }
}

/**
 * Set the status field on a campaign row.
 */
export async function updateCampaignStatus(campaignId, status) {
  const { error } = await supabase
    .from('campaigns')
    .update({ status })
    .eq('id', campaignId);

  if (error) {
    console.error(`[Logger] Failed to update status for campaign ${campaignId}:`, error.message);
  }
}

/** Audit row for worker actions, which the browser-side trigger cannot see. */
export async function audit(ctx, action, entity, entityId, detail = {}) {
  await supabase.from('audit_logs').insert({
    org_id: detail.org_id ?? ctx.profile?.org_id ?? null,
    actor_id: ctx.user?.id ?? null,
    actor_email: ctx.user?.email ?? null,
    action, entity, entity_id: entityId ? String(entityId) : null, detail, ip: ctx.ip ?? null,
  });
}
