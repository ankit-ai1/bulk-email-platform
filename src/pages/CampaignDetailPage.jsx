import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Copy, Download, Edit3, Pause, Play, Printer, Sparkles, Square, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api, downloadCsv, num, pct, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, DataTable, Empty, Field, Modal, PageHeader, Panel, Tabs, useConfirm, useLoad } from '../components/ui'
import { CompareChart } from '../components/charts'
import { MetricsGrid, sumMetrics } from '../components/analytics'
import { CampaignWizard } from './CampaignsPage'

const stamp = v => (v ? format(new Date(v), 'MMM d, yyyy HH:mm') : '—')

export default function CampaignDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const { hasFeature } = useAuth()
  const [tab, setTab] = useState('report')
  const [editing, setEditing] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [testing, setTesting] = useState(false)
  const [converting, setConverting] = useState(false)
  const [insights, setInsights] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)

  const { data, loading, error, reload } = useLoad(async () => {
    const [campaign, metrics, variants, recipients, events, accounts, smtp] = await Promise.all([
      supabase.from('campaigns').select('*').eq('id', id).single(),
      supabase.from('campaign_metrics').select('*').eq('campaign_id', id),
      supabase.from('variant_metrics').select('*').eq('campaign_id', id),
      supabase.from('campaign_recipients').select('*').eq('campaign_id', id).order('sent_at', { ascending: false, nullsFirst: false }).limit(1000),
      supabase.from('email_events').select('*').eq('campaign_id', id).order('occurred_at', { ascending: false }).limit(200),
      supabase.from('campaign_accounts').select('smtp_account_id').eq('campaign_id', id),
      supabase.from('smtp_accounts').select('id, label, from_email, status'),
    ])
    return { campaign: unwrap(campaign), metrics: sumMetrics(unwrap(metrics)), variants: unwrap(variants), recipients: unwrap(recipients), events: unwrap(events), accounts: unwrap(accounts), smtp: unwrap(smtp) }
  }, [id])

  const status = data?.campaign.status
  useEffect(() => {
    if (status !== 'sending') return undefined
    const t = setInterval(reload, 8000)
    return () => clearInterval(t)
  }, [status, reload])

  if (loading) return <PageHeader title="Loading campaign…" />
  if (error) return <Empty title="Campaign not found" description={error} />
  const { campaign, metrics, variants, recipients, events, accounts, smtp } = data

  const act = async (action, label) => { if (await attempt(() => api(`/api/campaigns/${id}/${action}`), label)) reload() }
  const stop = async () => {
    if (await confirm({ title: 'Stop this campaign?', danger: true, confirmLabel: 'Stop campaign', message: 'Unsent emails are cancelled and it cannot be resumed. Duplicate it to send again.' })) act('stop', 'Campaign stopped')
  }
  const remove = async () => {
    if (await confirm({ title: 'Delete this campaign?', danger: true, confirmLabel: 'Delete', message: 'Its report and recipient history are permanently removed.' })
      && await attempt(async () => unwrap(await supabase.from('campaigns').delete().eq('id', id)), 'Campaign deleted')) navigate('/campaigns')
  }
  const duplicate = async () => {
    const copy = await attempt(() => api(`/api/campaigns/${id}/duplicate`), 'Campaign duplicated')
    if (copy) navigate(`/campaigns/${copy.id}`)
  }
  const runInsights = async () => {
    setAiBusy(true)
    const r = await attempt(() => api('/api/ai/insights', { body: { campaign_id: id } }))
    if (r) setInsights(r)
    setAiBusy(false)
  }

  const bounceReasons = Object.entries(recipients.filter(r => r.bounced_at).reduce((acc, r) => {
    const reason = r.bounce_reason || 'Unknown'
    acc[reason] = (acc[reason] || 0) + 1
    return acc
  }, {})).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)

  const perAccount = smtp.filter(a => accounts.some(x => x.smtp_account_id === a.id)).map(a => {
    const mine = recipients.filter(r => r.smtp_account_id === a.id)
    return {
      id: a.id, label: a.label, from_email: a.from_email, status: a.status,
      sent: mine.filter(r => r.status === 'sent').length, opened: mine.filter(r => r.first_opened_at).length,
      clicked: mine.filter(r => r.first_clicked_at).length, bounced: mine.filter(r => r.bounced_at).length,
    }
  })

  const exportRecipients = () => downloadCsv(`${campaign.name}-recipients.csv`, recipients.map(r => ({
    email: r.email, name: r.name, variant: r.variant, status: r.status, sent_at: r.sent_at, opens_approx: r.open_count, clicks: r.click_count,
    bounce: r.bounce_type, bounce_reason: r.bounce_reason, unsubscribed_at: r.unsubscribed_at, complained_at: r.complained_at, replied_at: r.replied_at, error: r.error,
  })))

  return (
    <>
      <PageHeader title={campaign.name} subtitle={campaign.subject} back={<Link to="/campaigns" className="ui-back"><ArrowLeft size={14} /> Campaigns</Link>}
        actions={<>
          <Badge value={status} />
          {status === 'draft' && <><button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setTesting(true)}>Send test</button>
            <button className="btn btn-primary btn-sm" onClick={() => setLaunching(true)}><Play size={14} /> Launch</button></>}
          {(status === 'sending' || status === 'scheduled') && <button className="btn btn-secondary btn-sm" onClick={() => act('pause', 'Campaign paused')}><Pause size={14} /> Pause</button>}
          {status === 'paused' && <button className="btn btn-primary btn-sm" onClick={() => act('resume', 'Campaign resumed')}><Play size={14} /> Resume</button>}
          {['sending', 'paused', 'scheduled'].includes(status) && <button className="btn btn-danger btn-sm" onClick={stop}><Square size={14} /> Stop</button>}
          <button className="btn btn-ghost btn-sm" onClick={duplicate}><Copy size={14} /> Duplicate</button>
          {['draft', 'completed', 'stopped', 'failed'].includes(status) && <button className="btn btn-ghost btn-sm ui-icon-btn" onClick={remove} aria-label="Delete campaign"><Trash2 size={15} /></button>}
        </>} />

      {campaign.status_reason && <p className="ui-note ui-note-warn">{campaign.status_reason}</p>}
      {status === 'scheduled' && <p className="ui-note">Scheduled for {stamp(campaign.scheduled_at)} ({campaign.timezone}).</p>}

      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'report', label: 'Report' }, { value: 'recipients', label: 'Recipients', count: recipients.length }, { value: 'accounts', label: 'Accounts', count: perAccount.length }, { value: 'timeline', label: 'Timeline' },
      ]} />

      {tab === 'report' && (
        <>
          <div className="ui-actions no-print" style={{ marginBottom: 14 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportRecipients} disabled={!recipients.length}><Download size={14} /> Download CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Printer size={14} /> Save as PDF</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setConverting(true)} disabled={!metrics.sent}>Record sale</button>
            {hasFeature('ai') && <button className="btn btn-secondary btn-sm" onClick={runInsights} disabled={aiBusy || !metrics.sent}><Sparkles size={14} /> {aiBusy ? 'Analyzing…' : 'AI insights'}</button>}
          </div>
          <MetricsGrid m={metrics} />
          {insights && (
            <Panel title="AI insights" subtitle="Based on your sending history. Check recommendations before acting on them.">
              <p style={{ color: 'var(--text-primary)', marginBottom: 10 }}>{insights.summary}</p>
              <div className="ui-grid-2" style={{ marginBottom: 10 }}>
                <div><div className="input-label">What worked</div><ul style={{ paddingLeft: 18 }}>{insights.what_worked.map(x => <li key={x}>{x}</li>)}</ul></div>
                <div><div className="input-label">What to improve</div><ul style={{ paddingLeft: 18 }}>{insights.what_to_improve.map(x => <li key={x}>{x}</li>)}</ul></div>
              </div>
              {insights.recommendations.map(r => <p key={r.action} style={{ marginBottom: 6 }}><Badge value={r.priority === 'high' ? 'high' : 'draft'}>{r.priority}</Badge> <span className="ui-strong">{r.action}.</span> {r.reason}</p>)}
              <p className="ui-muted" style={{ marginTop: 10 }}>Next campaign open rate estimate: {insights.prediction.next_campaign_open_rate_range} ({insights.prediction.confidence} confidence). {insights.prediction.basis}</p>
            </Panel>
          )}
          {variants.length > 1 && (
            <Panel title="A/B test" subtitle={[campaign.subject_b && 'Subject', campaign.template_b_id && 'Content', campaign.send_b_at && `Send time (B at ${stamp(campaign.send_b_at)})`].filter(Boolean).join(' · ')}>
              <DataTable rows={variants.map(v => ({ ...v, id: v.variant, subject: v.variant === 'A' ? campaign.subject : campaign.subject_b }))} columns={[
                { key: 'variant', label: 'Variant' }, { key: 'subject', label: 'Subject', render: v => v.subject || campaign.subject }, { key: 'sent', label: 'Sent', align: 'right', render: v => num(v.sent) },
                { key: 'opens', label: 'Open rate (approx.)', align: 'right', sort: false, render: v => pct(v.unique_opens, v.sent) },
                { key: 'clicks', label: 'Click rate', align: 'right', sort: false, render: v => pct(v.unique_clicks, v.sent) },
                { key: 'conversions', label: 'Conversions', align: 'right', render: v => num(v.conversions) },
                { key: 'revenue', label: 'Revenue', align: 'right', render: v => num(v.revenue) },
              ]} />
            </Panel>
          )}
          {bounceReasons.length > 0 && (
            <Panel title="Bounce reasons"><DataTable rows={bounceReasons.map(b => ({ ...b, id: b.reason }))} columns={[{ key: 'reason', label: 'Reason' }, { key: 'count', label: 'Emails', align: 'right' }]} /></Panel>
          )}
        </>
      )}

      {tab === 'recipients' && (
        <DataTable rows={recipients} searchKeys={['email', 'name']} empty={<Empty title="No recipients yet" description="The queue is built when the campaign starts." />} columns={[
          { key: 'email', label: 'Email', render: r => <span className="ui-strong">{r.email}</span> }, { key: 'name', label: 'Name' },
          { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
          { key: 'open_count', label: 'Opens', align: 'right' }, { key: 'click_count', label: 'Clicks', align: 'right' },
          { key: 'bounce_type', label: 'Bounce' }, { key: 'replied_at', label: 'Replied', render: r => (r.replied_at ? stamp(r.replied_at) : '—') },
          { key: 'sent_at', label: 'Sent', render: r => stamp(r.sent_at) },
        ]} />
      )}

      {tab === 'accounts' && (
        <>
          {perAccount.some(a => a.sent) && <Panel title="Performance by sending account"><CompareChart data={perAccount} /></Panel>}
          <DataTable rows={perAccount} empty={<Empty title="No accounts selected" />} columns={[
            { key: 'label', label: 'Account', render: a => <><div className="ui-strong">{a.label}</div><div className="ui-muted">{a.from_email}</div></> },
            { key: 'status', label: 'Health', render: a => <Badge value={a.status} /> },
            { key: 'sent', label: 'Sent', align: 'right' }, { key: 'opened', label: 'Opened', align: 'right' }, { key: 'clicked', label: 'Clicked', align: 'right' }, { key: 'bounced', label: 'Bounced', align: 'right' },
          ]} />
        </>
      )}

      {tab === 'timeline' && (
        <DataTable rows={events} empty={<Empty title="No activity yet" />} columns={[
          { key: 'occurred_at', label: 'When', render: e => stamp(e.occurred_at) },
          { key: 'type', label: 'Event', render: e => e.type.replace('_', ' ') },
          { key: 'who', label: 'Recipient', sort: false, render: e => recipients.find(r => r.id === e.recipient_id)?.email || '—' },
          { key: 'detail', label: 'Detail', sort: false, render: e => (e.detail?.machine ? 'Automated scanner' : e.detail?.url || e.detail?.reason || '') },
        ]} />
      )}

      {editing && <CampaignWizard campaign={campaign} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
      {testing && <TestModal id={id} onClose={() => setTesting(false)} />}
      {converting && <ConversionModal id={id} onClose={() => setConverting(false)} onDone={() => { setConverting(false); reload() }} />}
      {launching && <LaunchModal campaign={campaign} onClose={() => setLaunching(false)} onDone={() => { setLaunching(false); reload() }} />}
    </>
  )
}

function ConversionModal({ id, onClose, onDone }) {
  const [form, setForm] = useState({ email: '', amount: '', order_ref: '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <Modal title="Record a sale" onClose={onClose} width={420}>
      <form className="ui-form" onSubmit={async e => {
        e.preventDefault()
        if (await attempt(() => api(`/api/campaigns/${id}/conversion`, { body: { ...form, amount: Number(form.amount) } }), 'Sale recorded')) onDone()
      }}>
        <Field label="Customer email *"><input className="input" type="email" value={form.email} onChange={set('email')} required autoFocus /></Field>
        <Field label="Amount *"><input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={set('amount')} required /></Field>
        <Field label="Order reference" hint="Prevents the same order being counted twice. To automate this, your store can call POST /v1/conversions."><input className="input" value={form.order_ref} onChange={set('order_ref')} /></Field>
        <div className="ui-form-actions"><button className="btn btn-primary">Save</button></div>
      </form>
    </Modal>
  )
}

function TestModal({ id, onClose }) {
  const { user } = useAuth()
  const [to, setTo] = useState(user.email)
  return (
    <Modal title="Send a test email" onClose={onClose} width={420}>
      <form className="ui-form" onSubmit={async e => {
        e.preventDefault()
        if (await attempt(() => api(`/api/campaigns/${id}/test`, { body: { to } }), 'Test email sent')) onClose()
      }}>
        <Field label="Send to" hint="Uses sample data for personalization. No credits are used."><input className="input" type="email" value={to} onChange={e => setTo(e.target.value)} required /></Field>
        <div className="ui-form-actions"><button className="btn btn-primary">Send test</button></div>
      </form>
    </Modal>
  )
}

function LaunchModal({ campaign, onClose, onDone }) {
  const [mode, setMode] = useState('now')
  const [at, setAt] = useState('')
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    const ok = await attempt(() => api(`/api/campaigns/${campaign.id}/launch`, { body: mode === 'later' ? { scheduled_at: new Date(at).toISOString(), timezone: campaign.timezone } : {} }), mode === 'later' ? 'Campaign scheduled' : 'Campaign launched')
    setBusy(false)
    if (ok) onDone()
  }
  return (
    <Modal title={`Launch ${campaign.name}`} onClose={onClose} width={460}>
      <div className="ui-form">
        <p className="ui-muted">Duplicates, unsubscribes, bounced and suppressed addresses are removed automatically. Every sent email uses one credit.</p>
        <label className={`ui-choice ${mode === 'now' ? 'selected' : ''}`}><input type="radio" checked={mode === 'now'} onChange={() => setMode('now')} /> Send now</label>
        <label className={`ui-choice ${mode === 'later' ? 'selected' : ''}`}><input type="radio" checked={mode === 'later'} onChange={() => setMode('later')} /> Schedule for later</label>
        {mode === 'later' && <Field label="Date and time" hint={`In your browser's time zone (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}><input className="input" type="datetime-local" value={at} onChange={e => setAt(e.target.value)} required /></Field>}
      </div>
      <div className="ui-form-actions">
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy || (mode === 'later' && !at)} onClick={go}>{mode === 'later' ? 'Schedule' : 'Launch now'}</button>
      </div>
    </Modal>
  )
}
