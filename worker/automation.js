import { supabase } from './logger.js';
import { personalize } from './personalize.js';
import { pickAccount, recordUse } from './allocator.js';
import { loadUsage } from './campaignProcessor.js';
import { automationToken, prepareHtml, sendSmtp } from './mailer.js';

const HOUR = 3600_000;

/**
 * Pure step evaluator. Returns what the run should do next:
 * { action: 'send', step } | { action: 'wait', until } | { action: 'goto', index } | { action: 'end' }
 * Steps: send {subject, body}; wait {hours};
 * condition {event, within_hours, yes, no} where yes/no are a step index, 'next' or 'end'.
 */
export function evaluateStep(steps, index, { now = Date.now(), waitedFrom, lastSentAt, events = [] }) {
  const step = steps[index];
  if (!step) return { action: 'end' };
  if (step.type === 'send') return { action: 'send', step };
  if (step.type === 'wait') {
    const until = new Date(waitedFrom ?? now).getTime() + step.hours * HOUR;
    return until > now ? { action: 'wait', until } : { action: 'goto', index: index + 1 };
  }
  if (step.type === 'condition') {
    const since = new Date(lastSentAt ?? now).getTime();
    const matched = events.some((e) => e.type === step.event && new Date(e.occurred_at).getTime() >= since && !e.detail?.machine);
    const target = (t) => (t === 'end' ? { action: 'end' } : { action: 'goto', index: t === 'next' || t === undefined ? index + 1 : Number(t) });
    if (matched) return target(step.yes);
    const deadline = since + (step.within_hours || 0) * HOUR;
    return deadline > now ? { action: 'wait', until: deadline } : target(step.no);
  }
  return { action: 'end' };
}

const EVENT_TYPE = { opened: 'open', clicked: 'click', replied: 'reply' };
export const normalizeSteps = (steps) => steps.map((s) => (s.type === 'condition' ? { ...s, event: EVENT_TYPE[s.event] || s.event } : s));

/** Enroll eligible contacts. Consent and suppression are checked here and again before each send. */
async function enroll(automation) {
  const trigger = automation.trigger || {};
  let contactIds = [];
  if (trigger.type === 'list_join' && trigger.list_id) {
    const { data } = await supabase.from('contacts').select('id')
      .eq('org_id', automation.org_id).eq('list_id', trigger.list_id).eq('status', 'active').neq('consent_status', 'denied').limit(500);
    contactIds = (data || []).map((c) => c.id);
  } else if (['campaign_open', 'campaign_click'].includes(trigger.type) && trigger.campaign_id) {
    let query = supabase.from('campaign_recipients').select('contact_id')
      .eq('org_id', automation.org_id).eq('campaign_id', trigger.campaign_id).not('contact_id', 'is', null).limit(500);
    query = trigger.type === 'campaign_click' ? query.not('first_clicked_at', 'is', null) : query.not('first_opened_at', 'is', null);
    contactIds = ((await query).data || []).map((c) => c.contact_id);
  }
  if (contactIds.length === 0) return;
  await supabase.from('automation_runs').upsert(
    contactIds.map((contact_id) => ({ org_id: automation.org_id, automation_id: automation.id, contact_id })),
    { onConflict: 'automation_id,contact_id', ignoreDuplicates: true },
  );
}

async function appendLog(run, patch, message) {
  const log = [...(run.log || []), { at: new Date().toISOString(), message }].slice(-50);
  await supabase.from('automation_runs').update({ ...patch, log }).eq('id', run.id);
}

async function advanceRun(run, automation, account, usage, organization) {
  const steps = normalizeSteps(automation.steps || []);
  let index = run.step_index;

  for (let hops = 0; hops < 20; hops += 1) {
    const { data: events } = run.last_sent_at
      ? await supabase.from('email_events').select('type, occurred_at, detail').eq('contact_id', run.contact_id).gte('occurred_at', run.last_sent_at)
      : { data: [] };
    const result = evaluateStep(steps, index, { waitedFrom: run.next_run_at, lastSentAt: run.last_sent_at, events: events || [] });

    if (result.action === 'end') return appendLog(run, { status: 'completed', step_index: index }, 'Workflow finished');
    if (result.action === 'wait') return appendLog(run, { step_index: index, next_run_at: new Date(result.until).toISOString() }, 'Waiting');
    if (result.action === 'goto') { index = result.index; run.next_run_at = new Date().toISOString(); continue; }

    const { data: contact } = await supabase.from('contacts').select('*').eq('id', run.contact_id).eq('org_id', run.org_id).maybeSingle();
    const { data: suppressed } = await supabase.from('suppressions').select('email').eq('org_id', run.org_id).eq('email', (contact?.email || '').toLowerCase()).maybeSingle();
    if (!contact || contact.status !== 'active' || contact.consent_status === 'denied' || suppressed) {
      return appendLog(run, { status: 'stopped', step_index: index }, 'Stopped: contact is unsubscribed, suppressed or without consent');
    }
    const chosen = pickAccount(account ? [account] : [], usage);
    if (!chosen) return appendLog(run, { step_index: index, next_run_at: new Date(Date.now() + HOUR).toISOString() }, 'Deferred: account limit reached');

    const { data: granted } = await supabase.rpc('consume_credits', { p_org: run.org_id, p_n: 1, p_campaign: null });
    if (!granted) return appendLog(run, { step_index: index, next_run_at: new Date(Date.now() + HOUR).toISOString() }, 'Deferred: no email credits');

    const token = automationToken(run.id);
    const body = /<[a-z][\s\S]*>/i.test(result.step.body || '') ? result.step.body : `<p>${(result.step.body || '').replace(/\n/g, '<br>')}</p>`;
    try {
      const messageId = await sendSmtp({
        account: chosen, orgId: run.org_id, to: contact.email, toName: contact.name,
        subject: personalize(result.step.subject, contact),
        html: prepareHtml(personalize(body, contact, { html: true }), { token, organization }),
        token,
      });
      recordUse(usage, chosen.id);
      const sentAt = new Date().toISOString();
      await supabase.from('email_events').insert({
        org_id: run.org_id, contact_id: run.contact_id, smtp_account_id: chosen.id, type: 'sent',
        detail: { automation_id: automation.id, automation_run: run.id, message_id: messageId },
      });
      index += 1;
      run.last_sent_at = sentAt;
      run.next_run_at = sentAt;
      await appendLog(run, { step_index: index, last_sent_at: sentAt, last_message_id: messageId, next_run_at: sentAt }, `Sent "${result.step.subject}"`);
    } catch (err) {
      await supabase.rpc('refund_credits', { p_org: run.org_id, p_n: 1, p_campaign: null });
      return appendLog(run, { status: 'failed', step_index: index }, `Send failed: ${err.message}`);
    }
  }
  return appendLog(run, { status: 'failed' }, 'Stopped: workflow loop exceeded 20 steps in one pass');
}

export async function processAutomations() {
  const { data: automations } = await supabase.from('automations').select('*').eq('status', 'active');
  for (const automation of automations || []) {
    try {
      await enroll(automation);
      const { data: runs } = await supabase.from('automation_runs').select('*')
        .eq('automation_id', automation.id).eq('status', 'running').lte('next_run_at', new Date().toISOString()).limit(100);
      if (!runs?.length) continue;
      const { data: account } = await supabase.from('smtp_accounts').select('*')
        .eq('id', automation.smtp_account_id).eq('org_id', automation.org_id).maybeSingle();
      const { data: organization } = await supabase.from('organizations').select('name, brand_name, address').eq('id', automation.org_id).single();
      const usage = account ? await loadUsage([account.id]) : {};
      for (const run of runs) await advanceRun(run, automation, account, usage, organization);
    } catch (err) {
      console.error(`[Automation] ${automation.id}:`, err.message);
    }
  }
}
