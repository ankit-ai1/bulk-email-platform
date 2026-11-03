import crypto from 'crypto';
import dns from 'dns/promises';
import { supabase, audit } from './logger.js';
import {
  assertPublicHost, encryptSecret, generateApiKey, generateDkimKeys, generatePassword,
  inboundSecret, rateLimit, sha256, verifyClick, verifyToken, verifyWebhook,
} from './security.js';
import { createTransport, forgetTransport, getSecret, prepareHtml, sendSmtp } from './mailer.js';
import { personalize } from './personalize.js';
import { sendFromMailbox, syncMailbox, testImap } from './inbox.js';
import { campaignInsights, generate, suggestSegments } from './ai.js';
import { emitWebhook } from './webhooks.js';

const MANAGER_DEFAULTS = { campaigns: true, contacts: true, templates: true, analytics: true, automation: false, inbox: false, support: false };
const PERMISSION_KEYS = Object.keys(MANAGER_DEFAULTS);
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
// Security scanners fetch links and images automatically; counting them would invent engagement.
const SCANNER_UA = /bot\b|crawler|spider|scanner|barracuda|proofpoint|mimecast|symantec|safelinks|preview/i;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const must = ({ data, error }) => { if (error) fail(400, error.message); return data; };

const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

// ── Auth ─────────────────────────────────────────────────────────────────────
async function authenticate(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) fail(401, 'Sign in required');
  const { data: { user } = {}, error } = await supabase.auth.getUser(token);
  if (error || !user) fail(401, 'Session expired');

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (!profile) fail(403, 'This account is not linked to an organization');
  if (profile.status !== 'active') fail(403, 'This account is not active');

  // getUser validated the signature, so the payload can be trusted here.
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  if (claims.aal !== 'aal2') {
    const { data: mfa, error: mfaError } = await supabase.auth.admin.mfa.listFactors({ userId: user.id });
    if (mfaError) fail(503, 'Could not verify two-factor status');
    if (mfa?.factors?.some((f) => f.status === 'verified')) fail(403, 'Two-factor verification required');
  }

  let organization = null;
  let subscription = null;
  if (profile.org_id) {
    ({ data: organization } = await supabase.from('organizations').select('*').eq('id', profile.org_id).single());
    if (organization.status !== 'active') fail(403, 'This organization is suspended. Contact Synerax.');
    ({ data: subscription } = await supabase.from('org_subscriptions').select('*').eq('org_id', profile.org_id).maybeSingle());
  }
  return { user, profile, organization, subscription };
}

const isSuper = (ctx) => ctx.profile.role === 'super_admin';
const isAdmin = (ctx) => ctx.profile.role === 'client_admin';
const can = (ctx, perm) => isAdmin(ctx) || (ctx.profile.role === 'campaign_manager' && ctx.profile.permissions?.[perm] === true);

const requireSuper = (ctx) => { if (!isSuper(ctx)) fail(403, 'Synerax administrators only'); };
const requireAdmin = (ctx) => { if (!isAdmin(ctx)) fail(403, 'Client administrators only'); };
const requirePerm = (ctx, perm) => { if (!can(ctx, perm)) fail(403, 'You do not have access to this feature'); };
function requireFeature(ctx, feature) {
  if (ctx.subscription?.features?.[feature] === false || !ctx.subscription?.features?.[feature]) {
    fail(403, 'This feature is not included in your plan. Contact Synerax to upgrade.');
  }
}

/** Every tenant lookup goes through here: the service role ignores RLS, so scope explicitly. */
async function ownRow(table, id, ctx, select = '*') {
  const { data } = await supabase.from(table).select(select).eq('id', id).eq('org_id', ctx.profile.org_id).maybeSingle();
  if (!data) fail(404, 'Not found');
  return data;
}

async function ownCampaign(ctx, id) {
  requirePerm(ctx, 'campaigns');
  const campaign = await ownRow('campaigns', id, ctx);
  if (!isAdmin(ctx) && campaign.user_id !== ctx.user.id && !(campaign.assigned_user_ids || []).includes(ctx.user.id)) fail(404, 'Not found');
  return campaign;
}

// ── Users & organizations ────────────────────────────────────────────────────
async function createLogin({ email, fullName, role, orgId, permissions, createdBy }) {
  if (!isEmail(email)) fail(400, 'Enter a valid email address');
  const password = generatePassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(), password, email_confirm: true, user_metadata: { full_name: fullName || '' },
  });
  if (error) fail(400, error.message);
  const { error: profileError } = await supabase.from('profiles').insert({
    id: data.user.id, org_id: orgId, role, email: email.toLowerCase(), full_name: fullName || null,
    permissions: permissions || {}, must_change_password: true, created_by: createdBy,
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    fail(400, profileError.message);
  }
  return { id: data.user.id, email: email.toLowerCase(), temporary_password: password };
}

async function createOrganization(ctx) {
  requireSuper(ctx);
  const { name, admin_email, admin_name, plan_id, starts_at, expires_at, ...details } = ctx.body;
  if (!name?.trim()) fail(400, 'Company name is required');
  if (!plan_id) fail(400, 'Choose a subscription plan');
  const plan = must(await supabase.from('plans').select('*').eq('id', plan_id).single());

  const org = must(await supabase.from('organizations').insert({
    name: name.trim(), ...pick(details, ['website', 'industry', 'timezone', 'address', 'phone']),
  }).select().single());

  try {
    must(await supabase.from('org_subscriptions').insert({
      org_id: org.id, plan_id: plan.id, billing_period: plan.billing_period,
      starts_at: starts_at || new Date().toISOString(), expires_at: expires_at || null,
      email_credits_total: plan.email_credits, max_users: plan.max_users, max_smtp: plan.max_smtp,
      max_campaigns: plan.max_campaigns, features: plan.features,
    }));
    const login = await createLogin({ email: admin_email, fullName: admin_name, role: 'client_admin', orgId: org.id, createdBy: ctx.user.id });
    await supabase.from('credit_ledger').insert({ org_id: org.id, delta: plan.email_credits, reason: `Plan assigned: ${plan.name}`, actor_id: ctx.user.id });
    await audit(ctx, 'create', 'organization', org.id, { org_id: org.id, name: org.name });
    return { organization: org, login };
  } catch (err) {
    await supabase.from('organizations').delete().eq('id', org.id);
    throw err;
  }
}

async function targetUser(ctx, id) {
  const { data: target } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (!target || target.role === 'super_admin') fail(404, 'User not found');
  if (isSuper(ctx)) return target;
  requireAdmin(ctx);
  if (target.org_id !== ctx.profile.org_id || target.role !== 'campaign_manager') fail(404, 'User not found');
  return target;
}

async function createUser(ctx) {
  const { email, full_name, permissions, org_id } = ctx.body;
  let orgId;
  let role = 'campaign_manager';
  let subscription = ctx.subscription;
  if (isSuper(ctx)) {
    if (!org_id) fail(400, 'org_id is required');
    orgId = org_id;
    role = ctx.body.role === 'campaign_manager' ? role : 'client_admin';
    ({ data: subscription } = await supabase.from('org_subscriptions').select('*').eq('org_id', orgId).maybeSingle());
  } else {
    requireAdmin(ctx);
    orgId = ctx.profile.org_id;
  }
  const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId).neq('status', 'deactivated');
  if (subscription && count >= subscription.max_users) fail(403, `Your plan allows ${subscription.max_users} users. Request an upgrade from Synerax.`);

  const clean = { ...MANAGER_DEFAULTS, ...pick(permissions || {}, PERMISSION_KEYS) };
  const login = await createLogin({ email, fullName: full_name, role, orgId, permissions: role === 'campaign_manager' ? clean : {}, createdBy: ctx.user.id });
  await audit(ctx, 'create', 'user', login.id, { org_id: orgId, email: login.email, role });
  return login;
}

async function updateUser(ctx) {
  const target = await targetUser(ctx, ctx.params[0]);
  const { status, permissions, full_name } = ctx.body;
  const patch = {};
  if (full_name !== undefined) patch.full_name = full_name;
  if (permissions && target.role === 'campaign_manager') {
    patch.permissions = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, permissions[k] === true]));
  }
  if (status) {
    if (!['active', 'suspended', 'deactivated'].includes(status)) fail(400, 'Invalid status');
    patch.status = status;
    // Ending the auth-level session too, so an existing token stops refreshing.
    await supabase.auth.admin.updateUserById(target.id, { ban_duration: status === 'active' ? 'none' : '876000h' });
  }
  const updated = must(await supabase.from('profiles').update(patch).eq('id', target.id).select().single());
  await audit(ctx, 'update', 'user', target.id, { org_id: target.org_id, fields: Object.keys(patch), status });
  return updated;
}

async function resetUserPassword(ctx) {
  const target = await targetUser(ctx, ctx.params[0]);
  const password = generatePassword();
  const { error } = await supabase.auth.admin.updateUserById(target.id, { password });
  if (error) fail(400, error.message);
  await supabase.from('profiles').update({ must_change_password: true }).eq('id', target.id);
  await audit(ctx, 'reset_password', 'user', target.id, { org_id: target.org_id });
  return { email: target.email, temporary_password: password };
}

async function changeOwnPassword(ctx) {
  const { password } = ctx.body;
  if (typeof password !== 'string' || password.length < 10) fail(400, 'Use at least 10 characters');
  const { error } = await supabase.auth.admin.updateUserById(ctx.user.id, { password });
  if (error) fail(400, error.message);
  await supabase.from('profiles').update({ must_change_password: false }).eq('id', ctx.user.id);
  return { success: true };
}

async function recordLogin(ctx) {
  await supabase.from('login_history').insert({
    user_id: ctx.user.id, org_id: ctx.profile.org_id, ip: ctx.ip, user_agent: String(ctx.req.headers['user-agent'] || '').slice(0, 300),
  });
  await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', ctx.user.id);
  return { success: true };
}

// ── SMTP ─────────────────────────────────────────────────────────────────────
const SMTP_FIELDS = ['label', 'provider', 'host', 'port', 'secure', 'username', 'from_name', 'from_email', 'hourly_limit', 'daily_limit', 'monthly_limit'];

async function saveSecret(ownerType, ownerId, orgId, value, name = 'password') {
  must(await supabase.from('integration_secrets').upsert({
    owner_type: ownerType, owner_id: ownerId, org_id: orgId, name, ciphertext: encryptSecret(value), updated_at: new Date().toISOString(),
  }));
}

async function createSmtp(ctx) {
  requireAdmin(ctx);
  const { count } = await supabase.from('smtp_accounts').select('id', { count: 'exact', head: true }).eq('org_id', ctx.profile.org_id);
  if (ctx.subscription && count >= ctx.subscription.max_smtp) fail(403, `Your plan allows ${ctx.subscription.max_smtp} SMTP accounts. Request an upgrade from Synerax.`);
  if (!ctx.body.password) fail(400, 'Password is required');
  if (!isEmail(ctx.body.from_email)) fail(400, 'Enter a valid sender email');
  await assertPublicHost(ctx.body.host);
  const account = must(await supabase.from('smtp_accounts').insert({
    ...pick(ctx.body, SMTP_FIELDS), org_id: ctx.profile.org_id, created_by: ctx.user.id,
  }).select().single());
  await saveSecret('smtp', account.id, ctx.profile.org_id, ctx.body.password);
  await audit(ctx, 'create', 'smtp_account', account.id, { host: account.host });
  return account;
}

async function updateSmtp(ctx) {
  requireAdmin(ctx);
  const account = await ownRow('smtp_accounts', ctx.params[0], ctx);
  if (ctx.body.host) await assertPublicHost(ctx.body.host);
  const patch = pick(ctx.body, SMTP_FIELDS);
  if (ctx.body.status === 'paused' || (ctx.body.status === 'untested' && account.status === 'paused')) {
    patch.status = ctx.body.status;
    patch.consecutive_failures = 0;
  }
  const updated = must(await supabase.from('smtp_accounts').update(patch).eq('id', account.id).select().single());
  if (ctx.body.password) await saveSecret('smtp', account.id, ctx.profile.org_id, ctx.body.password);
  forgetTransport(account.id);
  await audit(ctx, 'update', 'smtp_account', account.id, { fields: Object.keys(patch) });
  return updated;
}

async function deleteSmtp(ctx) {
  requireAdmin(ctx);
  const account = await ownRow('smtp_accounts', ctx.params[0], ctx);
  await supabase.from('integration_secrets').delete().eq('owner_type', 'smtp').eq('owner_id', account.id);
  must(await supabase.from('smtp_accounts').delete().eq('id', account.id));
  forgetTransport(account.id);
  await audit(ctx, 'delete', 'smtp_account', account.id);
  return { success: true };
}

async function testSmtp(ctx) {
  requireAdmin(ctx);
  const account = await ownRow('smtp_accounts', ctx.params[0], ctx);
  const password = await getSecret('smtp', account.id);
  const now = new Date().toISOString();
  try {
    const transport = await createTransport(account, password);
    await transport.verify();
    await supabase.from('smtp_accounts').update({ status: 'healthy', consecutive_failures: 0, last_error: null, last_tested_at: now }).eq('id', account.id);
    return { success: true };
  } catch (err) {
    await supabase.from('smtp_accounts').update({ status: 'degraded', last_error: String(err.message).slice(0, 500), last_tested_at: now }).eq('id', account.id);
    return { success: false, error: err.message };
  }
}

// ── Domains ──────────────────────────────────────────────────────────────────
async function createDomain(ctx) {
  requireAdmin(ctx);
  const domain = String(ctx.body.domain || '').trim().toLowerCase();
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)) fail(400, 'Enter a valid domain, such as mail.example.com');
  const { publicKey, privateKey } = generateDkimKeys();
  const row = must(await supabase.from('domains').insert({
    org_id: ctx.profile.org_id, domain, verification_token: crypto.randomBytes(16).toString('hex'), dkim_public_key: publicKey,
  }).select().single());
  await saveSecret('domain', row.id, ctx.profile.org_id, privateKey, 'dkim_private_key');
  await audit(ctx, 'create', 'domain', row.id, { domain });
  return row;
}

const txt = async (name) => (await dns.resolveTxt(name).catch(() => [])).map((chunks) => chunks.join(''));

export function evaluateDns({ token, publicKey, verifyRecords, rootRecords, dkimRecords, dmarcRecords }) {
  const dmarc = dmarcRecords.find((r) => /^v=DMARC1/i.test(r));
  return {
    verified: verifyRecords.includes(`synerax-verify=${token}`),
    spf_ok: rootRecords.some((r) => /^v=spf1\s/i.test(r)),
    dkim_ok: dkimRecords.some((r) => r.replace(/\s/g, '').includes(publicKey)),
    dmarc_ok: Boolean(dmarc),
    dmarc_policy: dmarc?.match(/\bp=(\w+)/i)?.[1]?.toLowerCase() ?? null,
  };
}

async function verifyDomain(ctx) {
  requireAdmin(ctx);
  const row = await ownRow('domains', ctx.params[0], ctx);
  const [verifyRecords, rootRecords, dkimRecords, dmarcRecords] = await Promise.all([
    txt(`_synerax.${row.domain}`), txt(row.domain), txt(`${row.dkim_selector}._domainkey.${row.domain}`), txt(`_dmarc.${row.domain}`),
  ]);
  const result = evaluateDns({ token: row.verification_token, publicKey: row.dkim_public_key, verifyRecords, rootRecords, dkimRecords, dmarcRecords });
  return must(await supabase.from('domains').update({ ...result, last_checked_at: new Date().toISOString() }).eq('id', row.id).select().single());
}

async function deleteDomain(ctx) {
  requireAdmin(ctx);
  const row = await ownRow('domains', ctx.params[0], ctx);
  await supabase.from('integration_secrets').delete().eq('owner_type', 'domain').eq('owner_id', row.id);
  must(await supabase.from('domains').delete().eq('id', row.id));
  await audit(ctx, 'delete', 'domain', row.id, { domain: row.domain });
  return { success: true };
}

// ── API keys & webhooks ──────────────────────────────────────────────────────
async function createApiKey(ctx) {
  requireAdmin(ctx);
  requireFeature(ctx, 'api');
  const key = generateApiKey();
  const row = must(await supabase.from('api_keys').insert({
    org_id: ctx.profile.org_id, name: ctx.body.name || 'API key', key_prefix: key.slice(0, 10), key_hash: sha256(key), created_by: ctx.user.id,
  }).select('id, name, key_prefix, created_at').single());
  await audit(ctx, 'create', 'api_key', row.id);
  return { ...row, key }; // shown once; only the hash is stored
}

async function revokeApiKey(ctx) {
  requireAdmin(ctx);
  await ownRow('api_keys', ctx.params[0], ctx, 'id');
  must(await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', ctx.params[0]));
  await audit(ctx, 'revoke', 'api_key', ctx.params[0]);
  return { success: true };
}

async function createWebhook(ctx) {
  requireAdmin(ctx);
  requireFeature(ctx, 'api');
  let url;
  try { url = new URL(ctx.body.url); } catch { fail(400, 'Enter a valid URL'); }
  if (url.protocol !== 'https:') fail(400, 'Webhook URLs must use HTTPS');
  await assertPublicHost(url.hostname);
  const row = must(await supabase.from('webhook_endpoints').insert({
    org_id: ctx.profile.org_id, url: url.toString(), events: Array.isArray(ctx.body.events) ? ctx.body.events : [],
  }).select().single());
  const signing_secret = `whsec_${crypto.randomBytes(24).toString('base64url')}`;
  await saveSecret('webhook', row.id, ctx.profile.org_id, signing_secret, 'signing_secret');
  await audit(ctx, 'create', 'webhook', row.id, { url: row.url });
  return { ...row, signing_secret };
}

async function deleteWebhook(ctx) {
  requireAdmin(ctx);
  await ownRow('webhook_endpoints', ctx.params[0], ctx, 'id');
  await supabase.from('integration_secrets').delete().eq('owner_type', 'webhook').eq('owner_id', ctx.params[0]);
  must(await supabase.from('webhook_endpoints').delete().eq('id', ctx.params[0]));
  return { success: true };
}

// ── Campaign lifecycle ───────────────────────────────────────────────────────
async function launchCampaign(ctx) {
  const campaign = await ownCampaign(ctx, ctx.params[0]);
  if (!['draft', 'scheduled'].includes(campaign.status)) fail(409, 'Only draft campaigns can be launched');
  if (!campaign.subject) fail(400, 'Add a subject line first');
  if (!campaign.template_id && !campaign.html_override) fail(400, 'Choose a template first');
  if (campaign.template_id) await ownRow('templates', campaign.template_id, ctx, 'id');
  if (campaign.template_b_id) await ownRow('templates', campaign.template_b_id, ctx, 'id');

  const listIds = campaign.list_ids?.length ? campaign.list_ids : (campaign.list_id ? [campaign.list_id] : []);
  if (listIds.length === 0) fail(400, 'Choose at least one contact list');
  const { data: lists } = await supabase.from('contact_lists').select('id').in('id', listIds).eq('org_id', ctx.profile.org_id);
  if ((lists || []).length !== listIds.length) fail(400, 'A selected list does not belong to this organization');

  const { data: accounts } = await supabase.from('campaign_accounts').select('smtp_accounts(status, org_id)').eq('campaign_id', campaign.id);
  const usable = (accounts || []).filter((a) => a.smtp_accounts?.org_id === ctx.profile.org_id && a.smtp_accounts.status !== 'paused');
  if (usable.length === 0) fail(400, 'Select at least one active SMTP account');

  const sub = ctx.subscription;
  if (!sub || sub.status !== 'active' || (sub.expires_at && new Date(sub.expires_at) < new Date())) fail(403, 'Your subscription is not active. Contact Synerax.');
  if (sub.email_credits_used >= sub.email_credits_total) fail(403, 'No email credits left. Request more from Synerax.');

  const scheduledAt = ctx.body.scheduled_at ? new Date(ctx.body.scheduled_at) : null;
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) fail(400, 'Invalid schedule time');
  const future = scheduledAt && scheduledAt > new Date();

  const updated = must(await supabase.from('campaigns').update(future
    ? { status: 'scheduled', scheduled_at: scheduledAt.toISOString(), timezone: ctx.body.timezone || campaign.timezone, status_reason: null }
    : { status: 'sending', launched_at: new Date().toISOString(), status_reason: null }).eq('id', campaign.id).select().single());
  await audit(ctx, future ? 'schedule' : 'launch', 'campaign', campaign.id, { name: campaign.name });
  return updated;
}

const TRANSITIONS = { pause: [['sending', 'scheduled'], 'paused'], resume: [['paused'], 'sending'], stop: [['sending', 'paused', 'scheduled'], 'stopped'] };

async function transitionCampaign(ctx) {
  const [from, to] = TRANSITIONS[ctx.params[1]];
  const campaign = await ownCampaign(ctx, ctx.params[0]);
  if (!from.includes(campaign.status)) fail(409, `A ${campaign.status} campaign cannot be ${to}`);
  const patch = { status: to, status_reason: null };
  if (to === 'sending' && !campaign.launched_at) patch.launched_at = new Date().toISOString();
  if (to === 'stopped') {
    patch.completed_at = new Date().toISOString();
    await supabase.from('campaign_recipients').update({ status: 'skipped', error: 'Campaign stopped' }).eq('campaign_id', campaign.id).eq('status', 'pending');
  }
  const updated = must(await supabase.from('campaigns').update(patch).eq('id', campaign.id).select().single());
  await audit(ctx, ctx.params[1], 'campaign', campaign.id, { name: campaign.name });
  return updated;
}

async function duplicateCampaign(ctx) {
  const campaign = await ownCampaign(ctx, ctx.params[0]);
  const copy = pick(campaign, ['org_id', 'description', 'subject', 'subject_b', 'template_id', 'list_id', 'list_ids', 'segment_tags', 'html_override', 'from_name', 'from_email', 'send_mode', 'timezone', 'segment_filter', 'template_b_id', 'send_b_at', 'track_opens', 'track_clicks', 'assigned_user_ids']);
  const created = must(await supabase.from('campaigns').insert({
    ...copy, user_id: ctx.user.id, name: `${campaign.name} (copy)`, status: 'draft', duplicated_from: campaign.id,
  }).select().single());
  const { data: accounts } = await supabase.from('campaign_accounts').select('smtp_account_id, daily_limit, priority, org_id').eq('campaign_id', campaign.id);
  if (accounts?.length) must(await supabase.from('campaign_accounts').insert(accounts.map((a) => ({ ...a, campaign_id: created.id }))));
  return created;
}

async function testCampaign(ctx) {
  const campaign = await ownCampaign(ctx, ctx.params[0]);
  if (!isEmail(ctx.body.to)) fail(400, 'Enter a valid test address');
  if (!rateLimit(`test:${ctx.user.id}`, 20, 3600_000)) fail(429, 'Test email limit reached. Try again later.');
  const { data: link } = await supabase.from('campaign_accounts').select('smtp_accounts(*)').eq('campaign_id', campaign.id).limit(1).maybeSingle();
  const account = link?.smtp_accounts;
  if (!account || account.org_id !== ctx.profile.org_id) fail(400, 'Select an SMTP account first');
  const template = campaign.template_id ? await ownRow('templates', campaign.template_id, ctx) : null;
  const source = campaign.html_override || (template?.is_html ? template.body : `<p>${(template?.body || '').replace(/\n/g, '<br>')}</p>`);
  const sample = { name: 'Test Recipient', email: ctx.body.to, company: 'Example Inc' };
  await sendSmtp({
    account, orgId: ctx.profile.org_id, to: ctx.body.to,
    subject: `[Test] ${personalize(campaign.subject, sample)}`, html: personalize(source, sample, { html: true }), fromName: campaign.from_name,
  });
  return { success: true };
}

async function recordConversion(ctx) {
  const campaign = await ownCampaign(ctx, ctx.params[0]);
  const amount = Number(ctx.body.amount);
  if (!isEmail(ctx.body.email) || !(amount >= 0)) fail(400, 'Enter a valid email and amount');
  must(await supabase.rpc('record_conversion', { p_org: ctx.profile.org_id, p_email: ctx.body.email, p_amount: amount, p_campaign: campaign.id, p_order_ref: ctx.body.order_ref || null }));
  await audit(ctx, 'record_conversion', 'campaign', campaign.id, { amount });
  return { success: true };
}

// ── Inbox ────────────────────────────────────────────────────────────────────
async function createMailbox(ctx) {
  requireAdmin(ctx);
  requireFeature(ctx, 'inbox');
  const { label, email, imap_host, imap_port, imap_secure, username, password, smtp_account_id } = ctx.body;
  if (!isEmail(email) || !imap_host || !username || !password) fail(400, 'Email, IMAP host, username and password are required');
  if (smtp_account_id) await ownRow('smtp_accounts', smtp_account_id, ctx, 'id');
  const draft = { imap_host, imap_port: imap_port || 993, imap_secure: imap_secure !== false, username };
  try {
    await testImap(draft, password);
  } catch (err) {
    fail(400, `Could not connect: ${err.message}`);
  }
  const row = must(await supabase.from('mailboxes').insert({
    org_id: ctx.profile.org_id, label: label || email, email, smtp_account_id: smtp_account_id || null, status: 'healthy', ...draft,
  }).select().single());
  await saveSecret('mailbox', row.id, ctx.profile.org_id, password);
  await audit(ctx, 'create', 'mailbox', row.id, { email });
  syncMailbox(row).catch((err) => console.warn('[Inbox] First sync failed:', err.message));
  return row;
}

async function deleteMailbox(ctx) {
  requireAdmin(ctx);
  await ownRow('mailboxes', ctx.params[0], ctx, 'id');
  await supabase.from('integration_secrets').delete().eq('owner_type', 'mailbox').eq('owner_id', ctx.params[0]);
  must(await supabase.from('mailboxes').delete().eq('id', ctx.params[0]));
  return { success: true };
}

async function syncOwnMailbox(ctx) {
  requirePerm(ctx, 'inbox');
  const mailbox = await ownRow('mailboxes', ctx.params[0], ctx);
  if (!rateLimit(`sync:${mailbox.id}`, 6, 60000)) fail(429, 'Syncing too often');
  try {
    return { imported: await syncMailbox(mailbox) };
  } catch (err) {
    await supabase.from('mailboxes').update({ status: 'error', last_error: String(err.message).slice(0, 300) }).eq('id', mailbox.id);
    fail(502, `Sync failed: ${err.message}`);
  }
}

async function inboxSend(ctx) {
  requirePerm(ctx, 'inbox');
  const { mailbox_id, to, cc, subject, html, text, in_reply_to, references, attachments, as_draft, draft_id } = ctx.body;
  const mailbox = await ownRow('mailboxes', mailbox_id, ctx);
  const recipients = [].concat(to || []);
  if (as_draft) {
    const row = {
      org_id: ctx.profile.org_id, mailbox_id: mailbox.id, folder: 'drafts', is_read: true,
      message_id: `<draft-${crypto.randomUUID()}@synerax>`, thread_key: in_reply_to || crypto.randomUUID(), in_reply_to: in_reply_to || null,
      from_address: mailbox.email, to_addresses: recipients, cc_addresses: [].concat(cc || []), subject: subject || '(no subject)', html_body: html,
    };
    return must(await supabase.from('mail_messages').insert(row).select().single());
  }
  if (recipients.length === 0 || !recipients.every(isEmail)) fail(400, 'Enter valid recipients');
  if (JSON.stringify(attachments || []).length > 14_000_000) fail(413, 'Attachments are limited to about 10 MB');
  if (!rateLimit(`inbox:${ctx.profile.org_id}`, 200, 3600_000)) fail(429, 'Hourly inbox sending limit reached');
  const sent = await sendFromMailbox(mailbox, { to: recipients, cc, subject, html, text, inReplyTo: in_reply_to, references, attachments });
  if (draft_id) await supabase.from('mail_messages').delete().eq('id', draft_id).eq('org_id', ctx.profile.org_id).eq('folder', 'drafts');
  return sent;
}

// ── AI ───────────────────────────────────────────────────────────────────────
function aiGuard(ctx) {
  if (isSuper(ctx)) fail(403, 'AI tools run inside a client organization');
  requireFeature(ctx, 'ai');
  if (!rateLimit(`ai:${ctx.profile.org_id}`, 60, 3600_000)) fail(429, 'Hourly AI limit reached');
}
async function aiGenerate(ctx) {
  aiGuard(ctx);
  return generate(ctx.body.kind, ctx.body.input || {});
}
async function aiInsights(ctx) {
  aiGuard(ctx);
  requirePerm(ctx, 'analytics');
  return campaignInsights(ctx.profile.org_id, ctx.body.campaign_id);
}
async function aiSegments(ctx) {
  aiGuard(ctx);
  requirePerm(ctx, 'contacts');
  return suggestSegments(ctx.profile.org_id);
}

// ── Public tracking. These never reveal whether a token was valid. ───────────
function recordTracking(parsed, type, machine, detail = {}) {
  const fn = parsed.kind === 'r'
    ? supabase.rpc('track_engagement', { p_recipient: parsed.id, p_type: type, p_machine: machine, p_detail: detail })
    : supabase.rpc('track_automation_event', { p_run: parsed.id, p_type: type, p_machine: machine, p_detail: detail });
  return fn.then(({ error }) => { if (error) console.warn('[Track]', error.message); });
}

async function trackOpen(req, res, token) {
  const parsed = verifyToken(token);
  if (parsed) await recordTracking(parsed, 'open', SCANNER_UA.test(req.headers['user-agent'] || ''));
  res.writeHead(200, { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, private', 'Content-Length': GIF.length });
  res.end(GIF);
}

async function trackClick(req, res, token, query) {
  let url;
  try { url = Buffer.from(query.get('u') || '', 'base64url').toString(); } catch { url = ''; }
  const parsed = verifyToken(token);
  if (!parsed || !/^https?:\/\//i.test(url) || !verifyClick(token, url, query.get('s') || '')) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid link');
    return;
  }
  await recordTracking(parsed, 'click', SCANNER_UA.test(req.headers['user-agent'] || ''), { url });
  res.writeHead(302, { Location: url, 'Cache-Control': 'no-store' });
  res.end();
}

const page = (title, body) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="robots" content="noindex"></head>
<body style="font-family:system-ui,sans-serif;background:#f4f4fb;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:16px"><div style="background:#fff;border-radius:16px;padding:32px;max-width:420px;box-shadow:0 8px 32px rgba(0,0,0,.08);text-align:center">${body}</div></body></html>`;

async function unsubscribe(req, res, token) {
  const parsed = verifyToken(token);
  const send = (status, html) => { res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html); };
  if (!parsed) return send(400, page('Invalid link', '<h2>This link is not valid</h2>'));
  // GET only asks: mail scanners follow links, and must not unsubscribe people.
  if (req.method === 'GET') {
    return send(200, page('Unsubscribe', `<h2 style="margin-top:0">Unsubscribe?</h2><p style="color:#555">You will stop receiving these emails.</p><form method="post"><button style="background:#111827;color:#fff;border:0;border-radius:8px;padding:12px 24px;font-size:15px;cursor:pointer">Unsubscribe</button></form>`));
  }
  await recordTracking(parsed, 'unsubscribe', false);
  return send(200, page('Unsubscribed', '<h2 style="margin-top:0">You are unsubscribed</h2><p style="color:#555">You will not receive further emails from this sender.</p>'));
}

/** Bounce and complaint feed from an email provider, signed per organization. */
async function inboundEvents(req, res, orgId, raw) {
  if (!/^[0-9a-f-]{36}$/i.test(orgId) || !verifyWebhook(inboundSecret(orgId), raw, req.headers['x-synerax-signature'])) {
    return json(res, 401, { error: 'Invalid signature' });
  }
  const event = JSON.parse(raw);
  if (!['hard_bounce', 'soft_bounce', 'complaint'].includes(event.type) || !event.message_id) return json(res, 400, { error: 'Invalid event' });
  const { data: recipient } = await supabase.from('campaign_recipients').select('id').eq('org_id', orgId).eq('message_id', event.message_id).maybeSingle();
  if (recipient) {
    await supabase.rpc('track_engagement', { p_recipient: recipient.id, p_type: event.type, p_machine: false, p_detail: { reason: String(event.reason || '').slice(0, 300), source: 'webhook' } });
    await emitWebhook(orgId, `email.${event.type}`, { message_id: event.message_id });
  }
  return json(res, 200, { received: Boolean(recipient) });
}

// ── Public REST API (API-key auth) ───────────────────────────────────────────
async function publicApi(req, res, path, raw) {
  const key = req.headers['x-api-key'];
  if (!key) return json(res, 401, { error: 'Missing X-API-Key' });
  const { data: apiKey } = await supabase.from('api_keys').select('id, org_id, revoked_at').eq('key_hash', sha256(key)).maybeSingle();
  if (!apiKey || apiKey.revoked_at) return json(res, 401, { error: 'Invalid API key' });
  if (!rateLimit(`api:${apiKey.id}`, 300, 60000)) return json(res, 429, { error: 'Rate limit exceeded' });
  const { data: org } = await supabase.from('organizations').select('status').eq('id', apiKey.org_id).single();
  const { data: sub } = await supabase.from('org_subscriptions').select('features').eq('org_id', apiKey.org_id).maybeSingle();
  if (org?.status !== 'active' || !sub?.features?.api) return json(res, 403, { error: 'API access is not enabled' });
  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
  const orgId = apiKey.org_id;

  if (req.method === 'GET' && path === '/v1/campaigns') {
    const { data } = await supabase.from('campaigns').select('id, name, status, subject, launched_at, completed_at').eq('org_id', orgId).order('created_at', { ascending: false }).limit(100);
    return json(res, 200, { data });
  }
  const metrics = path.match(/^\/v1\/campaigns\/([0-9a-f-]{36})\/metrics$/i);
  if (req.method === 'GET' && metrics) {
    const { data } = await supabase.from('campaign_metrics').select('*').eq('org_id', orgId).eq('campaign_id', metrics[1]).maybeSingle();
    return data ? json(res, 200, { data }) : json(res, 404, { error: 'Not found' });
  }
  if (req.method === 'POST' && path === '/v1/conversions') {
    const { email, amount, campaign_id, order_ref } = JSON.parse(raw || '{}');
    if (!isEmail(email) || !(Number(amount) >= 0)) return json(res, 400, { error: 'email and amount are required' });
    const { data, error } = await supabase.rpc('record_conversion', { p_org: orgId, p_email: email, p_amount: Number(amount), p_campaign: campaign_id || null, p_order_ref: order_ref || null });
    return error ? json(res, 400, { error: error.message }) : json(res, 201, { data: { attributed_campaign_id: data } });
  }
  if (req.method === 'POST' && path === '/v1/contacts') {
    const { email, name, company, list_id, tags, custom_fields, consent_status, country, city, gender, birth_date, total_spent, order_count, last_purchase_at } = JSON.parse(raw || '{}');
    if (!isEmail(email) || !list_id) return json(res, 400, { error: 'email and list_id are required' });
    const { data: list } = await supabase.from('contact_lists').select('id').eq('id', list_id).eq('org_id', orgId).maybeSingle();
    if (!list) return json(res, 404, { error: 'List not found' });
    const { data: suppressed } = await supabase.from('suppressions').select('email').eq('org_id', orgId).eq('email', email.toLowerCase()).maybeSingle();
    if (suppressed) return json(res, 409, { error: 'This address has opted out' });
    const { data, error } = await supabase.from('contacts').insert({
      org_id: orgId, list_id, email: email.toLowerCase(), name, company, tags: tags || [], custom_fields: custom_fields || {}, consent_status: consent_status || 'unknown', status: 'active', country, city, gender, birth_date, total_spent: total_spent || 0, order_count: order_count || 0, last_purchase_at,
    }).select('id, email').single();
    return error ? json(res, 400, { error: error.message }) : json(res, 201, { data });
  }
  return json(res, 404, { error: 'Not found' });
}

// ── Router ───────────────────────────────────────────────────────────────────
const ID = '([0-9a-f-]{36})';
const ROUTES = [
  ['POST', /^\/api\/me\/login$/, recordLogin],
  ['POST', /^\/api\/me\/password$/, changeOwnPassword],
  ['POST', /^\/api\/admin\/orgs$/, createOrganization],
  ['POST', /^\/api\/users$/, createUser],
  ['PATCH', new RegExp(`^/api/users/${ID}$`), updateUser],
  ['POST', new RegExp(`^/api/users/${ID}/reset-password$`), resetUserPassword],
  ['POST', /^\/api\/smtp$/, createSmtp],
  ['PATCH', new RegExp(`^/api/smtp/${ID}$`), updateSmtp],
  ['DELETE', new RegExp(`^/api/smtp/${ID}$`), deleteSmtp],
  ['POST', new RegExp(`^/api/smtp/${ID}/test$`), testSmtp],
  ['POST', /^\/api\/domains$/, createDomain],
  ['POST', new RegExp(`^/api/domains/${ID}/verify$`), verifyDomain],
  ['DELETE', new RegExp(`^/api/domains/${ID}$`), deleteDomain],
  ['POST', /^\/api\/api-keys$/, createApiKey],
  ['DELETE', new RegExp(`^/api/api-keys/${ID}$`), revokeApiKey],
  ['POST', /^\/api\/webhooks$/, createWebhook],
  ['DELETE', new RegExp(`^/api/webhooks/${ID}$`), deleteWebhook],
  ['GET', /^\/api\/webhooks\/inbound$/, (ctx) => {
    requireAdmin(ctx);
    return { url: `${process.env.PUBLIC_WORKER_URL}/webhooks/events/${ctx.profile.org_id}`, secret: inboundSecret(ctx.profile.org_id) };
  }],
  ['POST', new RegExp(`^/api/campaigns/${ID}/launch$`), launchCampaign],
  ['POST', new RegExp(`^/api/campaigns/${ID}/(pause|resume|stop)$`), transitionCampaign],
  ['POST', new RegExp(`^/api/campaigns/${ID}/duplicate$`), duplicateCampaign],
  ['POST', new RegExp(`^/api/campaigns/${ID}/test$`), testCampaign],
  ['POST', new RegExp(`^/api/campaigns/${ID}/conversion$`), recordConversion],
  ['POST', /^\/api\/mailboxes$/, createMailbox],
  ['DELETE', new RegExp(`^/api/mailboxes/${ID}$`), deleteMailbox],
  ['POST', new RegExp(`^/api/mailboxes/${ID}/sync$`), syncOwnMailbox],
  ['POST', /^\/api\/inbox\/send$/, inboxSend],
  ['POST', /^\/api\/ai\/generate$/, aiGenerate],
  ['POST', /^\/api\/ai\/insights$/, aiInsights],
  ['POST', /^\/api\/ai\/segments$/, aiSegments],
];

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(new HttpError(413, 'Request too large')); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function applyCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim());
  if (allowed.includes(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
}

export async function handleRequest(req, res) {
  const url = new URL(req.url, 'http://internal');
  const path = url.pathname;
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  res.setHeader('X-Content-Type-Options', 'nosniff');

  try {
    if (req.method === 'GET' && path === '/health') return json(res, 200, { status: 'ok' });

    const open = path.match(/^\/t\/o\/([^/]+)\.gif$/);
    if (open && req.method === 'GET') return await trackOpen(req, res, open[1]);
    const click = path.match(/^\/t\/c\/([^/]+)$/);
    if (click && req.method === 'GET') return await trackClick(req, res, click[1], url.searchParams);
    const unsub = path.match(/^\/u\/([^/]+)$/);
    if (unsub && ['GET', 'POST'].includes(req.method)) {
      if (req.method === 'POST') await readBody(req, 4096);
      return await unsubscribe(req, res, unsub[1]);
    }

    if (!rateLimit(`ip:${ip}`, 600, 60000)) return json(res, 429, { error: 'Too many requests' });

    const inbound = path.match(/^\/webhooks\/events\/([^/]+)$/);
    if (inbound && req.method === 'POST') return await inboundEvents(req, res, inbound[1], await readBody(req, 1_000_000));
    if (path.startsWith('/v1/')) return await publicApi(req, res, path, req.method === 'POST' ? await readBody(req, 1_000_000) : '');

    applyCors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    for (const [method, pattern, handler] of ROUTES) {
      const match = req.method === method && path.match(pattern);
      if (!match) continue;
      const raw = method === 'GET' || method === 'DELETE' ? '' : await readBody(req, 15_000_000);
      const auth = await authenticate(req);
      if (!rateLimit(`user:${auth.user.id}`, 300, 60000)) return json(res, 429, { error: 'Too many requests' });
      let body = {};
      if (raw) { try { body = JSON.parse(raw); } catch { fail(400, 'Invalid JSON'); } }
      return json(res, 200, await handler({ ...auth, req, ip, body, params: match.slice(1) }));
    }
    return json(res, 404, { error: 'Endpoint not found' });
  } catch (err) {
    const status = err.status || (/not allowed|Could not resolve|Host is required/.test(err.message) ? 400 : 500);
    if (status >= 500) console.error(`[HTTP] ${req.method} ${path}:`, err);
    return json(res, status, { error: status >= 500 ? 'Something went wrong' : err.message });
  }
}

