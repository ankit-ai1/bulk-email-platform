import { sendEmail } from './emailSender.js';
import { personalize } from './personalize.js';
import { supabase, logEmail, updateCampaignCounts, updateCampaignStatus } from './logger.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 100;
const DELAY_BETWEEN_BATCHES = parseInt(process.env.DELAY_BETWEEN_BATCHES) || 2000;

// Tracks campaign IDs currently being processed to prevent duplicate runs
// if a campaign takes longer than the poll interval.
const activeCampaigns = new Set();

/**
 * Fetch all campaigns with status = 'sending' and process each one.
 */
export async function processCampaigns() {
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'sending');

  if (error) {
    console.error('[Processor] Failed to fetch campaigns:', error.message);
    return;
  }

  if (!campaigns || campaigns.length === 0) return;

  const pending = campaigns.filter((c) => !activeCampaigns.has(c.id));
  if (pending.length === 0) return;

  console.log(`[Processor] ${pending.length} campaign(s) queued for sending`);

  for (const campaign of pending) {
    activeCampaigns.add(campaign.id);
    processCampaign(campaign).finally(() => activeCampaigns.delete(campaign.id));
  }
}

async function processCampaign(campaign) {
  console.log(`[Processor] Starting campaign "${campaign.name}" (${campaign.id})`);

  try {
    const template = await fetchTemplate(campaign.template_id);
    if (!template) {
      console.error(`[Processor] Template ${campaign.template_id} not found — marking campaign failed`);
      await updateCampaignStatus(campaign.id, 'failed');
      return;
    }

    // Support both new multi-list (list_ids) and legacy single-list (list_id)
    const listIds = Array.isArray(campaign.list_ids) && campaign.list_ids.length > 0
      ? campaign.list_ids
      : campaign.list_id ? [campaign.list_id] : [];

    if (listIds.length === 0) {
      console.log(`[Processor] No contact lists on campaign ${campaign.id} — marking completed`);
      await updateCampaignStatus(campaign.id, 'completed');
      return;
    }

    const contacts = await fetchContacts(listIds);
    if (!contacts || contacts.length === 0) {
      console.log(`[Processor] No active contacts for campaign ${campaign.id} — marking completed`);
      await updateCampaignStatus(campaign.id, 'completed');
      return;
    }

    console.log(`[Processor] ${contacts.length} contacts found, batch size: ${BATCH_SIZE}`);

    const batches = chunk(contacts, BATCH_SIZE);
    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[Processor] Batch ${i + 1}/${batches.length} — sending ${batch.length} emails`);

      for (const contact of batch) {
        const subject = personalize(campaign.subject || template.subject, contact);
        const body = personalize(template.body, contact);

        let status = 'delivered';
        let errorMessage = null;
        let messageId = null;

        try {
          messageId = await sendWithRetry({
            to: contact.email,
            toName: contact.name,
            subject,
            body,
            isHtml: template.is_html,
            fromEmail: campaign.from_email,
            fromName: campaign.from_name,
          });
          deliveredCount++;
        } catch (err) {
          console.error(`[Processor] Failed to send to ${contact.email}: ${err.message}`);
          status = 'failed';
          errorMessage = err.message;
          failedCount++;
        }

        sentCount++;

        await logEmail({
          userId: campaign.user_id,
          campaignId: campaign.id,
          email: contact.email,
          recipientName: contact.name,
          status,
          errorMessage,
          messageId,
        });
      }

      await updateCampaignCounts(campaign.id, { sentCount, deliveredCount, failedCount });
      console.log(
        `[Processor] Batch ${i + 1} done — sent: ${sentCount} | delivered: ${deliveredCount} | failed: ${failedCount}`
      );

      if (i < batches.length - 1) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    await updateCampaignStatus(campaign.id, 'completed');
    console.log(
      `[Processor] Campaign "${campaign.name}" completed — sent: ${sentCount} | delivered: ${deliveredCount} | failed: ${failedCount}`
    );
  } catch (err) {
    console.error(`[Processor] Unexpected error in campaign ${campaign.id}:`, err.message);
    await updateCampaignStatus(campaign.id, 'failed');
  }
}

/**
 * Send email, retrying once on failure with a 1-second delay.
 */
async function sendWithRetry(params) {
  try {
    return await sendEmail(params);
  } catch (firstErr) {
    await sleep(1000);
    try {
      return await sendEmail(params);
    } catch (secondErr) {
      throw secondErr;
    }
  }
}

async function fetchTemplate(templateId) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    console.error('[Processor] Template fetch error:', error.message);
    return null;
  }
  return data;
}

async function fetchContacts(listIds) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .in('list_id', listIds)
    .eq('status', 'active');

  if (error) {
    console.error('[Processor] Contacts fetch error:', error.message);
    return null;
  }
  return data;
}

function chunk(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
