import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, ArrowRight, Check, Edit3, Plus, Send, Sparkles, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { api, num, pct, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, DataTable, Empty, Field, Modal, PageHeader, Row, useLoad } from '../components/ui'

const EMPTY_FORM = {
  name: '', description: '', subject: '', subject_b: '', template_id: '', template_b_id: '', send_b_at: '', segment_id: '', segment_filter: {}, list_ids: [], segment_tags: '', from_name: '',
  accounts: [], rotate: false, track_opens: true, track_clicks: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}
const STEPS = [
  { label: 'Details', hint: 'Name and purpose', icon: Edit3, title: 'Name your campaign', text: 'Give it a name your team will recognize. Only your team sees this.' },
  { label: 'Audience', hint: 'Who receives it', icon: Users, title: 'Choose your audience', text: 'Pick the lists and segments this email is for.' },
  { label: 'Content', hint: 'What they read', icon: Sparkles, title: 'Write what they will read', text: 'Choose a template and a subject line, and test a second version if you like.' },
  { label: 'Sending', hint: 'How it goes out', icon: Send, title: 'Set up sending', text: 'Choose the accounts this campaign sends from.' },
]

export function CampaignWizard({ onClose, onSaved, campaign }) {
  const { hasFeature } = useAuth()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [suggestions, setSuggestions] = useState(null)
  const [form, setForm] = useState(() => (campaign ? {
    ...EMPTY_FORM, ...campaign, name: campaign.name || '', subject: campaign.subject || '', list_ids: campaign.list_ids || [], segment_filter: campaign.segment_filter || {}, template_b_id: campaign.template_b_id || '', send_b_at: campaign.send_b_at ? campaign.send_b_at.slice(0, 16) : '', subject_b: campaign.subject_b || '', segment_tags: (campaign.segment_tags || []).join(', '), template_id: campaign.template_id || '', from_name: campaign.from_name || '', description: campaign.description || '',
  } : EMPTY_FORM))
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { data } = useLoad(async () => {
    const [lists, templates, accounts, links, segments] = await Promise.all([
      supabase.from('contact_lists').select('id, name, total_contacts').order('name'),
      supabase.from('templates').select('id, name, subject').order('name'),
      supabase.from('smtp_accounts').select('id, label, from_email, status, daily_limit').order('label'),
      campaign ? supabase.from('campaign_accounts').select('smtp_account_id, daily_limit').eq('campaign_id', campaign.id) : { data: [] },
      supabase.from('segments').select('id, name, filter').order('name'),
    ])
    const existing = unwrap(links)
    if (existing.length) setForm(f => ({ ...f, accounts: existing.map(l => ({ id: l.smtp_account_id, daily_limit: l.daily_limit ?? '' })), rotate: existing.length > 1 }))
    return { lists: unwrap(lists), templates: unwrap(templates), accounts: unwrap(accounts), segments: unwrap(segments) }
  })

  const toggleList = id => setForm(f => ({ ...f, list_ids: f.list_ids.includes(id) ? f.list_ids.filter(x => x !== id) : [...f.list_ids, id] }))
  const toggleAccount = id => setForm(f => {
    const on = f.accounts.some(a => a.id === id)
    if (!f.rotate) return { ...f, accounts: on ? [] : [{ id, daily_limit: '' }] }
    return { ...f, accounts: on ? f.accounts.filter(a => a.id !== id) : [...f.accounts, { id, daily_limit: '' }] }
  })
  const audience = (data?.lists || []).filter(l => form.list_ids.includes(l.id)).reduce((s, l) => s + (l.total_contacts || 0), 0)

  const problem = [
    !form.name.trim() && 'Enter a campaign name',
    form.list_ids.length === 0 && 'Choose at least one contact list',
    (!form.subject.trim() || !form.template_id) && 'Add a subject and choose a template',
    form.accounts.length === 0 && 'Select at least one sending account',
  ][step]

  async function suggestSubjects() {
    setAiBusy(true)
    const template = data.templates.find(t => t.id === form.template_id)
    const r = await attempt(() => api('/api/ai/generate', { body: { kind: 'subjects', input: { campaign: form.name, description: form.description, template: template?.name, current_subject: form.subject } } }))
    if (r) setSuggestions(r.subjects)
    setAiBusy(false)
  }

  async function save() {
    setSaving(true)
    const row = {
      name: form.name.trim(), description: form.description || null, subject: form.subject, subject_b: form.subject_b || null,
      template_id: form.template_id, list_ids: form.list_ids, list_id: form.list_ids[0], from_name: form.from_name || null,
      segment_tags: form.segment_tags.split(',').map(t => t.trim()).filter(Boolean),
      segment_filter: form.segment_filter || {}, template_b_id: form.template_b_id || null, send_b_at: form.send_b_at ? new Date(form.send_b_at).toISOString() : null,
      send_mode: form.rotate ? 'rotation' : 'single', track_opens: form.track_opens, track_clicks: form.track_clicks, timezone: form.timezone,
    }
    const saved = await attempt(async () => {
      const result = campaign
        ? unwrap(await supabase.from('campaigns').update(row).eq('id', campaign.id).select().single())
        : unwrap(await supabase.from('campaigns').insert({ ...row, status: 'draft' }).select().single())
      unwrap(await supabase.from('campaign_accounts').delete().eq('campaign_id', result.id))
      unwrap(await supabase.from('campaign_accounts').insert(form.accounts.map((a, i) => ({
        campaign_id: result.id, smtp_account_id: a.id, daily_limit: a.daily_limit === '' ? null : Number(a.daily_limit), priority: form.accounts.length - i,
      }))))
      return result
    }, campaign ? 'Campaign updated' : 'Draft saved')
    setSaving(false)
    if (saved) onSaved(saved)
  }

  return (
    <div className="modal-overlay wz-overlay">
      <div className="wz" role="dialog" aria-modal="true" aria-label={campaign ? `Edit ${campaign.name}` : 'New campaign'}>
        <aside className="wz-rail">
          <div className="wz-rail-head"><small>{campaign ? 'Edit campaign' : 'New campaign'}</small><strong>{form.name.trim() || 'Untitled campaign'}</strong></div>
          <ol className="wz-steps">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              return (
                <li key={s.label} className={i === step ? 'current' : i < step ? 'done' : ''}>
                  <button type="button" disabled={i >= step} onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
                    <span className="wz-dot">{i < step ? <Check size={15} /> : <Icon size={15} />}</span>
                    <span className="wz-step-text"><b>{s.label}</b><small>{s.hint}</small></span>
                  </button>
                </li>
              )
            })}
          </ol>
          <dl className="wz-summary">
            <div><dt>Contacts</dt><dd>{num(audience)}</dd></div>
            <div><dt>Accounts</dt><dd>{form.accounts.length}</dd></div>
          </dl>
        </aside>

        <div className="wz-main">
          <header className="wz-head">
            <div>
              <span className="wz-count">Step {step + 1} of {STEPS.length}</span>
              <h2>{STEPS[step].title}</h2>
              <p>{STEPS[step].text}</p>
            </div>
            <button type="button" className="wz-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </header>
          <div className="wz-progress"><span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
          <div className="wz-body">
      <div className="ui-form wz-pane" key={step}>
        {step === 0 && <>
          <Field label="Campaign name *"><input className="input" placeholder="e.g. Diwali sale 2026" value={form.name} onChange={set('name')} autoFocus /></Field>
          <Field label="Description"><textarea className="input" rows={4} placeholder="What is this campaign for? Optional." value={form.description} onChange={set('description')} /></Field>
        </>}
        {step === 1 && <>
          <div className="input-group">
            <span className="input-label">Contact lists *</span>
            {data?.lists.length === 0 && <p className="ui-note">No lists yet. <Link to="/contacts">Import contacts first.</Link></p>}
            <div className="ui-choice-list">
              {(data?.lists || []).map(l => (
                <label key={l.id} className={`ui-choice ${form.list_ids.includes(l.id) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={form.list_ids.includes(l.id)} onChange={() => toggleList(l.id)} />
                  <span style={{ flex: 1 }}>{l.name}</span><span className="ui-muted">{num(l.total_contacts)} contacts</span>
                </label>
              ))}
            </div>
            <span className="ui-hint">About {num(audience)} contacts before removing duplicates, unsubscribes and suppressed addresses.</span>
          </div>
          <Field label="Audience segment" hint="Behavior, purchase history, demographics or engagement. Build segments under All contacts.">
            <select className="input" value={form.segment_id} onChange={e => setForm(f => ({ ...f, segment_id: e.target.value, segment_filter: data.segments.find(s => s.id === e.target.value)?.filter || {} }))}>
              <option value="">{Object.keys(form.segment_filter || {}).length ? 'Keep the current segment' : 'Everyone on the selected lists'}</option>
              {(data?.segments || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Only contacts tagged" hint="Optional segment. Comma-separated; a contact needs any one tag."><input className="input" value={form.segment_tags} onChange={set('segment_tags')} placeholder="vip, newsletter" /></Field>
        </>}
        {step === 2 && <>
          <Field label="Template *">
            <select className="input" value={form.template_id} onChange={set('template_id')}>
              <option value="">Select…</option>{(data?.templates || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Subject line *" hint="Personalize with {{first_name|there}}, {{company}} or any custom field.">
            <input className="input" value={form.subject} onChange={set('subject')} />
          </Field>
          {hasFeature('ai') && (
            <div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={suggestSubjects} disabled={aiBusy}><Sparkles size={14} /> {aiBusy ? 'Thinking…' : 'Suggest subject lines'}</button>
              {suggestions && (
                <div className="ui-choice-list" style={{ marginTop: 8 }}>
                  {suggestions.map(s => (
                    <button type="button" key={s.subject} className="ui-choice" style={{ background: 'none', textAlign: 'left', font: 'inherit' }} onClick={() => setForm(f => ({ ...f, subject: s.subject }))}>
                      <span style={{ flex: 1 }}>{s.subject}</span><span className="ui-muted">{s.angle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="ui-note"><span className="ui-strong">A/B test (optional).</span> Half of the recipients get version B. Change one thing at a time so the result is clear.</div>
          <Field label="Version B subject"><input className="input" value={form.subject_b} onChange={set('subject_b')} /></Field>
          <Row>
            <Field label="Version B content">
              <select className="input" value={form.template_b_id} onChange={set('template_b_id')}>
                <option value="">Same as version A</option>{(data?.templates || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Version B send time" hint="Blank sends both together."><input className="input" type="datetime-local" value={form.send_b_at} onChange={set('send_b_at')} /></Field>
          </Row>
        </>}
        {step === 3 && <>
          <label className="ui-check"><input type="checkbox" checked={form.rotate} onChange={e => setForm(f => ({ ...f, rotate: e.target.checked, accounts: e.target.checked ? f.accounts : f.accounts.slice(0, 1) }))} />
            Rotate across multiple accounts, balancing by each account's limits and health</label>
          <div className="input-group">
            <span className="input-label">Sending {form.rotate ? 'accounts' : 'account'} *</span>
            {data?.accounts.length === 0 && <p className="ui-note">No SMTP accounts configured. A Client Admin can add them under Domains & SMTP.</p>}
            <div className="ui-choice-list">
              {(data?.accounts || []).map(a => {
                const selected = form.accounts.find(x => x.id === a.id)
                return (
                  <div key={a.id} className={`ui-choice ${selected ? 'selected' : ''}`}>
                    <label style={{ display: 'flex', flex: 1, gap: 10, alignItems: 'center', cursor: 'pointer', minWidth: 180 }}>
                      <input type={form.rotate ? 'checkbox' : 'radio'} name="smtp" checked={Boolean(selected)} disabled={a.status === 'paused'} onChange={() => toggleAccount(a.id)} />
                      <span>{a.label}<div className="ui-muted">{a.from_email}</div></span>
                    </label>
                    <Badge value={a.status} />
                    {selected && form.rotate && (
                      <input className="input" style={{ width: 130 }} type="number" min="1" max={a.daily_limit} placeholder={`Max ${a.daily_limit}/day`} aria-label={`Daily limit for ${a.label}`}
                        value={selected.daily_limit} onChange={e => setForm(f => ({ ...f, accounts: f.accounts.map(x => (x.id === a.id ? { ...x, daily_limit: e.target.value } : x)) }))} />
                    )}
                  </div>
                )
              })}
            </div>
            <span className="ui-hint">Rotation stays inside the limits you set. If every account reaches its limit, sending waits for the next window.</span>
          </div>
          <Row>
            <Field label="From name"><input className="input" value={form.from_name} onChange={set('from_name')} placeholder="Uses the account's name if blank" /></Field>
            <Field label="Time zone"><input className="input" value={form.timezone} onChange={set('timezone')} /></Field>
          </Row>
          <div className="ui-checks">
            <label className="ui-check"><input type="checkbox" checked={form.track_opens} onChange={e => setForm(f => ({ ...f, track_opens: e.target.checked }))} />Track opens</label>
            <label className="ui-check"><input type="checkbox" checked={form.track_clicks} onChange={e => setForm(f => ({ ...f, track_clicks: e.target.checked }))} />Track clicks</label>
          </div>
        </>}
      </div>
          </div>
          <footer className="wz-foot">
            {step > 0
              ? <button type="button" className="btn btn-ghost" onClick={() => setStep(s => s - 1)}><ArrowLeft size={15} /> Back</button>
              : <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>}
            {step < STEPS.length - 1
              ? <button type="button" className="btn btn-primary" onClick={() => (problem ? toast.error(problem) : setStep(s => s + 1))}>Continue <ArrowRight size={15} /></button>
              : <button type="button" className="btn btn-primary" disabled={saving} onClick={() => (problem ? toast.error(problem) : save())}>{saving ? 'Saving…' : 'Save draft'} <Check size={15} /></button>}
          </footer>
        </div>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [showWizard, setShowWizard] = useState(params.get('new') === '1')
  const [status, setStatus] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    const [campaigns, metrics] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('campaign_metrics').select('*'),
    ])
    const m = unwrap(metrics)
    return unwrap(campaigns).map(c => ({ ...c, m: m.find(x => x.campaign_id === c.id) || {} }))
  })
  useEffect(() => { if (params.get('new')) setParams({}, { replace: true }) }, []) // eslint-disable-line

  // Live progress while anything is sending.
  const active = useMemo(() => (data || []).some(c => c.status === 'sending'), [data])
  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(reload, 10000)
    return () => clearInterval(t)
  }, [active, reload])

  const rows = (data || []).filter(c => !status || c.status === status)
  const count = key => c => Number(c.m[key] || 0)

  return (
    <>
      <PageHeader title="Campaigns" subtitle="Create, schedule and monitor your email campaigns" actions={<button className="btn btn-primary" onClick={() => setShowWizard(true)}><Plus size={15} /> New campaign</button>} />
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} searchKeys={['name', 'subject']} exportName="campaigns" onRowClick={c => navigate(`/campaigns/${c.id}`)}
        filters={<select className="input" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['draft', 'scheduled', 'sending', 'paused', 'completed', 'stopped', 'failed'].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>}
        empty={<Empty icon={Send} title="No campaigns yet" description="Create your first email campaign and start reaching your audience." action={<button className="btn btn-primary btn-sm" onClick={() => setShowWizard(true)}><Plus size={14} /> New campaign</button>} />}
        columns={[
          { key: 'name', label: 'Campaign', render: c => <><div className="ui-strong">{c.name}</div><div className="ui-muted">{c.subject}</div></> },
          { key: 'status', label: 'Status', render: c => <Badge value={c.status} /> },
          { key: 'sent', label: 'Sent', align: 'right', value: count('sent'), render: c => `${num(c.m.sent)}${c.status === 'sending' && c.m.total_scheduled ? ` / ${num(c.m.total_scheduled)}` : ''}` },
          { key: 'delivery', label: 'Delivered', align: 'right', value: c => (c.m.sent ? c.m.delivered / c.m.sent : 0), render: c => pct(c.m.delivered, c.m.sent) },
          { key: 'opens', label: 'Opens (approx.)', align: 'right', value: c => (c.m.delivered ? c.m.unique_opens / c.m.delivered : 0), render: c => pct(c.m.unique_opens, c.m.delivered) },
          { key: 'clicks', label: 'Clicks', align: 'right', value: c => (c.m.delivered ? c.m.unique_clicks / c.m.delivered : 0), render: c => pct(c.m.unique_clicks, c.m.delivered) },
          { key: 'created_at', label: 'Created', render: c => format(new Date(c.created_at), 'MMM d, yyyy') },
        ]} />
      {showWizard && <CampaignWizard onClose={() => setShowWizard(false)} onSaved={c => navigate(`/campaigns/${c.id}`)} />}
    </>
  )
}
