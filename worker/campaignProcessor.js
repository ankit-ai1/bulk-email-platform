import { personalize } from './personalize.js';
import { supabase, logEmail, updateCampaignCounts, updateCampaignStatus } from './logger.js';
import { classifySmtpError, PAUSE_AFTER, pickAccount, recordUse } from './allocator.js';
import { prepareHtml, recipientToken, sendSmtp } from './mailer.js';
import { emitWebhook } from './webhooks.js';

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 100;
const DELAY_BETWEEN_BATCHES = parseInt(process.env.DELAY_BETWEEN_BATCHES) || 2000;

// Tracks campaign IDs currently being processed to prevent duplicate runs
// if a campaign takes longer than the poll interval.
const activeCampaigns = new Set();

/**
 * Promote due scheduled campaigns, then process everything with status = 'sending'.
 */
export async function processCampaigns() {
  await supabase.rpc('reap_stale_recipients');

  await supabase.from('campaigns')
    .update({ status: 'sending', launched_at: new Date().toISOString() })
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());

  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'sending');

  if (error) {
    console.error('[Processor] Failed to fetch campaigns:', error.message);
    return;
  }

  const pending = (campaigns || []).filter((c) => !activeCampaigns.has(c.id));
  for (const campaign of pending) {
    activeCampaigns.add(campaign.id);
    processCampaign(campaign).finally(() => activeCampaigns.delete(campaign.id));
  }
}

/** Sent counts per account for the hour, day and month windows. Shared across all campaigns. */
export async function loadUsage(accountIds) {
  const now = Date.now();
  const windows = {
    hour: new Date(now - 3600_000).toISOString(),
    day: new Date(now - 86400_000).toISOString(),
    month: new Date(now - 30 * 86400_000).toISOString(),
  };
  const usage = {};
  await Promise.all(accountIds.map(async (id) => {
    usage[id] = { hour: 0, day: 0, month: 0 };
    await Promise.all(Object.entries(windows).map(async ([key, since]) => {
      const { count } = await supabase.from('email_events').select('id', { count: 'exact', head: true })
        .eq('smtp_account_id', id).eq('type', 'sent').gte('occurred_at', since);
      usage[id][key] = count || 0;
    }));
  }));
  return usage;
}

async function loadCampaignAccounts(campaign) {
  const { data } = await supabase.from('campaign_accounts')
    .select('daily_limit, priority, smtp_accounts(*)')
    .eq('campaign_id', campaign.id)
    .eq('org_id', campaign.org_id);
  return (data || [])
    .filter((row) => row.smtp_accounts?.org_id === campaign.org_id)
    .map((row) => ({ ...row.smtp_accounts, campaign_daily_limit: row.daily_limit, priority: row.priority }));
}

async function markAccountResult(account, ok, message) {
  if (ok) {
    if (account.consecutive_failures > 0 || account.status !== 'healthy') {
      account.consecutive_failures = 0;
      account.status = 'healthy';
      await supabase.from('smtp_accounts').update({ consecutive_failures: 0, status: 'healthy', last_error: null }).eq('id', account.id);
    }
    return;
  }
  account.consecutive_failures += 1;
  account.status = account.consecutive_failures >= PAUSE_AFTER ? 'paused' : 'degraded';
  await supabase.from('smtp_accounts').update({
    consecutive_failures: account.consecutive_failures, status: account.status, last_error: String(message).slice(0, 500),
  }).eq('id', account.id);
  if (account.status === 'paused') {
    await supabase.rpc('notify_org_admins', {
      p_org: account.org_id, p_title: `Sending paused on ${account.label}`,
      p_body: `${PAUSE_AFTER} consecutive failures: ${String(message).slice(0, 160)}`, p_link: '/infrastructure', p_severity: 'error',
    });
  }
}

async function pauseCampaign(campaign, reason, status = 'paused') {
  await supabase.from('campaigns').update({ status, status_reason: reason }).eq('id', campaign.id);
  await supabase.rpc('notify_org_admins', {
    p_org: campaign.org_id, p_title: `Campaign "${campaign.name}" ${status}`, p_body: reason, p_link: `/campaigns/${campaign.id}`, p_severity: 'warning',
  });
}

const releaseRecipients = (ids) => (ids.length
  ? supabase.from('campaign_recipients').update({ status: 'pending', claimed_at: null }).in('id', ids)
  : null);

async function processCampaign(campaign) {
  try {
    const { data: template } = await supabase.from('templates').select('*')
      .eq('id', campaign.template_id).eq('org_id', campaign.org_id).maybeSingle();
    if (!template && !campaign.html_override) {
      await pauseCampaign(campaign, 'Its template no longer exists', 'failed');
      return;
    }
    const { data: templateB } = campaign.template_b_id
      ? await supabase.from('templates').select('*').eq('id', campaign.template_b_id).eq('org_id', campaign.org_id).maybeSingle()
      : { data: null };
    const { data: organization } = await supabase.from('organizations').select('name, brand_name, address').eq('id', campaign.org_id).single();

    if (!campaign.recipients_built_at) {
      await supabase.rpc('build_campaign_recipients', { p_campaign: campaign.id });
    }

    const accounts = await loadCampaignAccounts(campaign);
    if (accounts.length === 0) {
      await pauseCampaign(campaign, 'No SMTP account is selected for this campaign');
      return;
    }
    const usage = await loadUsage(accounts.map((a) => a.id));

    for (;;) {
      const { data: fresh } = await supabase.from('campaigns').select('status').eq('id', campaign.id).single();
      if (fresh?.status !== 'sending') return; // paused or stopped from the UI

      const { data: claimed, error } = await supabase.rpc('claim_recipients', { p_campaign: campaign.id, p_limit: BATCH_SIZE });
      if (error) throw new Error(error.message);
      if (!claimed || claimed.length === 0) break;

      const { data: granted } = await supabase.rpc('consume_credits', { p_org: campaign.org_id, p_n: claimed.length, p_campaign: campaign.id });
      await releaseRecipients(claimed.slice(granted || 0).map((r) => r.id));
      if (!granted) {
        await pauseCampaign(campaign, 'No email credits, or the subscription is not active. Contact Synerax.');
        return;
      }

      let refund = 0;
      let quotaExhausted = false;
      for (const recipient of claimed.slice(0, granted)) {
        if (quotaExhausted) { refund += 1; await releaseRecipients([recipient.id]); continue; }
        const outcome = await sendToRecipient({ campaign, template, templateB, organization, recipient, accounts, usage });
        if (outcome === 'quota') { quotaExhausted = true; refund += 1; await releaseRecipients([recipient.id]); }
        else if (outcome !== 'sent') refund += 1;
      }
      await supabase.rpc('refund_credits', { p_org: campaign.org_id, p_n: refund, p_campaign: campaign.id });
      await refreshCounts(campaign.id);

      if (quotaExhausted) {
        await supabase.from('campaigns').update({
          status_reason: accounts.every((a) => a.status === 'paused')
            ? 'All selected accounts are paused after repeated failures'
            : 'Waiting for the next sending window: account limits reached',
        }).eq('id', campaign.id);
        return; // next poll resumes when a window reopens
      }
      await sleep(DELAY_BETWEEN_BATCHES);
    }

    const { count: inFlight } = await supabase.from('campaign_recipients').select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign.id).in('status', ['sending', 'pending']);
    if (inFlight > 0) return;

    await refreshCounts(campaign.id);
    await supabase.from('campaigns').update({ status: 'completed', status_reason: null, completed_at: new Date().toISOString() }).eq('id', campaign.id);
    await emitWebhook(campaign.org_id, 'campaign.completed', { campaign_id: campaign.id, name: campaign.name });
    console.log(`[Processor] Campaign "${campaign.name}" completed`);
  } catch (err) {
    console.error(`[Processor] Unexpected error in campaign ${campaign.id}:`, err.message);
    await updateCampaignStatus(campaign.id, 'failed');
  }
}

async function refreshCounts(campaignId) {
  const { data } = await supabase.from('campaign_metrics').select('sent, delivered, failed').eq('campaign_id', campaignId).maybeSingle();
  if (data) await updateCampaignCounts(campaignId, { sentCount: data.sent, deliveredCount: data.delivered, failedCount: data.failed });
}

/** Returns 'sent', 'failed', 'skipped' or 'quota' (nothing attempted; credit must be returned). */
async function sendToRecipient({ campaign, template, templateB, organization, recipient, accounts, usage }) {
  // Re-checked at send time: the address may have unsubscribed since the queue was built.
  const { data: suppressed } = await supabase.from('suppressions').select('email')
    .eq('org_id', campaign.org_id).eq('email', recipient.email.toLowerCase()).maybeSingle();
  if (suppressed) {
    await supabase.from('campaign_recipients').update({ status: 'skipped', error: 'Suppressed' }).eq('id', recipient.id);
    return 'skipped';
  }

  const account = pickAccount(accounts, usage);
  if (!account) return 'quota';

  const contact = await loadContact(recipient);
  const content = recipient.variant === 'B' && templateB ? templateB : template;
  const subjectSource = recipient.variant === 'B' && campaign.subject_b ? campaign.subject_b : (campaign.subject || content?.subject);
  const subject = personalize(subjectSource, contact);
  const sourceHtml = campaign.html_override || (content.is_html ? content.body : `<p>${(content.body || '').replace(/\n/g, '<br>')}</p>`);
  const token = recipientToken(recipient.id);
  const html = prepareHtml(personalize(sourceHtml, contact, { html: true }), {
    token, organization, trackOpens: campaign.track_opens, trackClicks: campaign.track_clicks,
  });

  try {
    const messageId = await sendSmtp({ account, orgId: campaign.org_id, to: recipient.email, toName: recipient.name, subject, html, fromName: campaign.from_name, token });

    recordUse(usage, account.id);
    await markAccountResult(account, true);
    await supabase.from('campaign_recipients').update({
      status: 'sent', sent_at: new Date().toISOString(), message_id: messageId, smtp_account_id: account.id,
    }).eq('id', recipient.id);
    await supabase.from('email_events').insert({
      org_id: campaign.org_id, campaign_id: campaign.id, recipient_id: recipient.id, contact_id: recipient.contact_id,
      smtp_account_id: account.id, type: 'sent', detail: { message_id: messageId },
    });
    await logEmail({ userId: campaign.user_id, orgId: campaign.org_id, campaignId: campaign.id, email: recipient.email, recipientName: recipient.name, status: 'delivered', messageId, smtpAccountId: account.id });
    return 'sent';
  } catch (err) {
    const bounce = classifySmtpError(err);
    // A bad recipient says nothing about the account's health; a connection error does.
    if (!bounce) await markAccountResult(account, false, err.message);
    await supabase.from('campaign_recipients').update({
      status: 'failed', error: String(err.message).slice(0, 500), smtp_account_id: account.id,
    }).eq('id', recipient.id);
    if (bounce) await supabase.rpc('track_engagement', { p_recipient: recipient.id, p_type: `${bounce}_bounce`, p_machine: false, p_detail: { reason: String(err.message).slice(0, 300) } });
    await logEmail({ userId: campaign.user_id, orgId: campaign.org_id, campaignId: campaign.id, email: recipient.email, recipientName: recipient.name, status: 'failed', errorMessage: err.message, smtpAccountId: account.id });
    return 'failed';
  }
}

async function loadContact(recipient) {
  if (recipient.contact_id) {
    const { data } = await supabase.from('contacts').select('name, email, company, city, country, gender, custom_fields').eq('id', recipient.contact_id).maybeSingle();
    if (data) return data;
  }
  return { name: recipient.name, email: recipient.email };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
