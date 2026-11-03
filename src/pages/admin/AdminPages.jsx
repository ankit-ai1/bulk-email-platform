import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Mail as MailIcon, Building2, CheckCircle2, ClipboardList, CreditCard, Landmark, Mail, MousePointerClick, Plus, Send, Ticket, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api, num, pct, unwrap } from '../../lib/api'
import { attempt, Badge, DataTable, Empty, Field, Meter, Modal, PageHeader, Panel, Row, SecretReveal, Stat, StatGrid, Tabs, useConfirm, useLoad } from '../../components/ui'
import { TrendChart } from '../../components/charts'
import { dailySeries } from '../../components/analytics'

const date = v => (v ? format(new Date(v), 'MMM d, yyyy') : '—')
const toDateInput = v => (v ? new Date(v).toISOString().slice(0, 10) : '')

// ── Overview ─────────────────────────────────────────────────────────────────
export function AdminOverviewPage() {
  const { data, loading } = useLoad(async () => {
    const [orgs, subs, metrics, daily, tickets, requests, invoices, plans] = await Promise.all([
      supabase.from('organizations').select('id, name, status, created_at'),
      supabase.from('org_subscriptions').select('*'),
      supabase.from('org_metrics').select('*'),
      supabase.from('daily_stats').select('*').gte('day', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
      supabase.from('tickets').select('status, created_at, first_response_at, resolved_at'),
      supabase.from('credit_requests').select('id').eq('status', 'pending'),
      supabase.from('invoices').select('amount, status, currency'),
      supabase.from('plans').select('id, name'),
    ])
    return { orgs: unwrap(orgs), subs: unwrap(subs), metrics: unwrap(metrics), daily: unwrap(daily), tickets: unwrap(tickets), requests: unwrap(requests), invoices: unwrap(invoices), plans: unwrap(plans) }
  })
  const navigate = useNavigate()

  const t = useMemo(() => {
    if (!data) return null
    const sum = k => data.metrics.reduce((s, m) => s + Number(m[k] || 0), 0)
    const soon = Date.now() + 14 * 86400000
    return {
      active: data.orgs.filter(o => o.status === 'active').length,
      sent: sum('sent'), delivered: sum('delivered'), clicks: sum('unique_clicks'), bounced: sum('bounced'),
      openTickets: data.tickets.filter(x => !['resolved', 'closed'].includes(x.status)).length,
      revenue: data.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0),
      outstanding: data.invoices.filter(i => i.status === 'issued').reduce((s, i) => s + Number(i.amount), 0),
      expiring: data.subs.filter(s => s.expires_at && new Date(s.expires_at).getTime() < soon),
    }
  }, [data])

  const rows = useMemo(() => (data?.orgs || []).map(o => {
    const m = data.metrics.find(x => x.org_id === o.id) || {}
    const s = data.subs.find(x => x.org_id === o.id) || {}
    return { ...o, sent: Number(m.sent || 0), clicks: Number(m.unique_clicks || 0), bounced: Number(m.bounced || 0), used: Number(s.email_credits_used || 0), total: Number(s.email_credits_total || 0), plan: data.plans.find(p => p.id === s.plan_id)?.name }
  }).sort((a, b) => b.sent - a.sent), [data])

  return (
    <>
      <PageHeader title="Platform overview" subtitle="Every client organization, in one place" actions={<Link to="/admin/companies" className="btn btn-primary"><Plus size={15} /> New client</Link>} />
      <StatGrid>
        <Stat icon={Building2} label="Active clients" value={t ? num(t.active) : '…'} hint={t && `${data.orgs.length} total`} />
        <Stat icon={Send} label="Emails sent" value={t ? num(t.sent) : '…'} hint={t && `${pct(t.delivered, t.sent)} delivered`} />
        <Stat icon={MousePointerClick} label="Unique clicks" value={t ? num(t.clicks) : '…'} hint={t && `${pct(t.clicks, t.delivered)} of delivered`} />
        <Stat icon={Mail} label="Bounced" value={t ? num(t.bounced) : '…'} hint={t && `${pct(t.bounced, t.sent)} bounce rate`} />
        <Stat icon={Ticket} label="Open tickets" value={t ? num(t.openTickets) : '…'} />
        <Stat icon={Landmark} label="Revenue collected" value={t ? num(t.revenue) : '…'} hint={t && `${num(t.outstanding)} outstanding`} />
      </StatGrid>
      {t && (t.expiring.length > 0 || data.requests.length > 0) && (
        <p className="ui-note ui-note-warn">
          {t.expiring.length > 0 && <>{t.expiring.length} subscription(s) expire within 14 days. </>}
          {data.requests.length > 0 && <Link to="/admin/requests">{data.requests.length} credit request(s) waiting.</Link>}
        </p>
      )}
      <Panel title="Platform sending, last 30 days"><TrendChart data={dailySeries(data?.daily || [])} /></Panel>
      <Panel title="Client usage">
        <DataTable loading={loading} rows={rows} searchKeys={['name']} exportName="company-usage" onRowClick={r => navigate(`/admin/companies/${r.id}`)}
          columns={[
            { key: 'name', label: 'Client', render: r => <span className="ui-strong">{r.name}</span> },
            { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
            { key: 'plan', label: 'Plan' },
            { key: 'sent', label: 'Sent', align: 'right', render: r => num(r.sent) },
            { key: 'clicks', label: 'Clicks', align: 'right', render: r => num(r.clicks) },
            { key: 'bounced', label: 'Bounced', align: 'right', render: r => num(r.bounced) },
            { key: 'used', label: 'Credits used', align: 'right', render: r => `${num(r.used)} / ${num(r.total)}` },
          ]} />
      </Panel>
    </>
  )
}

// ── Clients ────────────────────────────────────────────────────────────────
const EMPTY_COMPANY = { name: '', website: '', industry: '', timezone: 'UTC', address: '', admin_name: '', admin_email: '', plan_id: '', starts_at: new Date().toISOString().slice(0, 10), expires_at: '' }

export function CompanyForm({ initial, onClose, onCreated }) {
  const [form, setForm] = useState({ ...EMPTY_COMPANY, ...initial })
  const [saving, setSaving] = useState(false)
  const { data: plans } = useLoad(async () => unwrap(await supabase.from('plans').select('id, name, email_credits, is_active').order('name')))
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const result = await attempt(() => api('/api/admin/orgs', { body: { ...form, expires_at: form.expires_at || null } }), 'Client created')
    setSaving(false)
    if (result) onCreated(result)
  }

  return (
    <Modal title="Create client" onClose={onClose} width={620}>
      <form onSubmit={submit} className="ui-form">
        <Field label="Client name *"><input className="input" value={form.name} onChange={set('name')} required autoFocus /></Field>
        <Row>
          <Field label="Website"><input className="input" value={form.website} onChange={set('website')} /></Field>
          <Field label="Industry"><input className="input" value={form.industry} onChange={set('industry')} /></Field>
        </Row>
        <Field label="Business address" hint="Printed in every email footer, as anti-spam law requires."><input className="input" value={form.address} onChange={set('address')} /></Field>
        <Row>
          <Field label="Client Admin name"><input className="input" value={form.admin_name} onChange={set('admin_name')} /></Field>
          <Field label="Client Admin email *"><input className="input" type="email" value={form.admin_email} onChange={set('admin_email')} required /></Field>
        </Row>
        <Row>
          <Field label="Plan *">
            <select className="input" value={form.plan_id} onChange={set('plan_id')} required>
              <option value="">Select…</option>
              {(plans || []).filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} ({num(p.email_credits)} credits)</option>)}
            </select>
          </Field>
          <Field label="Starts"><input className="input" type="date" value={form.starts_at} onChange={set('starts_at')} /></Field>
          <Field label="Expires"><input className="input" type="date" value={form.expires_at} onChange={set('expires_at')} /></Field>
        </Row>
        {plans?.length === 0 && <p className="ui-note ui-note-warn">Create a plan first. <Link to="/admin/plans">Go to plans</Link></p>}
        <div className="ui-form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create client & login'}</button>
        </div>
      </form>
    </Modal>
  )
}

export function CompaniesPage() {
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [login, setLogin] = useState(null)
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    const [orgs, subs, profiles, plans] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at', { ascending: false }),
      supabase.from('org_subscriptions').select('org_id, plan_id, status, expires_at, email_credits_total, email_credits_used'),
      supabase.from('profiles').select('org_id'),
      supabase.from('plans').select('id, name'),
    ])
    const subsRows = unwrap(subs), users = unwrap(profiles), planRows = unwrap(plans)
    return unwrap(orgs).map(o => {
      const s = subsRows.find(x => x.org_id === o.id) || {}
      return { ...o, sub: s, plan: planRows.find(p => p.id === s.plan_id)?.name, users: users.filter(u => u.org_id === o.id).length }
    })
  })
  const rows = (data || []).filter(o => !status || o.status === status)

  return (
    <>
      <PageHeader title="Clients" subtitle="Client organizations on Synerax Mail" actions={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> New client</button>} />
      <DataTable loading={loading} error={error} onRetry={reload} rows={rows} searchKeys={['name', 'website', 'industry']} exportName="companies"
        onRowClick={r => navigate(`/admin/companies/${r.id}`)}
        filters={<select className="input" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></select>}
        empty={<Empty icon={Building2} title="No clients yet" description="Create your first client client and its admin login." action={<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}><Plus size={14} /> New client</button>} />}
        columns={[
          { key: 'name', label: 'Client', render: r => <span className="ui-strong">{r.name}</span> },
          { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
          { key: 'plan', label: 'Plan' },
          { key: 'users', label: 'Users', align: 'right' },
          { key: 'credits', label: 'Credits left', align: 'right', value: r => (r.sub.email_credits_total || 0) - (r.sub.email_credits_used || 0), render: r => num((r.sub.email_credits_total || 0) - (r.sub.email_credits_used || 0)) },
          { key: 'expires', label: 'Expires', value: r => r.sub.expires_at || '', render: r => date(r.sub.expires_at) },
          { key: 'created_at', label: 'Created', render: r => date(r.created_at) },
        ]} />
      {showForm && <CompanyForm onClose={() => setShowForm(false)} onCreated={r => { setShowForm(false); setLogin(r.login); reload() }} />}
      {login && <SecretReveal title="Client Admin login created" note="Share these securely. They will be asked to set a new password at first sign-in. This password is not shown again."
        items={[['Email', login.email], ['Temporary password', login.temporary_password]]} onClose={() => setLogin(null)} />}
    </>
  )
}

// ── Client detail ───────────────────────────────────────────────────────────
function SubscriptionPanel({ org, sub, plans, reload }) {
  const [editing, setEditing] = useState(false)
  const [credit, setCredit] = useState(null)
  const planName = plans.find(p => p.id === sub?.plan_id)?.name

  return (
    <Panel title="Subscription" actions={<>
      <button className="btn btn-secondary btn-sm" onClick={() => setCredit({ delta: '', reason: '' })} disabled={!sub}>Adjust credits</button>
      <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>{sub ? 'Change / renew' : 'Assign plan'}</button>
    </>}>
      {!sub ? <Empty icon={CreditCard} title="No subscription" description="This client cannot send until a plan is assigned." /> : (
        <>
          <Meter label="Email credits" used={sub.email_credits_used} total={sub.email_credits_total} />
          <dl className="ui-kv">
            <dt>Plan</dt><dd>{planName || '—'} · <Badge value={sub.status} /></dd>
            <dt>Period</dt><dd>{date(sub.starts_at)} to {sub.expires_at ? date(sub.expires_at) : 'no expiry'} ({sub.billing_period})</dd>
            <dt>Limits</dt><dd>{sub.max_users} users · {sub.max_smtp} SMTP · {sub.max_campaigns} campaigns</dd>
            <dt>Features</dt><dd>{Object.entries(sub.features || {}).filter(([, v]) => v).map(([k]) => k.replace('_', ' ')).join(', ') || 'None'}</dd>
          </dl>
        </>
      )}
      {editing && <SubscriptionForm org={org} sub={sub} plans={plans} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
      {credit && (
        <Modal title="Adjust email credits" onClose={() => setCredit(null)} width={420}>
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            const ok = await attempt(async () => unwrap(await supabase.rpc('adjust_credits', { p_org: org.id, p_delta: Number(credit.delta), p_reason: credit.reason })), 'Credits updated')
            if (ok) { setCredit(null); reload() }
          }}>
            <Field label="Change" hint="Positive adds credits; negative deducts them. The balance can't go below what is already used.">
              <input className="input" type="number" value={credit.delta} onChange={e => setCredit({ ...credit, delta: e.target.value })} required autoFocus />
            </Field>
            <Field label="Reason"><input className="input" value={credit.reason} onChange={e => setCredit({ ...credit, reason: e.target.value })} required /></Field>
            <div className="ui-form-actions"><button className="btn btn-primary">Apply</button></div>
          </form>
        </Modal>
      )}
    </Panel>
  )
}

function SubscriptionForm({ org, sub, plans, onClose, onSaved }) {
  const [form, setForm] = useState({
    plan_id: sub?.plan_id || '', status: sub?.status || 'active', billing_period: sub?.billing_period || 'monthly',
    starts_at: toDateInput(sub?.starts_at) || new Date().toISOString().slice(0, 10), expires_at: toDateInput(sub?.expires_at),
    email_credits_total: sub?.email_credits_total ?? 0, max_users: sub?.max_users ?? 1, max_smtp: sub?.max_smtp ?? 1, max_campaigns: sub?.max_campaigns ?? 10, features: sub?.features || {},
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  function choosePlan(id) {
    const p = plans.find(x => x.id === id)
    setForm(f => (p ? { ...f, plan_id: id, billing_period: p.billing_period, email_credits_total: p.email_credits, max_users: p.max_users, max_smtp: p.max_smtp, max_campaigns: p.max_campaigns, features: p.features } : { ...f, plan_id: id }))
  }

  async function submit(e) {
    e.preventDefault()
    const row = { ...form, org_id: org.id, expires_at: form.expires_at || null, email_credits_total: Number(form.email_credits_total), max_users: Number(form.max_users), max_smtp: Number(form.max_smtp), max_campaigns: Number(form.max_campaigns), last_alert_pct: 0, updated_at: new Date().toISOString() }
    const ok = await attempt(async () => unwrap(await supabase.from('org_subscriptions').upsert(row)), 'Subscription saved')
    if (ok) onSaved()
  }

  return (
    <Modal title={`Subscription: ${org.name}`} onClose={onClose} width={620}>
      <form className="ui-form" onSubmit={submit}>
        <Row>
          <Field label="Plan" hint="Choosing a plan fills in its limits; adjust below for this client.">
            <select className="input" value={form.plan_id} onChange={e => choosePlan(e.target.value)} required>
              <option value="">Select…</option>{plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Status"><select className="input" value={form.status} onChange={set('status')}>{['active', 'suspended', 'expired', 'cancelled'].map(s => <option key={s}>{s}</option>)}</select></Field>
        </Row>
        <Row>
          <Field label="Billing"><select className="input" value={form.billing_period} onChange={set('billing_period')}><option>monthly</option><option>annual</option></select></Field>
          <Field label="Starts"><input className="input" type="date" value={form.starts_at} onChange={set('starts_at')} /></Field>
          <Field label="Expires"><input className="input" type="date" value={form.expires_at} onChange={set('expires_at')} /></Field>
        </Row>
        <Row>
          <Field label="Email credits"><input className="input" type="number" min="0" value={form.email_credits_total} onChange={set('email_credits_total')} /></Field>
          <Field label="Max users"><input className="input" type="number" min="1" value={form.max_users} onChange={set('max_users')} /></Field>
          <Field label="Max SMTP"><input className="input" type="number" min="0" value={form.max_smtp} onChange={set('max_smtp')} /></Field>
          <Field label="Max campaigns"><input className="input" type="number" min="0" value={form.max_campaigns} onChange={set('max_campaigns')} /></Field>
        </Row>
        <FeatureChecks value={form.features} onChange={features => setForm(f => ({ ...f, features }))} />
        <div className="ui-form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary">Save subscription</button></div>
      </form>
    </Modal>
  )
}

const FEATURES = [['automation', 'Automation'], ['inbox', 'Unified inbox'], ['ai', 'AI tools'], ['api', 'API & webhooks'], ['white_label', 'White label']]
function FeatureChecks({ value, onChange }) {
  return (
    <div className="input-group">
      <span className="input-label">Feature access</span>
      <div className="ui-checks">
        {FEATURES.map(([k, label]) => (
          <label key={k} className="ui-check"><input type="checkbox" checked={value?.[k] === true} onChange={e => onChange({ ...value, [k]: e.target.checked })} />{label}</label>
        ))}
      </div>
    </div>
  )
}

export function CompanyDetailPage() {
  const { id } = useParams()
  const confirm = useConfirm()
  const [tab, setTab] = useState('overview')
  const [secret, setSecret] = useState(null)
  const { data, loading, error, reload } = useLoad(async () => {
    const q = t => supabase.from(t).select('*').eq('org_id', id)
    const [org, sub, plans, users, domains, smtp, campaigns, metrics, ledger, tickets, activity, daily] = await Promise.all([
      supabase.from('organizations').select('*').eq('id', id).single(), q('org_subscriptions').maybeSingle(), supabase.from('plans').select('*').order('name'),
      q('profiles'), q('domains'), q('smtp_accounts'), q('campaigns').order('created_at', { ascending: false }), q('campaign_metrics'),
      q('credit_ledger').order('created_at', { ascending: false }).limit(100), q('tickets').order('created_at', { ascending: false }),
      q('audit_logs').order('created_at', { ascending: false }).limit(100), q('daily_stats').order('day'),
    ])
    return { org: unwrap(org), sub: unwrap(sub), plans: unwrap(plans), users: unwrap(users), domains: unwrap(domains), smtp: unwrap(smtp), campaigns: unwrap(campaigns), metrics: unwrap(metrics), ledger: unwrap(ledger), tickets: unwrap(tickets), activity: unwrap(activity), daily: unwrap(daily) }
  }, [id])

  if (loading) return <PageHeader title="Loading client…" />
  if (error) return <Empty title="Client not found" description={error} />
  const { org, sub, plans, users, domains, smtp, campaigns, metrics, ledger, tickets, activity, daily } = data
  const total = k => metrics.reduce((s, m) => s + Number(m[k] || 0), 0)

  async function setOrgStatus(status) {
    const ok = status === 'active' || await confirm({
      title: `${status === 'suspended' ? 'Suspend' : 'Deactivate'} ${org.name}?`, danger: true, confirmLabel: status === 'suspended' ? 'Suspend' : 'Deactivate',
      message: 'All its users lose access immediately and sending stops. You can reactivate it later.',
    })
    if (ok && await attempt(async () => unwrap(await supabase.from('organizations').update({ status }).eq('id', id)), `Client ${status}`)) reload()
  }

  const metricFor = c => metrics.find(m => m.campaign_id === c.id) || {}

  return (
    <>
      <PageHeader title={org.name} subtitle={[org.industry, org.website].filter(Boolean).join(' · ') || 'Client organization'}
        back={<Link to="/admin/companies" className="ui-back"><ArrowLeft size={14} /> Clients</Link>}
        actions={<>
          <Badge value={org.status} />
          {org.status === 'active'
            ? <button className="btn btn-danger btn-sm" onClick={() => setOrgStatus('suspended')}>Suspend</button>
            : <button className="btn btn-primary btn-sm" onClick={() => setOrgStatus('active')}>Reactivate</button>}
          {org.status !== 'deactivated' && <button className="btn btn-ghost btn-sm" onClick={() => setOrgStatus('deactivated')}>Deactivate</button>}
        </>} />
      <StatGrid>
        <Stat label="Sent" value={num(total('sent'))} />
        <Stat label="Delivered" value={num(total('delivered'))} hint={pct(total('delivered'), total('sent'))} />
        <Stat label="Opened (approx.)" value={num(total('unique_opens'))} hint={pct(total('unique_opens'), total('delivered'))} />
        <Stat label="Clicked" value={num(total('unique_clicks'))} hint={pct(total('unique_clicks'), total('delivered'))} />
        <Stat label="Bounced" value={num(total('bounced'))} hint={pct(total('bounced'), total('sent'))} />
      </StatGrid>
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'overview', label: 'Overview' }, { value: 'users', label: 'Users', count: users.length }, { value: 'campaigns', label: 'Campaigns', count: campaigns.length },
        { value: 'infra', label: 'Domains & SMTP', count: domains.length + smtp.length }, { value: 'tickets', label: 'Tickets', count: tickets.length }, { value: 'usage', label: 'Usage history' }, { value: 'activity', label: 'Activity' },
      ]} />
      {tab === 'overview' && (
        <>
          <div className="ui-grid-2">
            <SubscriptionPanel org={org} sub={sub} plans={plans} reload={reload} />
            <Panel title="Client details">
              <dl className="ui-kv">
                <dt>Website</dt><dd>{org.website || '—'}</dd><dt>Industry</dt><dd>{org.industry || '—'}</dd>
                <dt>Timezone</dt><dd>{org.timezone}</dd><dt>Address</dt><dd>{org.address || '—'}</dd>
                <dt>Phone</dt><dd>{org.phone || '—'}</dd><dt>Created</dt><dd>{date(org.created_at)}</dd>
              </dl>
            </Panel>
          </div>
          <Panel title="Sending activity"><TrendChart data={dailySeries(daily)} /></Panel>
        </>
      )}
      {tab === 'users' && (
        <DataTable rows={users} searchKeys={['email', 'full_name']} exportName={`${org.name}-users`} columns={[
          { key: 'email', label: 'Email', render: u => <span className="ui-strong">{u.email}</span> },
          { key: 'full_name', label: 'Name' },
          { key: 'role', label: 'Role', render: u => u.role.replace('_', ' ') },
          { key: 'status', label: 'Status', render: u => <Badge value={u.status} /> },
          { key: 'permissions', label: 'Permissions', csv: false, sort: false, render: u => (u.role === 'client_admin' ? 'All' : Object.entries(u.permissions || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || 'None') },
          { key: 'last_login_at', label: 'Last sign-in', render: u => date(u.last_login_at) },
          { key: 'x', label: '', csv: false, sort: false, render: u => (
            <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                if (!await confirm({ title: 'Reset password?', message: `${u.email} will need the new temporary password to sign in.`, confirmLabel: 'Reset' })) return
                const r = await attempt(() => api(`/api/users/${u.id}/reset-password`))
                if (r) setSecret(r)
              }}>Reset password</button>
              <button className="btn btn-ghost btn-sm" onClick={async () => {
                const status = u.status === 'active' ? 'suspended' : 'active'
                if (await attempt(() => api(`/api/users/${u.id}`, { method: 'PATCH', body: { status } }), `User ${status}`)) reload()
              }}>{u.status === 'active' ? 'Suspend' : 'Activate'}</button>
            </div>
          ) },
        ]} />
      )}
      {tab === 'campaigns' && (
        <DataTable rows={campaigns} searchKeys={['name', 'subject']} exportName={`${org.name}-campaigns`} empty={<Empty icon={Send} title="No campaigns yet" />} columns={[
          { key: 'name', label: 'Campaign', render: c => <span className="ui-strong">{c.name}</span> },
          { key: 'status', label: 'Status', render: c => <Badge value={c.status} /> },
          { key: 'sent', label: 'Sent', align: 'right', value: c => Number(metricFor(c).sent || 0) },
          { key: 'delivered', label: 'Delivered', align: 'right', value: c => Number(metricFor(c).delivered || 0) },
          { key: 'opens', label: 'Opens (approx.)', align: 'right', value: c => Number(metricFor(c).unique_opens || 0) },
          { key: 'clicks', label: 'Clicks', align: 'right', value: c => Number(metricFor(c).unique_clicks || 0) },
          { key: 'bounced', label: 'Bounced', align: 'right', value: c => Number(metricFor(c).bounced || 0) },
        ].map(col => (col.value ? { ...col, render: c => num(col.value(c)) } : col))} />
      )}
      {tab === 'infra' && (
        <>
          <Panel title="Domains">
            <DataTable rows={domains} columns={[
              { key: 'domain', label: 'Domain', render: d => <span className="ui-strong">{d.domain}</span> },
              ...[['verified', 'Verified'], ['spf_ok', 'SPF'], ['dkim_ok', 'DKIM'], ['dmarc_ok', 'DMARC']].map(([k, label]) => ({ key: k, label, render: d => (d[k] ? <CheckCircle2 size={16} color="var(--tone-success)" aria-label="Yes" /> : <span className="ui-muted">No</span>) })),
              { key: 'last_checked_at', label: 'Last checked', render: d => date(d.last_checked_at) },
            ]} />
          </Panel>
          <Panel title="SMTP accounts" subtitle="Passwords are encrypted and are never shown, including to Synerax.">
            <DataTable rows={smtp} columns={[
              { key: 'label', label: 'Account', render: a => <span className="ui-strong">{a.label}</span> },
              { key: 'from_email', label: 'From' }, { key: 'host', label: 'Host' },
              { key: 'status', label: 'Status', render: a => <Badge value={a.status} /> },
              { key: 'daily_limit', label: 'Daily limit', align: 'right', render: a => num(a.daily_limit) },
            ]} />
          </Panel>
        </>
      )}
      {tab === 'tickets' && (
        <DataTable rows={tickets} searchKeys={['subject']} empty={<Empty icon={Ticket} title="No tickets" />} columns={[
          { key: 'number', label: '#', render: t => <Link to={`/support/${t.id}`}>#{t.number}</Link> },
          { key: 'subject', label: 'Subject' }, { key: 'priority', label: 'Priority', render: t => <Badge value={t.priority} /> },
          { key: 'status', label: 'Status', render: t => <Badge value={t.status} /> }, { key: 'created_at', label: 'Opened', render: t => date(t.created_at) },
        ]} />
      )}
      {tab === 'usage' && (
        <DataTable rows={ledger} exportName={`${org.name}-credits`} empty={<Empty title="No credit movements yet" />} columns={[
          { key: 'created_at', label: 'When', render: l => format(new Date(l.created_at), 'MMM d, yyyy HH:mm') },
          { key: 'reason', label: 'Reason' }, { key: 'delta', label: 'Change', align: 'right', render: l => `${l.delta > 0 ? '+' : ''}${num(l.delta)}` },
        ]} />
      )}
      {tab === 'activity' && <AuditTable rows={activity} />}
      {secret && <SecretReveal title="Password reset" items={[['Email', secret.email], ['Temporary password', secret.temporary_password]]} onClose={() => setSecret(null)} />}
    </>
  )
}

export function AuditTable({ rows, loading }) {
  return (
    <DataTable rows={rows} loading={loading} searchKeys={['actor_email', 'action', 'entity']} exportName="audit-log" empty={<Empty icon={ClipboardList} title="No activity recorded yet" />} columns={[
      { key: 'created_at', label: 'When', render: l => format(new Date(l.created_at), 'MMM d, yyyy HH:mm') },
      { key: 'actor_email', label: 'Who' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'On', render: l => (l.entity || '').replace(/_/g, ' ') },
      { key: 'ip', label: 'IP' },
    ]} />
  )
}

export function AuditPage() {
  const { data, loading } = useLoad(async () => unwrap(await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(1000)))
  return <><PageHeader title="Audit log" subtitle="Who changed what, most recent first" /><AuditTable rows={data || []} loading={loading} /></>
}

// ── Plans ────────────────────────────────────────────────────────────────────
const EMPTY_PLAN = { name: '', description: '', billing_period: 'monthly', price: 0, currency: 'USD', email_credits: 10000, max_users: 3, max_smtp: 3, max_campaigns: 50, features: { automation: true, inbox: true, ai: false, api: false, white_label: false }, is_active: true }

export function PlansPage() {
  const confirm = useConfirm()
  const [form, setForm] = useState(null)
  const { data, loading, error, reload } = useLoad(async () => unwrap(await supabase.from('plans').select('*').order('price')))
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    const row = { ...form, price: Number(form.price), email_credits: Number(form.email_credits), max_users: Number(form.max_users), max_smtp: Number(form.max_smtp), max_campaigns: Number(form.max_campaigns) }
    const ok = await attempt(async () => unwrap(await supabase.from('plans').upsert(row)), 'Plan saved')
    if (ok) { setForm(null); reload() }
  }

  return (
    <>
      <PageHeader title="Subscription plans" subtitle="Assigned to clients by Synerax. Clients can view their plan but can't buy or change it." actions={<button className="btn btn-primary" onClick={() => setForm(EMPTY_PLAN)}><Plus size={15} /> New plan</button>} />
      <DataTable rows={data || []} loading={loading} error={error} onRetry={reload} onRowClick={setForm}
        empty={<Empty icon={CreditCard} title="No plans yet" description="Create a plan before adding your first client." action={<button className="btn btn-primary btn-sm" onClick={() => setForm(EMPTY_PLAN)}><Plus size={14} /> New plan</button>} />}
        columns={[
          { key: 'name', label: 'Plan', render: p => <span className="ui-strong">{p.name}</span> },
          { key: 'price', label: 'Price', align: 'right', render: p => `${p.currency} ${num(p.price)} / ${p.billing_period === 'annual' ? 'yr' : 'mo'}` },
          { key: 'email_credits', label: 'Credits', align: 'right', render: p => num(p.email_credits) },
          { key: 'max_users', label: 'Users', align: 'right' }, { key: 'max_smtp', label: 'SMTP', align: 'right' }, { key: 'max_campaigns', label: 'Campaigns', align: 'right' },
          { key: 'is_active', label: 'Status', render: p => <Badge value={p.is_active ? 'active' : 'draft'}>{p.is_active ? 'Available' : 'Retired'}</Badge> },
          { key: 'x', label: '', sort: false, render: p => <button className="btn btn-ghost btn-sm" onClick={async ev => {
            ev.stopPropagation()
            if (await confirm({ title: `Delete ${p.name}?`, danger: true, message: 'This fails if a client is on this plan; retire it instead.', confirmLabel: 'Delete' })
              && await attempt(async () => unwrap(await supabase.from('plans').delete().eq('id', p.id)), 'Plan deleted')) reload()
          }}>Delete</button> },
        ]} />
      {form && (
        <Modal title={form.id ? `Edit ${form.name}` : 'New plan'} onClose={() => setForm(null)} width={620}>
          <form className="ui-form" onSubmit={submit}>
            <Field label="Name *"><input className="input" value={form.name} onChange={set('name')} required /></Field>
            <Field label="Description"><input className="input" value={form.description || ''} onChange={set('description')} /></Field>
            <Row>
              <Field label="Validity"><select className="input" value={form.billing_period} onChange={set('billing_period')}><option value="monthly">Monthly</option><option value="annual">Annual</option></select></Field>
              <Field label="Price"><input className="input" type="number" min="0" step="0.01" value={form.price} onChange={set('price')} /></Field>
              <Field label="Currency"><input className="input" value={form.currency} onChange={set('currency')} maxLength={3} /></Field>
            </Row>
            <Row>
              <Field label="Email credits"><input className="input" type="number" min="0" value={form.email_credits} onChange={set('email_credits')} /></Field>
              <Field label="Max users"><input className="input" type="number" min="1" value={form.max_users} onChange={set('max_users')} /></Field>
              <Field label="Max SMTP"><input className="input" type="number" min="0" value={form.max_smtp} onChange={set('max_smtp')} /></Field>
              <Field label="Max campaigns"><input className="input" type="number" min="0" value={form.max_campaigns} onChange={set('max_campaigns')} /></Field>
            </Row>
            <FeatureChecks value={form.features} onChange={features => setForm(f => ({ ...f, features }))} />
            <label className="ui-check"><input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />Available for new assignments</label>
            <div className="ui-form-actions"><button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn btn-primary">Save plan</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Credit requests ──────────────────────────────────────────────────────────
export function RequestsPage() {
  const { data, loading, reload } = useLoad(async () => {
    const [requests, orgs] = await Promise.all([
      supabase.from('credit_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('organizations').select('id, name'),
    ])
    const names = unwrap(orgs)
    return unwrap(requests).map(r => ({ ...r, company: names.find(o => o.id === r.org_id)?.name }))
  })

  async function decide(r, status) {
    const ok = await attempt(async () => {
      if (status === 'approved' && r.kind === 'credits' && r.amount) unwrap(await supabase.rpc('adjust_credits', { p_org: r.org_id, p_delta: r.amount, p_reason: 'Credit request approved' }))
      unwrap(await supabase.from('credit_requests').update({ status }).eq('id', r.id))
    }, `Request ${status}`)
    if (ok) reload()
  }

  return (
    <>
      <PageHeader title="Credit & upgrade requests" subtitle="Approving a credit request adds the credits. For an upgrade, change the plan on the client page." />
      <DataTable rows={data || []} loading={loading} searchKeys={['company', 'message']} empty={<Empty icon={Ticket} title="No requests" />} columns={[
        { key: 'company', label: 'Client', render: r => <Link to={`/admin/companies/${r.org_id}`} className="ui-strong">{r.company}</Link> },
        { key: 'kind', label: 'Type' }, { key: 'amount', label: 'Credits', align: 'right', render: r => (r.amount ? num(r.amount) : '—') },
        { key: 'message', label: 'Message' }, { key: 'created_at', label: 'Requested', render: r => date(r.created_at) },
        { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
        { key: 'x', label: '', sort: false, render: r => r.status === 'pending' && (
          <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => decide(r, 'approved')}>Approve</button>
            <button className="btn btn-ghost btn-sm" onClick={() => decide(r, 'rejected')}>Reject</button>
          </div>
        ) },
      ]} />
    </>
  )
}

// ── Invoices ─────────────────────────────────────────────────────────────────
export function InvoicesPage() {
  const [form, setForm] = useState(null)
  const { data, loading, reload } = useLoad(async () => {
    const [invoices, orgs] = await Promise.all([supabase.from('invoices').select('*').order('created_at', { ascending: false }), supabase.from('organizations').select('id, name').order('name')])
    const names = unwrap(orgs)
    return { names, rows: unwrap(invoices).map(i => ({ ...i, company: names.find(o => o.id === i.org_id)?.name })) }
  })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <PageHeader title="Invoices" subtitle="Billing records you issue to clients. Payment is collected outside the platform." actions={<button className="btn btn-primary" onClick={() => setForm({ org_id: '', number: `INV-${Date.now().toString().slice(-8)}`, description: '', amount: 0, currency: 'USD', status: 'issued' })}><Plus size={15} /> New invoice</button>} />
      <DataTable rows={data?.rows || []} loading={loading} searchKeys={['company', 'number']} exportName="invoices" empty={<Empty icon={Landmark} title="No invoices yet" />} columns={[
        { key: 'number', label: 'Invoice', render: i => <span className="ui-strong">{i.number}</span> }, { key: 'company', label: 'Client' }, { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount', align: 'right', render: i => `${i.currency} ${num(i.amount)}` }, { key: 'issued_at', label: 'Issued', render: i => date(i.issued_at) },
        { key: 'status', label: 'Status', render: i => (
          <select className="input" aria-label={`Status of ${i.number}`} style={{ width: 100, padding: '4px 8px' }} value={i.status} onChange={async e => {
            if (await attempt(async () => unwrap(await supabase.from('invoices').update({ status: e.target.value }).eq('id', i.id)))) reload()
          }}>{['draft', 'issued', 'paid', 'void'].map(s => <option key={s}>{s}</option>)}</select>
        ) },
      ]} />
      {form && (
        <Modal title="New invoice" onClose={() => setForm(null)}>
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            if (await attempt(async () => unwrap(await supabase.from('invoices').insert({ ...form, amount: Number(form.amount) })), 'Invoice created')) { setForm(null); reload() }
          }}>
            <Field label="Client *"><select className="input" value={form.org_id} onChange={set('org_id')} required><option value="">Select…</option>{data.names.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
            <Row><Field label="Number *"><input className="input" value={form.number} onChange={set('number')} required /></Field><Field label="Amount"><input className="input" type="number" step="0.01" value={form.amount} onChange={set('amount')} /></Field><Field label="Currency"><input className="input" value={form.currency} onChange={set('currency')} maxLength={3} /></Field></Row>
            <Field label="Description"><input className="input" value={form.description} onChange={set('description')} /></Field>
            <div className="ui-form-actions"><button className="btn btn-primary">Create invoice</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ── Applications ─────────────────────────────────────────────────────────────
export function ApplicationsPage() {
  const [prefill, setPrefill] = useState(null)
  const [login, setLogin] = useState(null)
  const { data, loading, reload } = useLoad(async () => unwrap(await supabase.from('applications').select('*').or('plan.is.null,plan.neq.contact').order('created_at', { ascending: false })))
  const setStatus = async (a, status) => { if (await attempt(async () => unwrap(await supabase.from('applications').update({ status }).eq('id', a.id)))) reload() }

  return (
    <>
      <PageHeader title="Applications" subtitle="Requests from the public website to join Synerax Mail" />
      <DataTable rows={data || []} loading={loading} searchKeys={['business_name', 'email', 'contact_name']} exportName="applications" empty={<Empty icon={Users} title="No applications yet" />} columns={[
        { key: 'business_name', label: 'Business', render: a => <span className="ui-strong">{a.business_name}</span> }, { key: 'contact_name', label: 'Contact' }, { key: 'email', label: 'Email' },
        { key: 'monthly_volume', label: 'Volume' }, { key: 'list_source', label: 'List source' }, { key: 'status', label: 'Status', render: a => <Badge value={a.status} /> },
        { key: 'x', label: '', sort: false, csv: false, render: a => a.status === 'pending' && (
          <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setPrefill(a)}>Approve</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'rejected')}>Reject</button>
          </div>
        ) },
      ]} />
      {prefill && <CompanyForm initial={{ name: prefill.business_name, website: prefill.website || '', admin_name: prefill.contact_name, admin_email: prefill.email }}
        onClose={() => setPrefill(null)} onCreated={async r => { await setStatus(prefill, 'approved'); setPrefill(null); setLogin(r.login) }} />}
      {login && <SecretReveal title="Client Admin login created" items={[['Email', login.email], ['Temporary password', login.temporary_password]]} onClose={() => setLogin(null)} />}
    </>
  )
}

// ── Enquiries from the contact page ──────────────────────────────────────────
export function EnquiriesPage() {
  const [filter, setFilter] = useState('pending')
  const { data, loading, error, reload } = useLoad(async () => unwrap(await supabase.from('applications').select('*').eq('plan', 'contact').order('created_at', { ascending: false })))
  const all = data || []
  const rows = all.filter(e => !filter || e.status === filter)
  const setStatus = async (e, status) => {
    if (await attempt(async () => unwrap(await supabase.from('applications').update({ status }).eq('id', e.id)), status === 'pending' ? 'Moved back to new' : 'Marked as done')) {
      reload()
      window.dispatchEvent(new Event('enquiries-changed'))
    }
  }
  return (
    <>
      <PageHeader title="Enquiries" subtitle="Messages sent from the website contact page" />
      <StatGrid>
        <Stat icon={MailIcon} label="New" value={num(all.filter(e => e.status === 'pending').length)} />
        <Stat label="Done" value={num(all.filter(e => e.status !== 'pending').length)} />
        <Stat label="Total" value={num(all.length)} />
      </StatGrid>
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} searchKeys={['contact_name', 'email', 'business_name', 'use_case', 'notes']} exportName="enquiries"
        filters={<select className="input" aria-label="Status" value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">New</option><option value="approved">Done</option><option value="">All</option></select>}
        empty={<Empty icon={MailIcon} title={filter === 'pending' ? 'No new enquiries' : 'No enquiries'} description="Messages from the contact page appear here." />}
        columns={[
          { key: 'contact_name', label: 'From', render: e => <><div className="ui-strong">{e.contact_name}</div><a href={`mailto:${e.email}`} className="ui-muted">{e.email}</a></> },
          { key: 'business_name', label: 'Client', render: e => (e.business_name === e.contact_name ? '—' : e.business_name) },
          { key: 'use_case', label: 'Enquiry' },
          { key: 'notes', label: 'Message', sort: false, render: e => <div style={{ maxWidth: 380, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{e.notes}</div> },
          { key: 'created_at', label: 'Received', render: e => format(new Date(e.created_at), 'MMM d, HH:mm') },
          { key: 'x', label: '', sort: false, csv: false, render: e => (
            <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
              <a className="btn btn-secondary btn-sm" href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: ${e.use_case || 'Your enquiry'}`)}`}>Reply</a>
              {e.status === 'pending'
                ? <button className="btn btn-primary btn-sm" onClick={() => setStatus(e, 'approved')}>Mark done</button>
                : <button className="btn btn-ghost btn-sm" onClick={() => setStatus(e, 'pending')}>Reopen</button>}
            </div>
          ) },
        ]} />
    </>
  )
}
