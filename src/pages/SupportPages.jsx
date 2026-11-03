import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, formatDistanceStrict } from 'date-fns'
import { ArrowLeft, LifeBuoy, Paperclip, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, DataTable, Empty, Field, Modal, PageHeader, Panel, Row, Stat, StatGrid, useLoad } from '../components/ui'

const STATUSES = ['open', 'in_progress', 'waiting_client', 'resolved', 'closed']
const CATEGORIES = ['general', 'deliverability', 'billing', 'technical', 'account', 'feature request']
const stamp = v => format(new Date(v), 'MMM d, yyyy HH:mm')
const MAX_FILE = 10 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain', 'text/csv']

async function uploadAll(files, orgId) {
  const out = []
  for (const file of files) {
    if (file.size > MAX_FILE) throw new Error(`${file.name} is over 10 MB`)
    if (!ALLOWED.includes(file.type)) throw new Error(`${file.name}: use an image, PDF, text or CSV file`)
    // Random path: the original name can contain anything and is kept only as a label.
    const path = `${orgId}/${crypto.randomUUID()}`
    unwrap(await supabase.storage.from('ticket-attachments').upload(path, file, { contentType: file.type }))
    out.push({ path, name: file.name, size: file.size })
  }
  return out
}

function Attachments({ items }) {
  if (!items?.length) return null
  const open = async a => {
    const { data, error } = await supabase.storage.from('ticket-attachments').createSignedUrl(a.path, 60)
    if (error) toast.error(error.message)
    else window.open(data.signedUrl, '_blank', 'noopener')
  }
  return <div className="ui-actions" style={{ marginTop: 8 }}>{items.map(a => <button key={a.path} className="btn btn-secondary btn-sm" onClick={() => open(a)}><Paperclip size={13} /> {a.name}</button>)}</div>
}

function NewTicket({ onClose, onCreated }) {
  const { organization } = useAuth()
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'normal' })
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <Modal title="Raise a support ticket" onClose={onClose}>
      <form className="ui-form" onSubmit={async e => {
        e.preventDefault()
        setBusy(true)
        const row = await attempt(async () => {
          const attachments = await uploadAll(files, organization.id)
          return unwrap(await supabase.from('tickets').insert({ ...form, attachments }).select().single())
        }, 'Ticket raised')
        setBusy(false)
        if (row) onCreated(row)
      }}>
        <Field label="Subject *"><input className="input" value={form.subject} onChange={set('subject')} required autoFocus /></Field>
        <Row>
          <Field label="Category"><select className="input" value={form.category} onChange={set('category')}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Priority"><select className="input" value={form.priority} onChange={set('priority')}>{['low', 'normal', 'high', 'urgent'].map(c => <option key={c}>{c}</option>)}</select></Field>
        </Row>
        <Field label="Description *"><textarea className="input" rows={5} value={form.description} onChange={set('description')} required /></Field>
        <Field label="Attachments" hint="Screenshots or documents: images, PDF, text or CSV, up to 10 MB each."><input className="input" type="file" multiple accept={ALLOWED.join(',')} onChange={e => setFiles([...e.target.files])} /></Field>
        <div className="ui-form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Raise ticket'}</button></div>
      </form>
    </Modal>
  )
}

export function SupportPage() {
  const { isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')
  const [company, setCompany] = useState('')
  const { data, loading, error, reload } = useLoad(async () => {
    const [tickets, orgs] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      isSuperAdmin ? supabase.from('organizations').select('id, name').order('name') : { data: [] },
    ])
    const names = unwrap(orgs)
    return { names, tickets: unwrap(tickets).map(t => ({ ...t, company: names.find(o => o.id === t.org_id)?.name })) }
  })

  const rows = (data?.tickets || []).filter(t => (!status || t.status === status) && (!company || t.org_id === company))
  const stats = useMemo(() => {
    const all = data?.tickets || []
    const hours = (from, to) => (new Date(to) - new Date(from)) / 3600000
    const avg = list => (list.length ? `${(list.reduce((s, x) => s + x, 0) / list.length).toFixed(1)}h` : '—')
    return {
      open: all.filter(t => !['resolved', 'closed'].includes(t.status)).length,
      urgent: all.filter(t => t.priority === 'urgent' && !['resolved', 'closed'].includes(t.status)).length,
      response: avg(all.filter(t => t.first_response_at).map(t => hours(t.created_at, t.first_response_at))),
      resolution: avg(all.filter(t => t.resolved_at).map(t => hours(t.created_at, t.resolved_at))),
    }
  }, [data])

  return (
    <>
      <PageHeader title={isSuperAdmin ? 'Support tickets' : 'Support'} subtitle={isSuperAdmin ? 'Requests from every client' : 'Get help from the Synerax team'}
        actions={!isSuperAdmin && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={15} /> New ticket</button>} />
      {isSuperAdmin && (
        <StatGrid>
          <Stat label="Open" value={stats.open} /><Stat label="Urgent" value={stats.urgent} />
          <Stat label="Avg first response" value={stats.response} /><Stat label="Avg resolution" value={stats.resolution} />
        </StatGrid>
      )}
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} searchKeys={['subject', 'company', 'category']} exportName="tickets" onRowClick={t => navigate(`/support/${t.id}`)}
        filters={<>
          <select className="input" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
          {isSuperAdmin && <select className="input" aria-label="Client" value={company} onChange={e => setCompany(e.target.value)}><option value="">All clients</option>{data?.names.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
        </>}
        empty={<Empty icon={LifeBuoy} title="No tickets" description={isSuperAdmin ? 'Client requests appear here.' : 'Need a hand? Raise a ticket and the Synerax team will reply here.'} />}
        columns={[
          { key: 'number', label: '#', render: t => `#${t.number}` },
          { key: 'subject', label: 'Subject', render: t => <span className="ui-strong">{t.subject}</span> },
          ...(isSuperAdmin ? [{ key: 'company', label: 'Client' }] : []),
          { key: 'category', label: 'Category' }, { key: 'priority', label: 'Priority', render: t => <Badge value={t.priority} /> },
          { key: 'status', label: 'Status', render: t => <Badge value={t.status} /> },
          { key: 'created_at', label: 'Opened', render: t => format(new Date(t.created_at), 'MMM d, yyyy') },
        ]} />
      {creating && <NewTicket onClose={() => setCreating(false)} onCreated={t => navigate(`/support/${t.id}`)} />}
    </>
  )
}

export function TicketDetailPage() {
  const { id } = useParams()
  const { isSuperAdmin, user, organization } = useAuth()
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useLoad(async () => {
    const [ticket, messages, staff] = await Promise.all([
      supabase.from('tickets').select('*').eq('id', id).single(),
      supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at'),
      isSuperAdmin ? supabase.from('profiles').select('id, email, full_name').eq('role', 'super_admin') : { data: [] },
    ])
    return { ticket: unwrap(ticket), messages: unwrap(messages), staff: unwrap(staff) }
  }, [id])

  if (loading) return <PageHeader title="Loading ticket…" />
  if (error) return <Empty title="Ticket not found" description={error} />
  const { ticket, messages, staff } = data
  const update = async patch => { if (await attempt(async () => unwrap(await supabase.from('tickets').update(patch).eq('id', id)), 'Ticket updated')) reload() }

  async function reply(e) {
    e.preventDefault()
    setBusy(true)
    const ok = await attempt(async () => {
      const attachments = await uploadAll(files, ticket.org_id)
      unwrap(await supabase.from('ticket_messages').insert({ ticket_id: id, body, is_internal: isSuperAdmin && internal, attachments, org_id: ticket.org_id }))
    }, internal ? 'Note added' : 'Reply sent')
    setBusy(false)
    if (ok) { setBody(''); setFiles([]); setInternal(false); reload() }
  }

  return (
    <>
      <PageHeader title={`#${ticket.number} ${ticket.subject}`} subtitle={`${ticket.category} · opened ${stamp(ticket.created_at)}`} back={<Link to="/support" className="ui-back"><ArrowLeft size={14} /> Tickets</Link>}
        actions={<><Badge value={ticket.priority} /><Badge value={ticket.status} /></>} />
      <div className="ui-grid-2" style={{ gridTemplateColumns: isSuperAdmin ? 'minmax(0, 2fr) minmax(240px, 1fr)' : '1fr' }}>
        <div style={{ minWidth: 0 }}>
          <Panel title="Request">
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{ticket.description}</p>
            <Attachments items={ticket.attachments} />
          </Panel>
          {messages.map(m => (
            <Panel key={m.id} title={<>{m.author_id === user.id ? 'You' : m.author_name || 'Support'}{m.is_internal && <> <Badge value="waiting_client">Internal note</Badge></>}</>} subtitle={stamp(m.created_at)}>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{m.body}</p>
              <Attachments items={m.attachments} />
            </Panel>
          ))}
          {ticket.status !== 'closed' && (
            <Panel title="Reply">
              <form className="ui-form" onSubmit={reply}>
                <textarea className="input" rows={4} aria-label="Reply" value={body} onChange={e => setBody(e.target.value)} required />
                <input className="input" type="file" multiple aria-label="Attachments" accept={ALLOWED.join(',')} onChange={e => setFiles([...e.target.files])} />
                {isSuperAdmin && <label className="ui-check"><input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />Internal note: the client won't see this</label>}
                <div><button className="btn btn-primary" disabled={busy}>{internal ? 'Add note' : 'Send reply'}</button></div>
              </form>
            </Panel>
          )}
        </div>
        {isSuperAdmin && (
          <Panel title="Manage">
            <div className="ui-form">
              <Field label="Status"><select className="input" value={ticket.status} onChange={e => update({ status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></Field>
              <Field label="Priority"><select className="input" value={ticket.priority} onChange={e => update({ priority: e.target.value })}>{['low', 'normal', 'high', 'urgent'].map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Assigned to"><select className="input" value={ticket.assigned_to || ''} onChange={e => update({ assigned_to: e.target.value || null })}><option value="">Unassigned</option>{staff.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}</select></Field>
              <p className="ui-muted">First response: {ticket.first_response_at ? `${formatDistanceStrict(new Date(ticket.first_response_at), new Date(ticket.created_at))}` : 'not yet'}<br />Resolved: {ticket.resolved_at ? `in ${formatDistanceStrict(new Date(ticket.resolved_at), new Date(ticket.created_at))}` : 'not yet'}</p>
              <Link to={`/admin/companies/${ticket.org_id}`} className="btn btn-secondary btn-sm" style={{ justifyContent: 'center' }}>Open client</Link>
            </div>
          </Panel>
        )}
      </div>
    </>
  )
}
