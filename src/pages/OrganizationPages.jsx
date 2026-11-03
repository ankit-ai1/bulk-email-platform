import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Globe, KeyRound, Plus, RefreshCw, Server, Trash2, UserCog, Webhook, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api, num, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, DataTable, Empty, Field, Meter, Modal, PageHeader, Panel, Row, SecretReveal, Stat, StatGrid, Tabs, useConfirm, useLoad } from '../components/ui'
import { AuditTable } from './admin/AdminPages'

const date = v => (v ? format(new Date(v), 'MMM d, yyyy') : '—')
const stamp = v => (v ? format(new Date(v), 'MMM d, HH:mm') : 'Never')

// ── Domains & SMTP ───────────────────────────────────────────────────────────
const EMPTY_SMTP = { label: '', provider: 'custom', host: '', port: 587, secure: false, username: '', password: '', from_name: '', from_email: '', hourly_limit: 100, daily_limit: 500, monthly_limit: 10000 }
const PROVIDERS = {
  custom: {}, gmail: { host: 'smtp.gmail.com', port: 587, secure: false, daily_limit: 500 }, outlook: { host: 'smtp.office365.com', port: 587, secure: false, daily_limit: 500 },
  ses: { host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false }, sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false, username: 'apikey' },
}

function SmtpForm({ account, onClose, onSaved }) {
  const [form, setForm] = useState(account ? { ...account, password: '' } : EMPTY_SMTP)
  const [busy, setBusy] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    const { id, org_id, status, consecutive_failures, last_error, last_tested_at, created_by, created_at, ...body } = form
    if (account && !body.password) delete body.password
    const ok = await attempt(() => (account ? api(`/api/smtp/${account.id}`, { method: 'PATCH', body }) : api('/api/smtp', { body })), 'SMTP account saved')
    setBusy(false)
    if (ok) onSaved(ok)
  }
  return (
    <Modal title={account ? `Edit ${account.label}` : 'Add SMTP account'} onClose={onClose} width={640}>
      <form className="ui-form" onSubmit={submit}>
        <Row>
          <Field label="Label *"><input className="input" value={form.label} onChange={set('label')} required /></Field>
          <Field label="Provider">
            <select className="input" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value, ...PROVIDERS[e.target.value] }))}>
              <option value="custom">Custom SMTP</option><option value="gmail">Google Workspace</option><option value="outlook">Microsoft 365</option><option value="ses">Amazon SES</option><option value="sendgrid">SendGrid</option>
            </select>
          </Field>
        </Row>
        <Row>
          <Field label="Host *"><input className="input" value={form.host} onChange={set('host')} required /></Field>
          <Field label="Port *"><input className="input" type="number" value={form.port} onChange={set('port')} required /></Field>
        </Row>
        <label className="ui-check"><input type="checkbox" checked={form.secure} onChange={e => setForm(f => ({ ...f, secure: e.target.checked }))} />Use implicit TLS (usually port 465). STARTTLS is required otherwise.</label>
        <Row>
          <Field label="Username *"><input className="input" value={form.username} onChange={set('username')} required autoComplete="off" /></Field>
          <Field label={account ? 'New password' : 'Password *'} hint="Encrypted before storage and never shown again."><input className="input" type="password" value={form.password} onChange={set('password')} required={!account} autoComplete="new-password" /></Field>
        </Row>
        <Row>
          <Field label="Sender name"><input className="input" value={form.from_name || ''} onChange={set('from_name')} /></Field>
          <Field label="Sender email *"><input className="input" type="email" value={form.from_email} onChange={set('from_email')} required /></Field>
        </Row>
        <Row>
          <Field label="Hourly limit"><input className="input" type="number" min="1" value={form.hourly_limit} onChange={set('hourly_limit')} /></Field>
          <Field label="Daily quota"><input className="input" type="number" min="1" value={form.daily_limit} onChange={set('daily_limit')} /></Field>
          <Field label="Monthly quota"><input className="input" type="number" min="1" value={form.monthly_limit} onChange={set('monthly_limit')} /></Field>
        </Row>
        <p className="ui-hint">Set these at or below your provider's real limits. Synerax Mail never sends past them.</p>
        <div className="ui-form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save account'}</button></div>
      </form>
    </Modal>
  )
}

const Check = ({ ok, label }) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginRight: 10, fontSize: 13 }}>{ok ? <CheckCircle2 size={15} color="var(--tone-success)" /> : <XCircle size={15} color="var(--text-muted)" />}{label}{!ok && <span className="ui-muted">missing</span>}</span>

function DnsRecord({ type, name, value, note }) {
  return <div style={{ marginBottom: 10 }}><div className="ui-muted">{type} · {name}{note ? ` · ${note}` : ''}</div><div className="ui-secret-value"><code>{value}</code></div></div>
}

function DomainRow({ domain, reload }) {
  const confirm = useConfirm()
  const [open, setOpen] = useState(!domain.verified)
  const [busy, setBusy] = useState(false)
  return (
    <Panel title={domain.domain} subtitle={`Last checked: ${stamp(domain.last_checked_at)}`} actions={<>
      <button className="btn btn-secondary btn-sm" disabled={busy} onClick={async () => {
        setBusy(true)
        if (await attempt(() => api(`/api/domains/${domain.id}/verify`), 'DNS checked')) reload()
        setBusy(false)
      }}><RefreshCw size={14} /> {busy ? 'Checking…' : 'Check DNS'}</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>{open ? 'Hide records' : 'Show records'}</button>
      <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Remove ${domain.domain}`} onClick={async () => {
        if (await confirm({ title: `Remove ${domain.domain}?`, danger: true, confirmLabel: 'Remove', message: 'Emails from this domain will no longer be DKIM-signed by Synerax Mail.' })
          && await attempt(() => api(`/api/domains/${domain.id}`, { method: 'DELETE' }), 'Domain removed')) reload()
      }}><Trash2 size={15} /></button>
    </>}>
      <div><Check ok={domain.verified} label="Ownership" /><Check ok={domain.spf_ok} label="SPF" /><Check ok={domain.dkim_ok} label="DKIM" /><Check ok={domain.dmarc_ok} label={`DMARC${domain.dmarc_policy ? ` (${domain.dmarc_policy})` : ''}`} /></div>
      {open && (
        <div style={{ marginTop: 14 }}>
          <p className="ui-muted" style={{ marginBottom: 10 }}>Add these at your DNS provider. Changes can take a few hours to appear.</p>
          <DnsRecord type="TXT" name={`_synerax.${domain.domain}`} value={`synerax-verify=${domain.verification_token}`} />
          <DnsRecord type="TXT" name={domain.domain} value="v=spf1 include:<your SMTP provider> ~all" note="use your provider's include; merge with any existing SPF record" />
          <DnsRecord type="TXT" name={`${domain.dkim_selector}._domainkey.${domain.domain}`} value={`v=DKIM1; k=rsa; p=${domain.dkim_public_key}`} />
          <DnsRecord type="TXT" name={`_dmarc.${domain.domain}`} value={`v=DMARC1; p=none; rua=mailto:dmarc@${domain.domain}`} note="start at p=none, then tighten" />
        </div>
      )}
    </Panel>
  )
}

export function InfrastructurePage() {
  const confirm = useConfirm()
  const { subscription } = useAuth()
  const [tab, setTab] = useState('smtp')
  const [smtpForm, setSmtpForm] = useState(null)
  const [newDomain, setNewDomain] = useState('')
  const { data, loading, reload } = useLoad(async () => {
    const [smtp, metrics, domains] = await Promise.all([
      supabase.from('smtp_accounts').select('*').order('created_at'), supabase.from('smtp_metrics').select('*'), supabase.from('domains').select('*').order('created_at'),
    ])
    const m = unwrap(metrics)
    return { smtp: unwrap(smtp).map(a => ({ ...a, m: m.find(x => x.smtp_account_id === a.id) || {} })), domains: unwrap(domains) }
  })

  const test = async a => {
    const r = await attempt(() => api(`/api/smtp/${a.id}/test`))
    if (r) { r.success ? (await import('react-hot-toast')).default.success('Connection works') : (await import('react-hot-toast')).default.error(r.error); reload() }
  }

  return (
    <>
      <PageHeader title="Domains & SMTP" subtitle="Your company's sending infrastructure" actions={tab === 'smtp' && <button className="btn btn-primary" onClick={() => setSmtpForm('new')}><Plus size={15} /> Add SMTP account</button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'smtp', label: 'SMTP accounts', count: data?.smtp.length }, { value: 'domains', label: 'Domains', count: data?.domains.length }]} />
      {tab === 'smtp' && <>
        {subscription && <Meter label="SMTP accounts on your plan" used={data?.smtp.length || 0} total={subscription.max_smtp} />}
        <DataTable rows={data?.smtp || []} loading={loading} searchKeys={['label', 'from_email', 'host']}
          empty={<Empty icon={Server} title="No SMTP accounts" description="Add an account to start sending." action={<button className="btn btn-primary btn-sm" onClick={() => setSmtpForm('new')}><Plus size={14} /> Add account</button>} />}
          columns={[
            { key: 'label', label: 'Account', render: a => <><div className="ui-strong">{a.label}</div><div className="ui-muted">{a.from_email}</div></> },
            { key: 'status', label: 'Health', render: a => <><Badge value={a.status} />{a.last_error && <div className="ui-muted" style={{ maxWidth: 240 }} title={a.last_error}>{a.last_error.slice(0, 60)}</div>}</> },
            { key: 'today', label: 'Today', align: 'right', sort: false, render: a => `${num(a.m.sent_today)} / ${num(a.daily_limit)}` },
            { key: 'sent', label: 'All-time', align: 'right', sort: false, render: a => num(a.m.sent) },
            { key: 'bounced', label: 'Bounced', align: 'right', sort: false, render: a => num(a.m.bounced) },
            { key: 'complaints', label: 'Complaints', align: 'right', sort: false, render: a => num(a.m.complaints) },
            { key: 'last_tested_at', label: 'Tested', render: a => stamp(a.last_tested_at) },
            { key: 'x', label: '', sort: false, render: a => (
              <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => test(a)}>Test</button>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const status = a.status === 'paused' ? 'untested' : 'paused'
                  if (await attempt(() => api(`/api/smtp/${a.id}`, { method: 'PATCH', body: { status } }), status === 'paused' ? 'Account paused' : 'Account re-enabled')) reload()
                }}>{a.status === 'paused' ? 'Enable' : 'Pause'}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setSmtpForm(a)}>Edit</button>
                <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Delete ${a.label}`} onClick={async () => {
                  if (await confirm({ title: `Delete ${a.label}?`, danger: true, confirmLabel: 'Delete', message: 'Its stored password is erased and it is removed from any campaign using it.' })
                    && await attempt(() => api(`/api/smtp/${a.id}`, { method: 'DELETE' }), 'Account deleted')) reload()
                }}><Trash2 size={14} /></button>
              </div>
            ) },
          ]} />
      </>}
      {tab === 'domains' && <>
        <form className="ui-toolbar" onSubmit={async e => {
          e.preventDefault()
          if (await attempt(() => api('/api/domains', { body: { domain: newDomain } }), 'Domain added')) { setNewDomain(''); reload() }
        }}>
          <input className="input" style={{ flex: '0 1 320px' }} aria-label="Domain" placeholder="mail.yourcompany.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} required />
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Add domain</button>
        </form>
        {data?.domains.length === 0 && <Empty icon={Globe} title="No domains yet" description="Verified domains with SPF, DKIM and DMARC land in the inbox far more reliably." />}
        {(data?.domains || []).map(d => <DomainRow key={d.id} domain={d} reload={reload} />)}
      </>}
      {smtpForm && <SmtpForm account={smtpForm === 'new' ? null : smtpForm} onClose={() => setSmtpForm(null)} onSaved={() => { setSmtpForm(null); reload() }} />}
    </>
  )
}

// ── Team ─────────────────────────────────────────────────────────────────────
const PERMISSIONS = [['campaigns', 'Campaigns'], ['contacts', 'Contacts'], ['templates', 'Templates'], ['analytics', 'Analytics'], ['automation', 'Automations'], ['inbox', 'Inbox'], ['support', 'Support tickets']]
const DEFAULT_PERMS = { campaigns: true, contacts: true, templates: true, analytics: true, automation: false, inbox: false, support: false }

function PermissionChecks({ value, onChange }) {
  return <div className="ui-checks">{PERMISSIONS.map(([k, label]) => <label key={k} className="ui-check"><input type="checkbox" checked={value[k] === true} onChange={e => onChange({ ...value, [k]: e.target.checked })} />{label}</label>)}</div>
}

export function TeamPage() {
  const confirm = useConfirm()
  const { subscription, user } = useAuth()
  const [form, setForm] = useState(null)
  const [edit, setEdit] = useState(null)
  const [secret, setSecret] = useState(null)
  const { data, loading, reload } = useLoad(async () => {
    const [users, logins] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at'),
      supabase.from('login_history').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    return { users: unwrap(users), logins: unwrap(logins) }
  })
  const users = data?.users || []
  const active = users.filter(u => u.status !== 'deactivated').length

  return (
    <>
      <PageHeader title="Team" subtitle="Campaign Managers see only what you allow" actions={<button className="btn btn-primary" onClick={() => setForm({ email: '', full_name: '', permissions: DEFAULT_PERMS })}><Plus size={15} /> Add user</button>} />
      {subscription && <Meter label="Users on your plan" used={active} total={subscription.max_users} />}
      <DataTable rows={users} loading={loading} searchKeys={['email', 'full_name']} exportName="team" empty={<Empty icon={UserCog} title="No users" />} columns={[
        { key: 'email', label: 'User', render: u => <><div className="ui-strong">{u.full_name || u.email}</div><div className="ui-muted">{u.email}</div></> },
        { key: 'role', label: 'Role', render: u => (u.role === 'client_admin' ? 'Client admin' : 'Campaign manager') },
        { key: 'status', label: 'Status', render: u => <Badge value={u.status} /> },
        { key: 'perm', label: 'Access', sort: false, csv: false, render: u => (u.role === 'client_admin' ? 'Everything' : PERMISSIONS.filter(([k]) => u.permissions?.[k]).map(([, l]) => l).join(', ') || 'None') },
        { key: 'last_login_at', label: 'Last sign-in', render: u => (u.last_login_at ? stamp(u.last_login_at) : 'Never') },
        { key: 'x', label: '', sort: false, csv: false, render: u => u.role === 'campaign_manager' && u.id !== user.id && (
          <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEdit(u)}>Permissions</button>
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              if (!await confirm({ title: 'Reset password?', message: `${u.email} will need the new temporary password to sign in.`, confirmLabel: 'Reset' })) return
              const r = await attempt(() => api(`/api/users/${u.id}/reset-password`))
              if (r) setSecret(r)
            }}>Reset</button>
            <select className="input" aria-label={`Status of ${u.email}`} style={{ width: 120, padding: '4px 8px' }} value={u.status} onChange={async e => {
              if (await attempt(() => api(`/api/users/${u.id}`, { method: 'PATCH', body: { status: e.target.value } }), 'Status updated')) reload()
            }}>{['active', 'suspended', 'deactivated'].map(s => <option key={s}>{s}</option>)}</select>
          </div>
        ) },
      ]} />
      <div style={{ height: 20 }} />
      <Panel title="Recent sign-ins">
        <DataTable rows={(data?.logins || []).map(l => ({ ...l, email: users.find(u => u.id === l.user_id)?.email }))} empty={<Empty title="No sign-ins recorded yet" />} columns={[
          { key: 'created_at', label: 'When', render: l => format(new Date(l.created_at), 'MMM d, yyyy HH:mm') }, { key: 'email', label: 'User' }, { key: 'ip', label: 'IP' }, { key: 'user_agent', label: 'Device', render: l => <span className="ui-muted">{(l.user_agent || '').slice(0, 70)}</span> },
        ]} />
      </Panel>
      {form && (
        <Modal title="Add Campaign Manager" onClose={() => setForm(null)}>
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            const r = await attempt(() => api('/api/users', { body: form }), 'User created')
            if (r) { setForm(null); setSecret(r); reload() }
          }}>
            <Field label="Full name"><input className="input" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} autoFocus /></Field>
            <Field label="Email *"><input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></Field>
            <div className="input-group"><span className="input-label">Access</span><PermissionChecks value={form.permissions} onChange={permissions => setForm({ ...form, permissions })} /></div>
            <div className="ui-form-actions"><button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary">Create login</button></div>
          </form>
        </Modal>
      )}
      {edit && (
        <Modal title={`Access for ${edit.email}`} onClose={() => setEdit(null)}>
          <PermissionChecks value={edit.permissions || {}} onChange={permissions => setEdit({ ...edit, permissions })} />
          <div className="ui-form-actions"><button className="btn btn-primary" onClick={async () => {
            if (await attempt(() => api(`/api/users/${edit.id}`, { method: 'PATCH', body: { permissions: edit.permissions } }), 'Access updated')) { setEdit(null); reload() }
          }}>Save</button></div>
        </Modal>
      )}
      {secret && <SecretReveal title="Login details" note="Share these securely. They set their own password at first sign-in. This password is not shown again."
        items={[['Email', secret.email], ['Temporary password', secret.temporary_password]]} onClose={() => setSecret(null)} />}
    </>
  )
}

// ── Plan & usage ─────────────────────────────────────────────────────────────
export function UsagePage() {
  const { subscription: s, planName, hasFeature } = useAuth()
  const [form, setForm] = useState(null)
  const { data, loading, reload } = useLoad(async () => {
    const count = async t => (await supabase.from(t).select('id', { count: 'exact', head: true })).count || 0
    const [users, smtp, campaigns, ledger, requests, invoices] = await Promise.all([
      count('profiles'), count('smtp_accounts'),
      s ? supabase.from('campaigns').select('id', { count: 'exact', head: true }).gte('created_at', s.starts_at) : { count: 0 },
      supabase.from('credit_ledger').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('credit_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    ])
    return { users, smtp, campaigns: campaigns.count || 0, ledger: unwrap(ledger), requests: unwrap(requests), invoices: unwrap(invoices) }
  })

  if (!s) return <><PageHeader title="Plan & usage" /><Empty title="No plan assigned" description="Contact Synerax to get your plan set up." /></>
  const left = s.email_credits_total - s.email_credits_used

  return (
    <>
      <PageHeader title="Plan & usage" subtitle="Your plan is managed by Synerax" actions={<>
        <button className="btn btn-secondary" onClick={() => setForm({ kind: 'upgrade', amount: '', message: '' })}>Request upgrade</button>
        <button className="btn btn-primary" onClick={() => setForm({ kind: 'credits', amount: 10000, message: '' })}>Request credits</button>
      </>} />
      <StatGrid>
        <Stat label="Plan" value={planName || '—'} hint={s.status} />
        <Stat label="Credits left" value={num(left)} hint={`of ${num(s.email_credits_total)}`} />
        <Stat label="Expires" value={s.expires_at ? date(s.expires_at) : 'No expiry'} hint={s.billing_period} />
      </StatGrid>
      <Panel title="Limits">
        <Meter label="Email credits" used={s.email_credits_used} total={s.email_credits_total} />
        <Meter label="Users" used={data?.users || 0} total={s.max_users} />
        <Meter label="SMTP accounts" used={data?.smtp || 0} total={s.max_smtp} />
        <Meter label="Campaigns this period" used={data?.campaigns || 0} total={s.max_campaigns} />
        <p className="ui-muted">Included: {[['automation', 'Automation'], ['inbox', 'Inbox'], ['ai', 'AI tools'], ['api', 'API & webhooks'], ['white_label', 'White label']].filter(([k]) => hasFeature(k)).map(([, l]) => l).join(', ') || 'Core sending'}</p>
      </Panel>
      {data?.requests.length > 0 && (
        <Panel title="Your requests"><DataTable rows={data.requests} columns={[
          { key: 'created_at', label: 'Requested', render: r => date(r.created_at) }, { key: 'kind', label: 'Type' }, { key: 'amount', label: 'Credits', align: 'right', render: r => (r.amount ? num(r.amount) : '—') }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
        ]} /></Panel>
      )}
      {data?.invoices.length > 0 && (
        <Panel title="Invoices"><DataTable rows={data.invoices} exportName="invoices" columns={[
          { key: 'number', label: 'Invoice' }, { key: 'description', label: 'Description' }, { key: 'issued_at', label: 'Issued', render: i => date(i.issued_at) }, { key: 'amount', label: 'Amount', align: 'right', render: i => `${i.currency} ${num(i.amount)}` }, { key: 'status', label: 'Status', render: i => <Badge value={i.status} /> },
        ]} /></Panel>
      )}
      <Panel title="Credit history">
        <DataTable rows={data?.ledger || []} loading={loading} exportName="credit-history" empty={<Empty title="No credit activity yet" />} columns={[
          { key: 'created_at', label: 'When', render: l => format(new Date(l.created_at), 'MMM d, yyyy HH:mm') }, { key: 'reason', label: 'Reason' }, { key: 'delta', label: 'Change', align: 'right', render: l => `${l.delta > 0 ? '+' : ''}${num(l.delta)}` },
        ]} />
      </Panel>
      {form && (
        <Modal title={form.kind === 'credits' ? 'Request more credits' : 'Request a plan upgrade'} onClose={() => setForm(null)} width={440}>
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            if (await attempt(async () => unwrap(await supabase.from('credit_requests').insert({ kind: form.kind, amount: form.amount ? Number(form.amount) : null, message: form.message })), 'Request sent to Synerax')) { setForm(null); reload() }
          }}>
            {form.kind === 'credits' && <Field label="Credits needed"><input className="input" type="number" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field>}
            <Field label="Message"><textarea className="input" rows={3} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></Field>
            <div className="ui-form-actions"><button className="btn btn-primary">Send request</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Organization settings ────────────────────────────────────────────────────
function ProfileTab() {
  const { organization, refreshContext, hasFeature } = useAuth()
  const [form, setForm] = useState({ name: organization.name || '', website: organization.website || '', industry: organization.industry || '', timezone: organization.timezone || 'UTC', address: organization.address || '', phone: organization.phone || '', brand_name: organization.brand_name || '', logo_url: organization.logo_url || '', brand_color: organization.brand_color || '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <form className="ui-form" style={{ maxWidth: 640 }} onSubmit={async e => {
      e.preventDefault()
      if (await attempt(async () => unwrap(await supabase.from('organizations').update(form).eq('id', organization.id)), 'Organization saved')) refreshContext()
    }}>
      <Field label="Company name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
      <Row><Field label="Website"><input className="input" value={form.website} onChange={set('website')} /></Field><Field label="Industry"><input className="input" value={form.industry} onChange={set('industry')} /></Field></Row>
      <Field label="Business address" hint="Appears in every email footer, as anti-spam law requires."><input className="input" value={form.address} onChange={set('address')} /></Field>
      <Row><Field label="Phone"><input className="input" value={form.phone} onChange={set('phone')} /></Field><Field label="Time zone"><input className="input" value={form.timezone} onChange={set('timezone')} /></Field></Row>
      {hasFeature('white_label') && <>
        <div className="divider" style={{ margin: '4px 0' }} />
        <Row><Field label="Brand name"><input className="input" value={form.brand_name} onChange={set('brand_name')} /></Field><Field label="Logo URL" hint="HTTPS image"><input className="input" type="url" value={form.logo_url} onChange={set('logo_url')} /></Field></Row>
      </>}
      <div><button className="btn btn-primary">Save changes</button></div>
    </form>
  )
}

function DeveloperTab() {
  const confirm = useConfirm()
  const { hasFeature } = useAuth()
  const [secret, setSecret] = useState(null)
  const [keyName, setKeyName] = useState('')
  const [hookUrl, setHookUrl] = useState('')
  const { data, reload } = useLoad(async () => {
    const [keys, hooks] = await Promise.all([
      supabase.from('api_keys').select('id, name, key_prefix, last_used_at, revoked_at, created_at').order('created_at', { ascending: false }),
      supabase.from('webhook_endpoints').select('*').order('created_at', { ascending: false }),
    ])
    return { keys: unwrap(keys), hooks: unwrap(hooks) }
  })
  if (!hasFeature('api')) return <Empty icon={KeyRound} title="API access isn't on your plan" description="Ask Synerax to enable API & webhooks." />
  return (
    <>
      <Panel title="API keys" subtitle="Send as the X-API-Key header. Endpoints: GET /v1/campaigns, GET /v1/campaigns/:id/metrics, POST /v1/contacts.">
        <form className="ui-toolbar" onSubmit={async e => {
          e.preventDefault()
          const r = await attempt(() => api('/api/api-keys', { body: { name: keyName } }))
          if (r) { setKeyName(''); setSecret({ title: 'API key created', items: [['API key', r.key]] }); reload() }
        }}>
          <input className="input" style={{ flex: '0 1 260px' }} aria-label="Key name" placeholder="Key name" value={keyName} onChange={e => setKeyName(e.target.value)} required />
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Create key</button>
        </form>
        <DataTable rows={data?.keys || []} empty={<Empty title="No API keys" />} columns={[
          { key: 'name', label: 'Name', render: k => <span className="ui-strong">{k.name}</span> }, { key: 'key_prefix', label: 'Key', render: k => <code>{k.key_prefix}…</code> },
          { key: 'last_used_at', label: 'Last used', render: k => stamp(k.last_used_at) },
          { key: 'x', label: '', sort: false, render: k => (k.revoked_at ? <Badge value="stopped">Revoked</Badge> : <button className="btn btn-ghost btn-sm" onClick={async () => {
            if (await confirm({ title: `Revoke ${k.name}?`, danger: true, confirmLabel: 'Revoke', message: 'Anything using this key stops working immediately.' })
              && await attempt(() => api(`/api/api-keys/${k.id}`, { method: 'DELETE' }), 'Key revoked')) reload()
          }}>Revoke</button>) },
        ]} />
      </Panel>
      <Panel title="Outgoing webhooks" subtitle="Signed with HMAC-SHA256 in the X-Synerax-Signature header (t=timestamp,v1=signature over `timestamp.body`).">
        <form className="ui-toolbar" onSubmit={async e => {
          e.preventDefault()
          const r = await attempt(() => api('/api/webhooks', { body: { url: hookUrl } }))
          if (r) { setHookUrl(''); setSecret({ title: 'Webhook created', items: [['Signing secret', r.signing_secret]] }); reload() }
        }}>
          <input className="input" style={{ flex: '0 1 380px' }} type="url" aria-label="Webhook URL" placeholder="https://example.com/webhooks/synerax" value={hookUrl} onChange={e => setHookUrl(e.target.value)} required />
          <button className="btn btn-primary btn-sm"><Webhook size={14} /> Add endpoint</button>
        </form>
        <DataTable rows={data?.hooks || []} empty={<Empty title="No webhooks" />} columns={[
          { key: 'url', label: 'URL', render: h => <span className="ui-mono">{h.url}</span> }, { key: 'last_status', label: 'Last response', render: h => h.last_status ?? '—' }, { key: 'last_delivery_at', label: 'Last delivery', render: h => stamp(h.last_delivery_at) },
          { key: 'x', label: '', sort: false, render: h => <button className="btn btn-ghost btn-sm" onClick={async () => { if (await attempt(() => api(`/api/webhooks/${h.id}`, { method: 'DELETE' }), 'Webhook removed')) reload() }}>Remove</button> },
        ]} />
      </Panel>
      <Panel title="Inbound bounce feed" subtitle="Point your email provider's bounce and complaint notifications here, signed with this secret.">
        <button className="btn btn-secondary btn-sm" onClick={async () => {
          const r = await attempt(() => api('/api/webhooks/inbound', { method: 'GET' }))
          if (r) setSecret({ title: 'Inbound feed', note: 'Keep the secret private.', items: [['URL', r.url], ['Signing secret', r.secret]] })
        }}>Show URL & secret</button>
      </Panel>
      {secret && <SecretReveal {...secret} onClose={() => setSecret(null)} />}
    </>
  )
}

function ActivityTab() {
  const { data, loading } = useLoad(async () => unwrap(await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500)))
  return <AuditTable rows={data || []} loading={loading} />
}

export function OrganizationPage() {
  const [tab, setTab] = useState('profile')
  return (
    <>
      <PageHeader title="Organization" subtitle="Company details, integrations and activity" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'profile', label: 'Profile & branding' }, { value: 'developer', label: 'API & webhooks' }, { value: 'activity', label: 'Activity log' }]} />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'developer' && <DeveloperTab />}
      {tab === 'activity' && <ActivityTab />}
    </>
  )
}
