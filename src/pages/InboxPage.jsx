import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { Archive, Edit, FileText, Forward, Inbox as InboxIcon, Paperclip, Plus, RefreshCw, Reply, ReplyAll, Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { api, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, Empty, Field, Modal, PageHeader, Row, SkeletonRows, useConfirm, useLoad } from '../components/ui'

const FOLDERS = [['inbox', 'Inbox', InboxIcon], ['sent', 'Sent', Send], ['drafts', 'Drafts', FileText], ['archive', 'Archive', Archive], ['trash', 'Trash', Trash2]]
const escapeHtml = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Incoming mail is hostile HTML. The empty sandbox blocks scripts, forms and same-origin access. */
function MessageBody({ message }) {
  if (!message.html_body) return <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{message.text_body}</p>
  return <iframe className="ix-frame" title={`Email: ${message.subject}`} sandbox="" referrerPolicy="no-referrer" style={{ height: 320 }} srcDoc={`<base target="_blank">${message.html_body}`} />
}

function Compose({ mailboxes, initial, onClose, onSent }) {
  const [form, setForm] = useState({ mailbox_id: mailboxes[0]?.id || '', to: '', cc: '', subject: '', body: '', ...initial })
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const list = v => v.split(/[,;\s]+/).filter(Boolean)

  async function submit(asDraft) {
    setBusy(true)
    const attachments = await Promise.all(files.map(f => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ filename: f.name, contentType: f.type, content: String(reader.result).split(',')[1] })
      reader.onerror = reject
      reader.readAsDataURL(f)
    })))
    const html = `<div style="white-space:pre-wrap">${escapeHtml(form.body)}</div>${form.quoted || ''}`
    const ok = await attempt(() => api('/api/inbox/send', { body: {
      mailbox_id: form.mailbox_id, to: list(form.to), cc: list(form.cc), subject: form.subject, html, text: form.body,
      in_reply_to: form.in_reply_to, references: form.references, attachments, as_draft: asDraft, draft_id: form.draft_id,
    } }), asDraft ? 'Draft saved' : 'Email sent')
    setBusy(false)
    if (ok) onSent()
  }

  return (
    <Modal title={form.in_reply_to ? 'Reply' : 'New email'} onClose={onClose} width={640}>
      <form className="ui-form" onSubmit={e => { e.preventDefault(); submit(false) }}>
        <Field label="From"><select className="input" value={form.mailbox_id} onChange={set('mailbox_id')} required>{mailboxes.map(m => <option key={m.id} value={m.id}>{m.label} ({m.email})</option>)}</select></Field>
        <Field label="To *"><input className="input" value={form.to} onChange={set('to')} required /></Field>
        <Field label="Cc"><input className="input" value={form.cc} onChange={set('cc')} /></Field>
        <Field label="Subject"><input className="input" value={form.subject} onChange={set('subject')} required /></Field>
        <Field label="Message"><textarea className="input" rows={8} value={form.body} onChange={set('body')} required /></Field>
        <Field label="Attachments" hint="Up to about 10 MB in total."><input className="input" type="file" multiple onChange={e => setFiles([...e.target.files])} /></Field>
        <div className="ui-form-actions">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => submit(true)}>Save draft</button>
          <button className="btn btn-primary" disabled={busy}><Send size={14} /> {busy ? 'Sending…' : 'Send'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ConnectMailbox({ onClose, onDone, smtp }) {
  const [form, setForm] = useState({ label: '', email: '', imap_host: '', imap_port: 993, imap_secure: true, username: '', password: '', smtp_account_id: '' })
  const [busy, setBusy] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  return (
    <Modal title="Connect a mailbox" onClose={onClose} width={600}>
      <p className="ui-note">SMTP only sends, so incoming mail needs IMAP. Google and Microsoft accounts need IMAP enabled and an app password. Direct Gmail API and Microsoft Graph sign-in aren't available yet.</p>
      <form className="ui-form" onSubmit={async e => {
        e.preventDefault()
        setBusy(true)
        const ok = await attempt(() => api('/api/mailboxes', { body: { ...form, imap_port: Number(form.imap_port) } }), 'Mailbox connected. Mail is syncing.')
        setBusy(false)
        if (ok) onDone()
      }}>
        <Row><Field label="Label"><input className="input" value={form.label} onChange={set('label')} /></Field><Field label="Email *"><input className="input" type="email" value={form.email} onChange={set('email')} required /></Field></Row>
        <Row><Field label="IMAP host *"><input className="input" placeholder="imap.gmail.com" value={form.imap_host} onChange={set('imap_host')} required /></Field><Field label="Port"><input className="input" type="number" value={form.imap_port} onChange={set('imap_port')} /></Field></Row>
        <Row><Field label="Username *"><input className="input" autoComplete="off" value={form.username} onChange={set('username')} required /></Field><Field label="Password *" hint="Encrypted; never shown again."><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required /></Field></Row>
        <Field label="Send replies through" hint="Without one, this mailbox is read-only."><select className="input" value={form.smtp_account_id} onChange={set('smtp_account_id')}><option value="">None</option>{smtp.map(a => <option key={a.id} value={a.id}>{a.label} ({a.from_email})</option>)}</select></Field>
        <div className="ui-form-actions"><button className="btn btn-primary" disabled={busy}>{busy ? 'Connecting…' : 'Test & connect'}</button></div>
      </form>
    </Modal>
  )
}

export default function InboxPage() {
  const { isClientAdmin } = useAuth()
  const confirm = useConfirm()
  const [folder, setFolder] = useState('inbox')
  const [mailboxId, setMailboxId] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [compose, setCompose] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const boxes = useLoad(async () => {
    const [mailboxes, smtp] = await Promise.all([
      supabase.from('mailboxes').select('*').order('created_at'),
      isClientAdmin ? supabase.from('smtp_accounts').select('id, label, from_email') : { data: [] },
    ])
    return { mailboxes: unwrap(mailboxes), smtp: unwrap(smtp) }
  })
  const mail = useLoad(async () => {
    let q = supabase.from('mail_messages').select('*').eq('folder', folder).order('sent_at', { ascending: false }).limit(200)
    if (mailboxId) q = q.eq('mailbox_id', mailboxId)
    const term = query.trim().replace(/[,()%*\\]/g, ' ')
    if (term) q = q.or(`subject.ilike.%${term}%,from_address.ilike.%${term}%,from_name.ilike.%${term}%,text_body.ilike.%${term}%`)
    return unwrap(await q)
  }, [folder, mailboxId, query])
  const thread = useLoad(async () => {
    if (!selected) return []
    return unwrap(await supabase.from('mail_messages').select('*, campaigns(id, name)').eq('thread_key', selected.thread_key).neq('folder', 'drafts').order('sent_at'))
  }, [selected?.thread_key])

  const mailboxes = boxes.data?.mailboxes || []
  // One row per conversation, showing its newest message.
  const conversations = useMemo(() => {
    const seen = new Set()
    return (mail.data || []).filter(m => (seen.has(m.thread_key) ? false : seen.add(m.thread_key)))
  }, [mail.data])

  async function open(m) {
    if (folder === 'drafts') {
      setCompose({ mailbox_id: m.mailbox_id, to: m.to_addresses.join(', '), cc: m.cc_addresses.join(', '), subject: m.subject, body: m.text_body || '', draft_id: m.id, in_reply_to: m.in_reply_to })
      return
    }
    setSelected(m)
    if (!m.is_read) {
      await supabase.from('mail_messages').update({ is_read: true }).eq('thread_key', m.thread_key)
      mail.reload()
    }
  }

  async function moveThread(target, label) {
    if (await attempt(async () => unwrap(await supabase.from('mail_messages').update({ folder: target }).eq('thread_key', selected.thread_key).neq('folder', 'sent')), label)) {
      setSelected(null)
      mail.reload()
    }
  }

  function replyTo(m, mode) {
    const mailbox = mailboxes.find(b => b.id === m.mailbox_id)
    const prefix = mode === 'forward' ? 'Fwd: ' : 'Re: '
    const subject = /^(re|fwd):/i.test(m.subject || '') ? m.subject : `${prefix}${m.subject || ''}`
    const sentByUs = m.from_address === mailbox?.email
    const to = mode === 'forward' ? '' : sentByUs ? m.to_addresses.join(', ') : m.from_address
    const cc = mode === 'all' ? [...m.to_addresses, ...m.cc_addresses].filter(a => a !== mailbox?.email && a !== m.from_address).join(', ') : ''
    const quoted = `<blockquote style="margin:16px 0 0;padding-left:12px;border-left:2px solid #ccc;color:#555">On ${format(new Date(m.sent_at), 'PPpp')}, ${escapeHtml(m.from_address)} wrote:<br>${m.html_body ? '' : escapeHtml(m.text_body).replace(/\n/g, '<br>')}</blockquote>`
    setCompose({ mailbox_id: m.mailbox_id, to, cc, subject, body: '', quoted, ...(mode === 'forward' ? {} : { in_reply_to: m.message_id, references: [m.thread_key, m.message_id] }) })
  }

  async function sync() {
    setSyncing(true)
    const results = await Promise.all(mailboxes.map(b => api(`/api/mailboxes/${b.id}/sync`).catch(err => { toast.error(`${b.label}: ${err.message}`); return { imported: 0 } })))
    toast.success(`${results.reduce((s, r) => s + r.imported, 0)} new message(s)`)
    setSyncing(false)
    boxes.reload(); mail.reload()
  }

  if (boxes.loading) return <><PageHeader title="Inbox" /><SkeletonRows /></>
  if (mailboxes.length === 0) {
    return (
      <>
        <PageHeader title="Inbox" subtitle="Read and answer campaign replies without leaving Synerax Mail" />
        <Empty icon={InboxIcon} title="No mailboxes connected" description={isClientAdmin ? 'Connect a mailbox to bring replies here.' : 'Ask your Client Admin to connect a mailbox.'}
          action={isClientAdmin && <button className="btn btn-primary btn-sm" onClick={() => setConnecting(true)}><Plus size={14} /> Connect mailbox</button>} />
        {connecting && <ConnectMailbox smtp={boxes.data.smtp} onClose={() => setConnecting(false)} onDone={() => { setConnecting(false); boxes.reload() }} />}
      </>
    )
  }

  return (
    <>
      <PageHeader title="Inbox" subtitle={mailboxes.some(b => b.status === 'error') ? 'A mailbox has a connection problem. Check its password.' : `${mailboxes.length} connected mailbox(es)`} actions={<>
        <button className="btn btn-secondary btn-sm" disabled={syncing} onClick={sync}><RefreshCw size={14} /> {syncing ? 'Syncing…' : 'Sync'}</button>
        {isClientAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setConnecting(true)}><Plus size={14} /> Mailbox</button>}
        <button className="btn btn-primary btn-sm" onClick={() => setCompose({})}><Edit size={14} /> Compose</button>
      </>} />
      <div className="ui-toolbar">
        <input className="input" style={{ flex: '0 1 300px' }} type="search" aria-label="Search emails" placeholder="Search emails…" value={query} onChange={e => setQuery(e.target.value)} />
        <select className="input" aria-label="Account" value={mailboxId} onChange={e => setMailboxId(e.target.value)}><option value="">All accounts</option>{mailboxes.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select>
      </div>
      <div className="ix">
        <nav className="ix-folders" aria-label="Folders">
          {FOLDERS.map(([value, label, Icon]) => (
            <button key={value} className={`app-nav-link ${folder === value ? 'active' : ''}`} style={{ width: '100%', border: 0, background: folder === value ? undefined : 'none', cursor: 'pointer' }}
              onClick={() => { setFolder(value); setSelected(null) }}><Icon size={15} />{label}</button>
          ))}
        </nav>
        <div className="ix-list">
          {mail.loading ? <SkeletonRows /> : conversations.length === 0 ? <Empty title={`Nothing in ${folder}`} /> : conversations.map(m => (
            <button key={m.id} className={`ix-item ${m.is_read ? '' : 'unread'} ${selected?.thread_key === m.thread_key ? 'active' : ''}`} onClick={() => open(m)}>
              <strong>{folder === 'sent' || folder === 'drafts' ? m.to_addresses.join(', ') || '(no recipient)' : m.from_name || m.from_address}</strong>
              <div className="ix-subject">{m.subject}</div>
              <div className="ui-muted">{format(new Date(m.sent_at), 'MMM d, HH:mm')}{m.campaign_id && ' · campaign reply'}</div>
            </button>
          ))}
        </div>
        <div className="ix-read">
          {!selected ? <Empty icon={InboxIcon} title="Select a conversation" /> : (
            <>
              <div className="ui-page-header" style={{ marginBottom: 12 }}>
                <h2 className="ui-panel-title" style={{ fontSize: 17 }}>{selected.subject}</h2>
                <div className="ui-actions">
                  {folder !== 'archive' && <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label="Archive" title="Archive" onClick={() => moveThread('archive', 'Archived')}><Archive size={15} /></button>}
                  {folder !== 'inbox' && folder !== 'sent' && <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label="Move to inbox" title="Move to inbox" onClick={() => moveThread('inbox', 'Moved to inbox')}><InboxIcon size={15} /></button>}
                  {folder !== 'trash' && <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label="Move to trash" title="Move to trash" onClick={async () => {
                    if (await confirm({ title: 'Move this conversation to Trash?', message: 'You can restore it from the Trash folder.', confirmLabel: 'Move to Trash' })) moveThread('trash', 'Moved to trash')
                  }}><Trash2 size={15} /></button>}
                </div>
              </div>
              {(thread.data || []).map(m => (
                <article key={m.id} className="ix-message">
                  <div style={{ marginBottom: 8 }}>
                    <div className="ui-strong">{m.from_name || m.from_address}</div>
                    <div className="ui-muted">To {m.to_addresses.join(', ')}{m.cc_addresses.length > 0 && ` · Cc ${m.cc_addresses.join(', ')}`} · {format(new Date(m.sent_at), 'PPp')}</div>
                    {m.campaigns && <div style={{ marginTop: 4 }}><Badge value="sending"><Link to={`/campaigns/${m.campaigns.id}`} style={{ color: 'inherit' }}>Reply to {m.campaigns.name}</Link></Badge></div>}
                  </div>
                  <MessageBody message={m} />
                  {m.attachments?.length > 0 && <div className="ui-muted" style={{ marginTop: 8 }}><Paperclip size={12} /> {m.attachments.map(a => a.filename).join(', ')} (open in your mail provider)</div>}
                </article>
              ))}
              {thread.data?.length > 0 && (() => {
                const last = thread.data[thread.data.length - 1]
                return (
                  <div className="ui-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => replyTo(last, 'reply')}><Reply size={14} /> Reply</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => replyTo(last, 'all')}><ReplyAll size={14} /> Reply all</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => replyTo(last, 'forward')}><Forward size={14} /> Forward</button>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>
      {compose && <Compose mailboxes={mailboxes} initial={compose} onClose={() => setCompose(null)} onSent={() => { setCompose(null); mail.reload(); thread.reload() }} />}
      {connecting && <ConnectMailbox smtp={boxes.data.smtp} onClose={() => setConnecting(false)} onDone={() => { setConnecting(false); boxes.reload() }} />}
    </>
  )
}
