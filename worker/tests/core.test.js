import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SECRETS_KEY = crypto.randomBytes(32).toString('base64');
process.env.SUPABASE_URL = 'http://localhost:1';
process.env.SUPABASE_SERVICE_KEY = 'test';
process.env.PUBLIC_WORKER_URL = 'https://w.test';

const sec = await import('../security.js');
const { pickAccount, recordUse, classifySmtpError } = await import('../allocator.js');
const { personalize } = await import('../personalize.js');
const { prepareHtml } = await import('../mailer.js');
const { evaluateStep, normalizeSteps } = await import('../automation.js');
const { evaluateDns } = await import('../api.js');

const account = (over = {}) => ({ id: 'a', status: 'healthy', hourly_limit: 10, daily_limit: 100, monthly_limit: 1000, consecutive_failures: 0, ...over });

test('secrets round-trip, are not stored in clear, and tampering is detected', () => {
  const enc = sec.encryptSecret('hunter2');
  assert.ok(!enc.includes('hunter2'));
  assert.notEqual(enc, sec.encryptSecret('hunter2'), 'unique IV per encryption');
  assert.equal(sec.decryptSecret(enc), 'hunter2');
  const parts = enc.split('.');
  parts[3] = Buffer.from('xxxxxxx').toString('base64url');
  assert.throws(() => sec.decryptSecret(parts.join('.')));
});

test('tracking tokens cannot be forged and click URLs cannot be swapped', () => {
  const token = sec.signToken('r', 'abc');
  assert.deepEqual(sec.verifyToken(token), { kind: 'r', id: 'abc' });
  assert.equal(sec.verifyToken('r.other.' + token.split('.')[2]), null);
  assert.equal(sec.verifyToken('r.abc'), null);
  const sig = sec.signClick(token, 'https://good.test');
  assert.ok(sec.verifyClick(token, 'https://good.test', sig));
  assert.ok(!sec.verifyClick(token, 'https://evil.test', sig), 'not an open redirect');
});

test('webhook signatures reject tampering and replays', () => {
  const header = sec.signWebhook('s', '{"a":1}', 1000);
  assert.ok(sec.verifyWebhook('s', '{"a":1}', header, 1100));
  assert.ok(!sec.verifyWebhook('s', '{"a":2}', header, 1100));
  assert.ok(!sec.verifyWebhook('other', '{"a":1}', header, 1100));
  assert.ok(!sec.verifyWebhook('s', '{"a":1}', header, 2000), 'too old');
  assert.ok(!sec.verifyWebhook('s', '{"a":1}', undefined, 1100));
});

test('tenant-supplied hosts cannot reach internal networks', async () => {
  for (const ip of ['127.0.0.1', '10.0.0.5', '169.254.169.254', '192.168.1.1', '172.16.0.1', '::1', 'fd00::1', '::ffff:10.0.0.1']) {
    assert.ok(sec.isPrivateIp(ip), ip);
  }
  assert.ok(!sec.isPrivateIp('8.8.8.8'));
  await assert.rejects(sec.assertPublicHost('169.254.169.254'), /not allowed/);
});

test('rate limiter blocks over the limit, then recovers', () => {
  assert.ok(sec.rateLimit('k', 2, 1000, 0));
  assert.ok(sec.rateLimit('k', 2, 1000, 1));
  assert.ok(!sec.rateLimit('k', 2, 1000, 2));
  assert.ok(sec.rateLimit('k', 2, 1000, 1500));
});

test('rotation spreads load by utilisation and never exceeds a limit', () => {
  const accounts = [account({ id: 'a' }), account({ id: 'b', daily_limit: 50 })];
  const usage = {};
  const sent = { a: 0, b: 0 };
  for (let i = 0; i < 20; i += 1) {
    const chosen = pickAccount(accounts, usage);
    assert.ok(chosen, `send ${i}`);
    sent[chosen.id] += 1;
    recordUse(usage, chosen.id);
  }
  assert.deepEqual(sent, { a: 10, b: 10 });
  assert.equal(pickAccount(accounts, usage), null, 'all hourly caps reached: wait, do not exceed');
});

test('paused accounts and per-campaign caps are honoured; unhealthy accounts go last', () => {
  assert.equal(pickAccount([account({ status: 'paused' })], {}), null);
  assert.equal(pickAccount([account({ campaign_daily_limit: 5 })], { a: { hour: 0, day: 5, month: 5 } }), null);
  const picked = pickAccount([account({ id: 'sick', consecutive_failures: 4 }), account({ id: 'well' })], { well: { hour: 5, day: 50, month: 50 } });
  assert.equal(picked.id, 'well');
});

test('SMTP errors are classified for suppression', () => {
  assert.equal(classifySmtpError({ responseCode: 550, response: '550 5.1.1 User unknown' }), 'hard');
  assert.equal(classifySmtpError({ responseCode: 451 }), 'soft');
  assert.equal(classifySmtpError({ code: 'ECONNREFUSED' }), null);
  assert.equal(classifySmtpError({ responseCode: 535, response: 'Authentication failed' }), null);
});

test('personalization handles fallbacks, custom fields, and escapes HTML', () => {
  const c = { name: 'Asha Rao', email: 'a@x.test', company: '', custom_fields: { city: 'Pune' } };
  assert.equal(personalize('Hi {{first_name}} of {{company|your team}} in {{city}}{{nope}}', c), 'Hi Asha of your team in Pune');
  assert.equal(personalize('{{name}}', { name: '<script>x</script>' }, { html: true }), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(personalize('{{city|unknown}}', { city: 'Pune' }), 'Pune');
});

test('prepared email tracks links, keeps a working unsubscribe, and adds the footer', () => {
  const html = prepareHtml('<a href="https://site.test/?a=1&amp;b=2">go</a><a href="mailto:x@y">m</a>', { token: 'r.1.sig', organization: { name: 'Acme', address: '1 Road' } });
  assert.match(html, /https:\/\/w\.test\/t\/c\/r\.1\.sig\?u=/);
  assert.match(html, /mailto:x@y/);
  assert.match(html, /https:\/\/w\.test\/u\/r\.1\.sig/);
  assert.match(html, /Acme · 1 Road/);
  assert.match(html, /t\/o\/r\.1\.sig\.gif/);
  const off = prepareHtml('<a href="https://site.test">go</a>', { token: 't', trackOpens: false, trackClicks: false });
  assert.ok(!off.includes('/t/c/') && !off.includes('/t/o/'));
  assert.ok(off.includes('/u/t'), 'unsubscribe is never optional');
});

test('workflow: click branches now; no engagement waits, then follows up', () => {
  const steps = normalizeSteps([
    { type: 'send', subject: 'first', body: 'x' },
    { type: 'condition', event: 'clicked', within_hours: 48, yes: 3, no: 'next' },
    { type: 'send', subject: 'follow up', body: 'x' },
    { type: 'send', subject: 'clicked path', body: 'x' },
  ]);
  const t0 = Date.parse('2026-01-01T00:00:00Z');
  const lastSentAt = new Date(t0).toISOString();
  const hours = (h) => t0 + h * 3600_000;
  assert.equal(evaluateStep(steps, 0, {}).action, 'send');
  assert.deepEqual(evaluateStep(steps, 1, { now: hours(1), lastSentAt, events: [{ type: 'click', occurred_at: new Date(hours(0.5)).toISOString() }] }), { action: 'goto', index: 3 });
  assert.deepEqual(evaluateStep(steps, 1, { now: hours(1), lastSentAt, events: [] }), { action: 'wait', until: hours(48) });
  assert.deepEqual(evaluateStep(steps, 1, { now: hours(49), lastSentAt, events: [] }), { action: 'goto', index: 2 });
  const scannerOnly = [{ type: 'click', occurred_at: new Date(hours(0.5)).toISOString(), detail: { machine: true } }];
  assert.equal(evaluateStep(steps, 1, { now: hours(1), lastSentAt, events: scannerOnly }).action, 'wait', 'scanner clicks do not count');
  assert.deepEqual(evaluateStep([{ type: 'wait', hours: 2 }], 0, { now: hours(1), waitedFrom: t0 }), { action: 'wait', until: hours(2) });
  assert.deepEqual(evaluateStep(steps, 9, {}), { action: 'end' });
});

test('DNS evaluation requires the exact records', () => {
  const base = { token: 'tok', publicKey: 'KEY', verifyRecords: [], rootRecords: [], dkimRecords: [], dmarcRecords: [] };
  assert.deepEqual(evaluateDns(base), { verified: false, spf_ok: false, dkim_ok: false, dmarc_ok: false, dmarc_policy: null });
  const ok = evaluateDns({ ...base, verifyRecords: ['synerax-verify=tok'], rootRecords: ['v=spf1 include:x ~all'], dkimRecords: ['v=DKIM1; k=rsa; p=KEY'], dmarcRecords: ['v=DMARC1; p=quarantine'] });
  assert.deepEqual(ok, { verified: true, spf_ok: true, dkim_ok: true, dmarc_ok: true, dmarc_policy: 'quarantine' });
});
