import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Ban, Contact2, Filter, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, DataTable, Empty, Field, Modal, PageHeader, Panel, Row, Tabs, useConfirm, useLoad } from '../components/ui'

const EMPTY_FILTER = { tag: '', status: '', minScore: '', maxScore: '', listId: '', engagedDays: '', country: '', city: '', gender: '', minSpent: '', minOrders: '', purchasedDays: '' }
const parseTags = s => s.split(',').map(t => t.trim()).filter(Boolean)
const stamp = v => (v ? format(new Date(v), 'MMM d, yyyy HH:mm') : '—')

function ContactDrawer({ contact, onClose, onSaved }) {
  const [form, setForm] = useState({ name: contact.name || '', company: contact.company || '', tagsText: (contact.tags || []).join(', '), consent_status: contact.consent_status, country: contact.country || '', city: contact.city || '', gender: contact.gender || '', total_spent: contact.total_spent || 0, order_count: contact.order_count || 0, fieldsText: JSON.stringify(contact.custom_fields || {}, null, 2) })
  const { data } = useLoad(async () => {
    const [events, recipients, messages] = await Promise.all([
      supabase.from('email_events').select('*').eq('contact_id', contact.id).order('occurred_at', { ascending: false }).limit(100),
      supabase.from('campaign_recipients').select('id, status, sent_at, open_count, click_count, replied_at, campaigns(id, name)').eq('contact_id', contact.id).order('sent_at', { ascending: false }),
      supabase.from('mail_messages').select('id, subject, folder, sent_at').eq('contact_id', contact.id).order('sent_at', { ascending: false }).limit(50).then(r => (r.error ? { data: [] } : r)),
    ])
    return { events: unwrap(events), recipients: unwrap(recipients), messages: messages.data || [] }
  }, [contact.id])

  async function save(e) {
    e.preventDefault()
    const ok = await attempt(async () => {
      let custom_fields
      try { custom_fields = JSON.parse(form.fieldsText || '{}') } catch { throw new Error('Custom fields must be valid JSON') }
      unwrap(await supabase.from('contacts').update({ name: form.name, company: form.company, tags: parseTags(form.tagsText), consent_status: form.consent_status, custom_fields, country: form.country || null, city: form.city || null, gender: form.gender || null, total_spent: Number(form.total_spent) || 0, order_count: Number(form.order_count) || 0 }).eq('id', contact.id))
    }, 'Contact saved')
    if (ok) onSaved()
  }

  return (
    <Modal title={contact.email} onClose={onClose} width={720}>
      <form className="ui-form" onSubmit={save}>
        <Row><Field label="Name"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></Field><Field label="Company"><input className="input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} /></Field></Row>
        <Row>
          <Field label="Tags" hint="Comma-separated"><input className="input" value={form.tagsText} onChange={e => setForm({ ...form, tagsText: e.target.value })} /></Field>
          <Field label="Consent"><select className="input" value={form.consent_status} onChange={e => setForm({ ...form, consent_status: e.target.value })}><option value="unknown">Unknown</option><option value="opted_in">Opted in</option><option value="denied">Denied (never email)</option></select></Field>
        </Row>
        <Row>
          <Field label="Country"><input className="input" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></Field>
          <Field label="City"><input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="Gender"><input className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} /></Field>
        </Row>
        <Row>
          <Field label="Total spent"><input className="input" type="number" min="0" step="0.01" value={form.total_spent} onChange={e => setForm({ ...form, total_spent: e.target.value })} /></Field>
          <Field label="Orders"><input className="input" type="number" min="0" value={form.order_count} onChange={e => setForm({ ...form, order_count: e.target.value })} /></Field>
        </Row>
        <Field label="Custom fields" hint='JSON, e.g. {"city": "Pune"}. Use in emails as {{city}}.'><textarea className="input ui-mono" rows={3} value={form.fieldsText} onChange={e => setForm({ ...form, fieldsText: e.target.value })} /></Field>
        <div><button className="btn btn-primary btn-sm"><Save size={14} /> Save contact</button></div>
      </form>
      <div className="divider" />
      <p className="ui-muted" style={{ marginBottom: 12 }}>Engagement score: <span className="ui-strong">{contact.engagement_score}</span> / 100 · Last engaged: {stamp(contact.last_engaged_at)}</p>
      <h3 className="ui-panel-title" style={{ marginBottom: 8 }}>Campaign history</h3>
      <DataTable rows={data?.recipients || []} empty={<Empty title="Not in any campaign yet" />} pageSize={5} columns={[
        { key: 'campaign', label: 'Campaign', sort: false, render: r => r.campaigns?.name || '—' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status} /> },
        { key: 'open_count', label: 'Opens', align: 'right' }, { key: 'click_count', label: 'Clicks', align: 'right' }, { key: 'sent_at', label: 'Sent', render: r => stamp(r.sent_at) },
      ]} />
      <h3 className="ui-panel-title" style={{ margin: '16px 0 8px' }}>Activity</h3>
      <DataTable rows={data?.events || []} empty={<Empty title="No activity yet" />} pageSize={8} columns={[
        { key: 'occurred_at', label: 'When', render: e => stamp(e.occurred_at) }, { key: 'type', label: 'Event', render: e => e.type.replace('_', ' ') + (e.detail?.machine ? ' (scanner)' : '') }, { key: 'url', label: 'Detail', sort: false, render: e => e.detail?.url || e.detail?.reason || '' },
      ]} />
      {data?.messages.length > 0 && <>
        <h3 className="ui-panel-title" style={{ margin: '16px 0 8px' }}>Conversations</h3>
        <DataTable rows={data.messages} pageSize={5} columns={[{ key: 'subject', label: 'Subject' }, { key: 'folder', label: 'Folder' }, { key: 'sent_at', label: 'Date', render: m => stamp(m.sent_at) }]} />
      </>}
    </Modal>
  )
}

function ContactsTab() {
  const { hasFeature } = useAuth()
  const [filter, setFilter] = useState(EMPTY_FILTER)
  const [selected, setSelected] = useState(null)
  const [adding, setAdding] = useState(null)
  const [segmentName, setSegmentName] = useState('')
  const [ai, setAi] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const set = k => e => setFilter(f => ({ ...f, [k]: e.target.value }))

  const { data: refs, reload: reloadRefs } = useLoad(async () => {
    const [lists, segments] = await Promise.all([supabase.from('contact_lists').select('id, name').order('name'), supabase.from('segments').select('*').order('name')])
    return { lists: unwrap(lists), segments: unwrap(segments) }
  })
  const { data, loading, error, reload } = useLoad(async () => {
    let q = supabase.from('contacts').select('*').order('created_at', { ascending: false }).limit(2000)
    if (filter.tag) q = q.contains('tags', [filter.tag])
    if (filter.status) q = q.eq('status', filter.status)
    if (filter.minScore) q = q.gte('engagement_score', Number(filter.minScore))
    if (filter.maxScore) q = q.lte('engagement_score', Number(filter.maxScore))
    if (filter.listId) q = q.eq('list_id', filter.listId)
    if (filter.country) q = q.ilike('country', filter.country)
    if (filter.city) q = q.ilike('city', filter.city)
    if (filter.gender) q = q.ilike('gender', filter.gender)
    if (filter.minSpent) q = q.gte('total_spent', Number(filter.minSpent))
    if (filter.minOrders) q = q.gte('order_count', Number(filter.minOrders))
    if (filter.purchasedDays) q = q.gte('last_purchase_at', new Date(Date.now() - Number(filter.purchasedDays) * 86400000).toISOString())
    if (filter.engagedDays) q = q.gte('last_engaged_at', new Date(Date.now() - Number(filter.engagedDays) * 86400000).toISOString())
    return unwrap(await q)
  }, Object.values(filter))

  // Same address in several lists: surfaced here, and always sent to only once.
  const counts = {}
  ;(data || []).forEach(c => { const k = c.email.toLowerCase(); counts[k] = (counts[k] || 0) + 1 })

  async function suggest() {
    setAiBusy(true)
    const r = await attempt(() => api('/api/ai/segments'))
    if (r) setAi(r.segments)
    setAiBusy(false)
  }

  return (
    <>
      <div className="ui-toolbar">
        <Filter size={15} style={{ color: 'var(--text-muted)' }} />
        <select className="input" aria-label="Saved segment" value="" onChange={e => { const s = refs.segments.find(x => x.id === e.target.value); if (s) setFilter({ ...EMPTY_FILTER, ...s.filter }) }}><option value="">Saved segments…</option>{refs?.segments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select className="input" aria-label="List" value={filter.listId} onChange={set('listId')}><option value="">All lists</option>{refs?.lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className="input" aria-label="Status" value={filter.status} onChange={set('status')}><option value="">Any status</option><option value="active">Active</option><option value="unsubscribed">Unsubscribed</option><option value="bounced">Bounced</option></select>
        <input className="input" style={{ width: 120 }} aria-label="Tag" placeholder="Tag" value={filter.tag} onChange={set('tag')} />
        <input className="input" style={{ width: 110 }} aria-label="Minimum score" type="number" min="0" max="100" placeholder="Min score" value={filter.minScore} onChange={set('minScore')} />
        <input className="input" style={{ width: 150 }} aria-label="Engaged within days" type="number" min="1" placeholder="Engaged in N days" value={filter.engagedDays} onChange={set('engagedDays')} />
        <input className="input" style={{ width: 110 }} aria-label="Country" placeholder="Country" value={filter.country} onChange={set('country')} />
        <input className="input" style={{ width: 100 }} aria-label="City" placeholder="City" value={filter.city} onChange={set('city')} />
        <input className="input" style={{ width: 100 }} aria-label="Gender" placeholder="Gender" value={filter.gender} onChange={set('gender')} />
        <input className="input" style={{ width: 120 }} aria-label="Minimum spent" type="number" min="0" placeholder="Min spent" value={filter.minSpent} onChange={set('minSpent')} />
        <input className="input" style={{ width: 110 }} aria-label="Minimum orders" type="number" min="0" placeholder="Min orders" value={filter.minOrders} onChange={set('minOrders')} />
        <input className="input" style={{ width: 160 }} aria-label="Purchased within days" type="number" min="1" placeholder="Bought in N days" value={filter.purchasedDays} onChange={set('purchasedDays')} />
        <input className="input" style={{ width: 150 }} aria-label="Segment name" placeholder="Save as segment…" value={segmentName} onChange={e => setSegmentName(e.target.value)} />
        <button className="btn btn-secondary btn-sm" disabled={!segmentName} onClick={async () => {
          if (await attempt(async () => unwrap(await supabase.from('segments').insert({ name: segmentName, filter })), 'Segment saved')) { setSegmentName(''); reloadRefs() }
        }}><Save size={13} /> Save</button>
        {hasFeature('ai') && <button className="btn btn-secondary btn-sm" disabled={aiBusy} onClick={suggest}><Sparkles size={13} /> {aiBusy ? 'Thinking…' : 'Suggest segments'}</button>}
      </div>
      {ai && (
        <Panel title="Suggested segments" actions={<button className="btn btn-ghost btn-sm" onClick={() => setAi(null)}>Dismiss</button>}>
          {ai.map(s => (
            <div key={s.name} className="ui-choice" style={{ marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 200 }}><span className="ui-strong">{s.name}</span><div className="ui-muted">{s.reason}</div></div>
              <button className="btn btn-secondary btn-sm" onClick={() => setFilter({ ...EMPTY_FILTER, minScore: s.min_score || '', maxScore: s.max_score || '', tag: s.tags?.[0] || '', engagedDays: s.last_engaged_days || '' })}>Apply</button>
            </div>
          ))}
        </Panel>
      )}
      <DataTable rows={data || []} loading={loading} error={error} onRetry={reload} searchKeys={['email', 'name', 'company']} exportName="contacts" onRowClick={setSelected}
        actions={<button className="btn btn-primary btn-sm" onClick={() => setAdding({ email: '', name: '', company: '', list_id: refs?.lists[0]?.id || '', tagsText: '', consent_status: 'unknown' })}><Plus size={14} /> Add contact</button>}
        empty={<Empty icon={Contact2} title="No matching contacts" description="Import a list or change the filters." />}
        columns={[
          { key: 'email', label: 'Email', render: c => <><span className="ui-strong">{c.email}</span>{counts[c.email.toLowerCase()] > 1 && <> <Badge value="paused">Duplicate</Badge></>}</> },
          { key: 'name', label: 'Name' }, { key: 'company', label: 'Company' },
          { key: 'status', label: 'Status', render: c => <Badge value={c.status === 'active' ? 'active' : 'stopped'}>{c.status}</Badge> },
          { key: 'tags', label: 'Tags', sort: false, render: c => (c.tags || []).join(', ') || '—', value: c => (c.tags || []).join(', ') },
          { key: 'total_spent', label: 'Spent', align: 'right', value: c => Number(c.total_spent || 0), render: c => Number(c.total_spent || 0).toLocaleString() },
          { key: 'engagement_score', label: 'Score', align: 'right' },
          { key: 'last_engaged_at', label: 'Last engaged', render: c => (c.last_engaged_at ? format(new Date(c.last_engaged_at), 'MMM d, yyyy') : '—') },
        ]} />
      {selected && <ContactDrawer contact={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); reload() }} />}
      {adding && (
        <Modal title="Add contact" onClose={() => setAdding(null)}>
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            const email = adding.email.trim().toLowerCase()
            const ok = await attempt(async () => {
              const existing = unwrap(await supabase.from('contacts').select('id').eq('list_id', adding.list_id).ilike('email', email))
              if (existing.length) throw new Error('This email is already in that list')
              const suppressed = unwrap(await supabase.from('suppressions').select('email').eq('email', email))
              if (suppressed.length) throw new Error('This address has opted out or bounced, so it cannot be added')
              unwrap(await supabase.from('contacts').insert({ email, name: adding.name, company: adding.company, list_id: adding.list_id, tags: parseTags(adding.tagsText), consent_status: adding.consent_status, status: 'active' }))
            }, 'Contact added')
            if (ok) { setAdding(null); reload() }
          }}>
            <Field label="Email *"><input className="input" type="email" value={adding.email} onChange={e => setAdding({ ...adding, email: e.target.value })} required autoFocus /></Field>
            <Row><Field label="Name"><input className="input" value={adding.name} onChange={e => setAdding({ ...adding, name: e.target.value })} /></Field><Field label="Company"><input className="input" value={adding.company} onChange={e => setAdding({ ...adding, company: e.target.value })} /></Field></Row>
            <Row>
              <Field label="List *"><select className="input" value={adding.list_id} onChange={e => setAdding({ ...adding, list_id: e.target.value })} required><option value="">Select…</option>{refs?.lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
              <Field label="Tags"><input className="input" value={adding.tagsText} onChange={e => setAdding({ ...adding, tagsText: e.target.value })} /></Field>
              <Field label="Consent"><select className="input" value={adding.consent_status} onChange={e => setAdding({ ...adding, consent_status: e.target.value })}><option value="unknown">Unknown</option><option value="opted_in">Opted in</option></select></Field>
            </Row>
            <div className="ui-form-actions"><button className="btn btn-primary">Add contact</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}

const ROLE_ADDRESS = /^(info|admin|sales|support|contact|hello|noreply|no-reply|office|billing|abuse|postmaster|webmaster)@/i
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|yopmail|trashmail)\./i
const VALID = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function HygieneTab() {
  const confirm = useConfirm()
  const { data, loading, error, reload } = useLoad(async () => unwrap(await supabase.from('contacts').select('id, email, status, created_at, last_engaged_at').eq('status', 'active').limit(5000)))
  const groups = useMemo(() => {
    const rows = data || []
    const seen = new Set()
    const cutoff = Date.now() - 180 * 86400000
    return [
      { key: 'invalid', label: 'Invalid format', advice: 'These will bounce. Suppress them.', rows: rows.filter(c => !VALID.test(c.email)) },
      { key: 'disposable', label: 'Disposable addresses', advice: 'Temporary inboxes rarely engage.', rows: rows.filter(c => DISPOSABLE.test(c.email)) },
      { key: 'role', label: 'Role addresses', advice: 'Shared inboxes like info@ complain and unsubscribe more often. Review before removing.', rows: rows.filter(c => ROLE_ADDRESS.test(c.email)) },
      { key: 'inactive', label: 'No engagement in 180 days', advice: 'Try a re-engagement campaign, then suppress those who stay silent.', rows: rows.filter(c => new Date(c.last_engaged_at || c.created_at).getTime() < cutoff) },
      { key: 'duplicates', label: 'Duplicates across lists', advice: 'Each address is only ever sent one copy, so these are safe to leave.', rows: rows.filter(c => { const k = c.email.toLowerCase(); if (seen.has(k)) return true; seen.add(k); return false }), noAction: true },
    ]
  }, [data])
  async function suppress(group) {
    if (!await confirm({ title: `Suppress ${group.rows.length} addresses?`, danger: true, confirmLabel: 'Suppress', message: 'They will not be emailed again. You can remove them from the suppression list later.' })) return
    const rows = [...new Set(group.rows.map(c => c.email.toLowerCase()))].map(email => ({ email, reason: 'manual', source: `List hygiene: ${group.label}` }))
    if (await attempt(async () => unwrap(await supabase.from('suppressions').upsert(rows, { ignoreDuplicates: true })), 'Addresses suppressed')) reload()
  }
  return (
    <DataTable rows={groups.map(g => ({ ...g, id: g.key, count: g.rows.length }))} loading={loading} error={error} onRetry={reload} columns={[
      { key: 'label', label: 'Check', render: g => <><div className="ui-strong">{g.label}</div><div className="ui-muted">{g.advice}</div></> },
      { key: 'count', label: 'Contacts', align: 'right' },
      { key: 'x', label: '', sort: false, render: g => !g.noAction && g.count > 0 && <button className="btn btn-secondary btn-sm" onClick={() => suppress(g)}><Ban size={13} /> Suppress</button> },
    ]} />
  )
}

function SuppressionTab() {
  const { isClientAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const { data, loading, reload } = useLoad(async () => unwrap(await supabase.from('suppressions').select('*').order('created_at', { ascending: false }).limit(2000)))
  return (
    <>
      <form className="ui-toolbar" onSubmit={async e => {
        e.preventDefault()
        if (await attempt(async () => unwrap(await supabase.from('suppressions').insert({ email: email.trim().toLowerCase(), reason: 'manual', source: 'Added by hand' })), 'Address suppressed')) { setEmail(''); reload() }
      }}>
        <input className="input" style={{ flex: '0 1 300px' }} type="email" aria-label="Email to suppress" placeholder="address@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
        <button className="btn btn-secondary btn-sm"><Ban size={14} /> Suppress</button>
      </form>
      <p className="ui-muted" style={{ marginBottom: 12 }}>These addresses are never emailed, whichever list they appear in. Unsubscribes, hard bounces and complaints can't be removed.</p>
      <DataTable rows={(data || []).map(s => ({ ...s, id: s.email }))} loading={loading} searchKeys={['email']} exportName="suppressions" empty={<Empty icon={Ban} title="No suppressed addresses" />} columns={[
        { key: 'email', label: 'Email', render: s => <span className="ui-strong">{s.email}</span> }, { key: 'reason', label: 'Reason', render: s => s.reason.replace('_', ' ') }, { key: 'source', label: 'Source' }, { key: 'created_at', label: 'Added', render: s => stamp(s.created_at) },
        { key: 'x', label: '', sort: false, csv: false, render: s => isClientAdmin && s.reason === 'manual' && <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Remove ${s.email}`} onClick={async () => {
          if (await attempt(async () => unwrap(await supabase.from('suppressions').delete().eq('email', s.email)), 'Removed')) reload()
        }}><Trash2 size={14} /></button> },
      ]} />
    </>
  )
}

export default function CrmPage() {
  const [tab, setTab] = useState('contacts')
  return (
    <>
      <PageHeader title="All contacts" subtitle="Search, segment and see the history of everyone you email" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'contacts', label: 'Contacts' }, { value: 'hygiene', label: 'List hygiene' }, { value: 'suppression', label: 'Suppression list' }]} />
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'hygiene' && <HygieneTab />}
      {tab === 'suppression' && <SuppressionTab />}
    </>
  )
}
