import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Insert a row into email_logs for a single sent email.
 */
export async function logEmail({ userId, campaignId, email, recipientName, status, errorMessage, messageId }) {
  const { error } = await supabase.from('email_logs').insert({
    user_id: userId,
    campaign_id: campaignId,
    email,
    recipient_name: recipientName || null,
    status,
    error_message: errorMessage || null,
    message_id: messageId || null,
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
