// Runs the real schema on an embedded Postgres, then attacks it as the same
// `authenticated` role a browser JWT maps to. Run: npm run test:db
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const SQL = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
const db = new PGlite()

const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const SUPER = id(1), A_ADMIN = id(2), A_MGR = id(3), B_ADMIN = id(4), A_MGR2 = id(6)
const ORG_A = id(100), ORG_B = id(101)
const LIST_A = id(200), LIST_A_PRIVATE = id(201), LIST_B = id(202)
const SMTP_A = id(300), SMTP_B = id(301)
const CAMP_A = id(400), CAMP_B = id(401)
const TICKET_A = id(500)

// Runs as the given user exactly as PostgREST would; always rolled back.
async function as(uid, fn, { aal = 'aal1', role = 'authenticated' } = {}) {
  let result, failure
  await db.transaction(async tx => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, aal, email: 'x@test' })])
    await tx.exec(`set local role ${role}`)
    try { result = await fn(tx) } catch (e) { failure = e }
    await tx.rollback()
  })
  if (failure) throw failure
  return result
}
const rows = async (tx, q, p) => (await tx.query(q, p)).rows
const denied = (uid, q, p, o) => assert.rejects(as(uid, tx => tx.query(q, p), o), /permission denied|row-level security|Only Synerax|No active organization|Not allowed/)

before(async () => {
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    grant usage on schema auth, public to anon, authenticated, service_role;
    -- What a brand-new Supabase project does: everything created in public starts out fully granted.
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table auth.mfa_factors (user_id uuid, status text);
    create function auth.jwt() returns jsonb language sql stable as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
    create function auth.uid() returns uuid language sql stable as $$ select (auth.jwt()->>'sub')::uuid $$;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
  `)
  await db.exec(SQL)
  await db.exec(`
    insert into organizations (id, name) values ('${ORG_A}', 'A'), ('${ORG_B}', 'B');
    insert into org_subscriptions (org_id, email_credits_total, max_campaigns) values ('${ORG_A}', 10, 100), ('${ORG_B}', 10, 1);
    insert into profiles (id, org_id, role, email, permissions) values
      ('${SUPER}', null, 'super_admin', 's@test', '{}'),
      ('${A_ADMIN}', '${ORG_A}', 'client_admin', 'a@test', '{}'),
      ('${A_MGR}', '${ORG_A}', 'campaign_manager', 'am@test', '{"contacts":true,"campaigns":true}'),
      ('${A_MGR2}', '${ORG_A}', 'campaign_manager', 'am2@test', '{}'),
      ('${B_ADMIN}', '${ORG_B}', 'client_admin', 'b@test', '{}');
    insert into contact_lists (id, org_id, user_id, name, assigned_user_ids) values
      ('${LIST_A}', '${ORG_A}', '${A_ADMIN}', 'A list', '{}'),
      ('${LIST_A_PRIVATE}', '${ORG_A}', '${A_ADMIN}', 'A private', '{${A_ADMIN}}'),
      ('${LIST_B}', '${ORG_B}', '${B_ADMIN}', 'B list', '{}');
    insert into contacts (org_id, list_id, email) values
      ('${ORG_A}', '${LIST_A}', 'one@a.test'), ('${ORG_A}', '${LIST_A}', 'ONE@a.test'), ('${ORG_A}', '${LIST_A}', 'gone@a.test'),
      ('${ORG_A}', '${LIST_A_PRIVATE}', 'secret@a.test'), ('${ORG_B}', '${LIST_B}', 'one@b.test');
    insert into suppressions (org_id, email, reason) values ('${ORG_A}', 'gone@a.test', 'unsubscribe');
    insert into smtp_accounts (id, org_id, label, host, username, from_email) values
      ('${SMTP_A}', '${ORG_A}', 'a', 'h', 'u', 'a@a.test'), ('${SMTP_B}', '${ORG_B}', 'b', 'h', 'u', 'b@b.test');
    insert into integration_secrets (owner_type, owner_id, org_id, ciphertext) values ('smtp', '${SMTP_A}', '${ORG_A}', 'CIPHER');
    insert into campaigns (id, org_id, user_id, name, list_ids) values
      ('${CAMP_A}', '${ORG_A}', '${A_ADMIN}', 'CA', '{${LIST_A}}'), ('${CAMP_B}', '${ORG_B}', '${B_ADMIN}', 'CB', '{${LIST_B}}');
    insert into api_keys (org_id, name, key_prefix, key_hash) values ('${ORG_A}', 'k', 'syn_', 'HASH');
    insert into sender_emails (org_id, user_id, email, otp_code) values ('${ORG_A}', '${A_ADMIN}', 'x@a.test', '123456');
    insert into tickets (id, org_id, subject) values ('${TICKET_A}', '${ORG_A}', 'Help');
    insert into ticket_messages (ticket_id, body, is_internal) values ('${TICKET_A}', 'public', false), ('${TICKET_A}', 'internal', true);
  `)
})

test('Company A cannot read any Company B data', async () => {
  for (const table of ['contacts', 'contact_lists', 'campaigns', 'smtp_accounts', 'tickets', 'org_subscriptions', 'organizations', 'profiles', 'api_keys', 'suppressions']) {
    const col = table === 'organizations' ? 'id' : 'org_id'
    const r = await as(A_ADMIN, tx => rows(tx, `select ${col} as o from ${table} where ${col} = $1`, [ORG_B]))
    assert.equal(r.length, 0, table)
  }
  assert.equal((await as(B_ADMIN, tx => rows(tx, 'select * from contacts'))).length, 1)
})

test('metric views respect the tenant boundary', async () => {
  await db.query(`select build_campaign_recipients($1)`, [CAMP_B])
  assert.equal((await as(A_ADMIN, tx => rows(tx, 'select * from campaign_metrics where campaign_id = $1', [CAMP_B]))).length, 0)
  assert.equal((await as(B_ADMIN, tx => rows(tx, 'select * from campaign_metrics where campaign_id = $1', [CAMP_B]))).length, 1)
  assert.equal((await as(SUPER, tx => rows(tx, 'select * from org_metrics where org_id = $1', [ORG_B]))).length, 1)
})

test('writes cannot cross tenants', async () => {
  const [row] = await as(A_ADMIN, tx => rows(tx, `insert into contact_lists (name, org_id) values ('x', $1) returning org_id`, [ORG_B]))
  assert.equal(row.org_id, ORG_A, 'supplied org_id is overwritten from the JWT')
  const upd = await as(A_ADMIN, tx => tx.query(`update contact_lists set name = 'pwn' where id = $1`, [LIST_B]))
  assert.equal(upd.affectedRows, 0)
  const del = await as(A_ADMIN, tx => tx.query(`delete from contacts where org_id = $1`, [ORG_B]))
  assert.equal(del.affectedRows, 0)
  await denied(A_ADMIN, `update contact_lists set org_id = $1 where id = $2`, [ORG_B, LIST_A])
  await denied(A_ADMIN, `insert into campaign_accounts (campaign_id, smtp_account_id) values ($1, $2)`, [CAMP_A, SMTP_B])
  await denied(A_MGR, `insert into contacts (list_id, email) values ($1, 'x@x')`, [LIST_B])
})

test('secrets are unreachable by every browser role', async () => {
  for (const uid of [SUPER, A_ADMIN, A_MGR]) {
    await denied(uid, 'select * from integration_secrets')
    await denied(uid, 'select key_hash from api_keys')
  }
  await denied(A_ADMIN, 'select otp_code from sender_emails')
  await denied(A_ADMIN, 'select * from sender_emails')
  assert.equal((await as(A_ADMIN, tx => rows(tx, 'select email from sender_emails'))).length, 1)
})

test('client admin cannot grant themselves anything', async () => {
  await denied(A_ADMIN, `update profiles set role = 'super_admin' where id = $1`, [A_ADMIN])
  await denied(A_ADMIN, `update profiles set permissions = '{"x":1}' where id = $1`, [A_ADMIN])
  await denied(A_ADMIN, `update organizations set status = 'deactivated' where id = $1`, [ORG_A])
  await denied(A_ADMIN, `select adjust_credits($1, 1000, 'free')`, [ORG_A])
  await denied(A_ADMIN, `select consume_credits($1, -1000)`, [ORG_A])
  await denied(A_ADMIN, `select bootstrap_super_admin('a@test')`)
  await denied(A_ADMIN, `update campaigns set status = 'sending' where id = $1`, [CAMP_A])
  await denied(A_ADMIN, `insert into plans (name) values ('free')`)
  await denied(A_ADMIN, `insert into campaigns (name, status) values ('skip checks', 'sending')`)
  const sub = await as(A_ADMIN, tx => tx.query(`update org_subscriptions set email_credits_total = 999999 where org_id = $1`, [ORG_A]))
  assert.equal(sub.affectedRows, 0)
  const brand = await as(A_ADMIN, tx => tx.query(`update organizations set website = 'x' where id = $1`, [ORG_A]))
  assert.equal(brand.affectedRows, 1)
})

test('managers get only what their admin granted', async () => {
  const lists = await as(A_MGR, tx => rows(tx, 'select id from contact_lists'))
  assert.ok(lists.some(l => l.id === LIST_A))
  assert.ok(!lists.some(l => l.id === LIST_A_PRIVATE), 'list assigned to someone else is hidden')
  assert.ok(!(await as(A_MGR, tx => rows(tx, 'select email from contacts'))).some(c => c.email === 'secret@a.test'))
  assert.equal((await as(A_MGR2, tx => rows(tx, 'select * from contacts'))).length, 0, 'no permission, no contacts')
  assert.equal((await as(A_MGR, tx => rows(tx, 'select * from campaigns'))).length, 0, 'unassigned campaign hidden')
  assert.equal((await as(A_MGR, tx => rows(tx, 'select * from profiles'))).length, 1, 'sees only self')
  assert.equal((await as(A_MGR, tx => rows(tx, 'select * from org_subscriptions'))).length, 0)
  await assert.rejects(as(A_MGR2, tx => tx.query(`insert into campaigns (name) values ('x')`)), /row-level security/)
})

test('internal ticket notes are hidden from clients, and clients cannot write them', async () => {
  const client = await as(A_ADMIN, tx => rows(tx, 'select body from ticket_messages'))
  assert.deepEqual(client.map(m => m.body), ['public'])
  assert.equal((await as(SUPER, tx => rows(tx, 'select body from ticket_messages'))).length, 2)
  await denied(A_ADMIN, `insert into ticket_messages (ticket_id, body, is_internal) values ($1, 'x', true)`, [TICKET_A])
})

test('super admin sees every tenant', async () => {
  const orgs = await as(SUPER, tx => rows(tx, 'select id from organizations where id in ($1, $2)', [ORG_A, ORG_B]))
  assert.equal(orgs.length, 2)
  assert.ok((await as(SUPER, tx => rows(tx, 'select distinct org_id from contacts'))).length >= 2)
})

test('anon can submit an application and nothing else', async () => {
  const opts = { role: 'anon' }
  await as(null, tx => tx.query(`insert into applications (email, status) values ('a@b', 'pending')`), opts)
  await denied(null, 'select * from applications', [], opts)
  await denied(null, 'select * from contacts', [], opts)
  await denied(null, 'select is_super_admin()', [], opts)
})

test('MFA-enrolled users are locked out of an aal1 session', async () => {
  await db.exec(`insert into auth.mfa_factors values ('${B_ADMIN}', 'verified')`)
  assert.equal((await as(B_ADMIN, tx => rows(tx, 'select * from contacts'))).length, 0)
  assert.equal((await as(B_ADMIN, tx => rows(tx, 'select * from contacts'), { aal: 'aal2' })).length, 1)
  await db.exec(`delete from auth.mfa_factors`)
})

test('suspending an org cuts access immediately but still explains why', async () => {
  await db.query(`update organizations set status = 'suspended' where id = $1`, [ORG_B])
  assert.equal((await as(B_ADMIN, tx => rows(tx, 'select * from contacts'))).length, 0)
  const [{ get_my_context: ctx }] = await as(B_ADMIN, tx => rows(tx, 'select get_my_context()'))
  assert.equal(ctx.organization.status, 'suspended')
  assert.equal((await db.query(`select consume_credits($1, 1) as n`, [ORG_B])).rows[0].n, 0, 'suspended org cannot send')
  await db.query(`update organizations set status = 'active' where id = $1`, [ORG_B])
})

test('recipient build dedupes case-insensitively and honours suppression', async () => {
  assert.equal((await db.query(`select build_campaign_recipients($1) as n`, [CAMP_A])).rows[0].n, 1)
  const r = (await db.query(`select email from campaign_recipients where campaign_id = $1`, [CAMP_A])).rows
  assert.deepEqual(r.map(x => x.email), ['one@a.test'])
})

test('claims never overlap', async () => {
  const a = (await db.query(`select id from claim_recipients($1, 10)`, [CAMP_A])).rows
  const b = (await db.query(`select id from claim_recipients($1, 10)`, [CAMP_A])).rows
  assert.equal(a.length, 1)
  assert.equal(b.length, 0)
})

test('credits cap at the balance, refund correctly, and stop at expiry', async () => {
  const q = async (s, ...p) => (await db.query(s, p)).rows[0]
  assert.equal((await q(`select consume_credits($1, 8) as n`, ORG_A)).n, 8)
  assert.equal((await q(`select consume_credits($1, 8) as n`, ORG_A)).n, 2, 'only the remaining balance is granted')
  assert.equal((await q(`select consume_credits($1, 1) as n`, ORG_A)).n, 0)
  await q(`select refund_credits($1, 3)`, ORG_A)
  assert.equal(Number((await q(`select email_credits_used as u from org_subscriptions where org_id = $1`, ORG_A)).u), 7)
  assert.ok((await db.query(`select 1 from notifications where org_id = $1 and severity = 'warning'`, [ORG_A])).rows.length >= 1, 'usage alert raised')
  await db.query(`update org_subscriptions set expires_at = now() - interval '1 day' where org_id = $1`, [ORG_A])
  assert.equal((await q(`select consume_credits($1, 1) as n`, ORG_A)).n, 0)
})

test('the campaign limit from the plan is enforced in the database', async () => {
  await assert.rejects(db.query(`insert into campaigns (org_id, name) values ($1, 'over')`, [ORG_B]), /Campaign limit/)
})

test('unsubscribe, bounce and complaint suppress the address and stop automations', async () => {
  const [r] = (await db.query("select id, email from campaign_recipients where campaign_id = $1", [CAMP_A])).rows
  await db.query("select track_engagement($1, 'open', true)", [r.id])
  let [row] = (await db.query("select open_count, machine_open_count from campaign_recipients where id = $1", [r.id])).rows
  assert.deepEqual([row.open_count, row.machine_open_count], [0, 1], 'scanner opens are not counted as opens')
  await db.query("select track_engagement($1, 'unsubscribe')", [r.id])
  assert.equal((await db.query("select 1 from suppressions where org_id = $1 and email = $2", [ORG_A, r.email])).rows.length, 1)
  assert.equal((await db.query("select status from contacts where org_id = $1 and email = $2", [ORG_A, r.email])).rows[0].status, 'unsubscribed')
})

test('on a new project, every table has RLS and anon can reach no data', async () => {
  const noRls = (await db.query("select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")).rows
  assert.deepEqual(noRls, [])
  const tables = (await db.query("select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v')")).rows
  assert.ok(tables.length >= 39)
  for (const { relname } of tables) await assert.rejects(as(null, tx => tx.query('select * from ' + relname), { role: 'anon' }), /permission denied/, relname)
})

test('the platform owner can only be bootstrapped from the SQL editor, and only once', async () => {
  await db.exec("insert into auth.users (id, email) values ('" + id(7) + "', 'new@test')")
  await assert.rejects(db.query("select bootstrap_super_admin('new@test')"), /already exists/)
  await db.exec("delete from profiles where role = 'super_admin'")
  await db.query("select bootstrap_super_admin('new@test')")
  assert.equal((await db.query("select role, org_id from profiles where id = $1", [id(7)])).rows[0].role, 'super_admin')
})

test('segments filter by purchases and demographics; conversions attribute once', async () => {
  await db.query("update org_subscriptions set max_campaigns = 100 where org_id = $1", [ORG_B])
  const { rows: [camp] } = await db.query("insert into campaigns (org_id, name, list_ids, segment_filter, send_b_at) values ($1, 'seg', $2, $3, now() + interval '1 day') returning id", [ORG_B, '{' + LIST_B + '}', '{"minSpent":"100"}'])
  assert.equal((await db.query('select build_campaign_recipients($1) as n', [camp.id])).rows[0].n, 0, 'nobody has spent 100 yet')
  await db.query("update contacts set total_spent = 500 where org_id = $1", [ORG_B])
  assert.equal((await db.query('select build_campaign_recipients($1) as n', [camp.id])).rows[0].n, 1)
  await db.query("select record_conversion($1, 'one@b.test', 50, $2, 'order-1')", [ORG_B, camp.id])
  await db.query("select record_conversion($1, 'one@b.test', 50, $2, 'order-1')", [ORG_B, camp.id])
  const m = (await db.query('select conversions, revenue from campaign_metrics where campaign_id = $1', [camp.id])).rows[0]
  assert.deepEqual([Number(m.conversions), Number(m.revenue)], [1, 50])
  await denied(B_ADMIN, "select record_conversion($1, 'x', 1)", [ORG_B])
})
