import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Plus, Send, Trash2, X, Play, Eye, Search } from 'lucide-react'
import { format } from 'date-fns'

const STATUS_MAP = {
  draft: 'neutral', sending: 'info', completed: 'success', failed: 'error', paused: 'warning'
}

export default function CampaignsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [templates, setTemplates] = useState([])
  const [contactLists, setContactLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showLaunchModal, setShowLaunchModal] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', subject: '', template_id: '', list_id: '', from_name: '', from_email: '' })
  const [saving, setSaving] = useState(false)
  const [launching, setLaunching] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [c, t, l] = await Promise.all([
      supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('templates').select('id, name').eq('user_id', user.id),
      supabase.from('contact_lists').select('id, name, total_contacts').eq('user_id', user.id),
    ])
    setCampaigns(c.data || [])
    setTemplates(t.data || [])
    setContactLists(l.data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('campaigns').insert({
      ...form, user_id: user.id, status: 'draft'
    })
    if (error) toast.error(error.message)
    else { toast.success('Campaign created!'); setShowModal(false); setForm({ name: '', subject: '', template_id: '', list_id: '', from_name: '', from_email: '' }); loadAll() }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this campaign?')) return
    const { error } = await supabase.from('campaigns').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Campaign deleted'); loadAll() }
  }

  async function handleLaunch(campaign) {
    setLaunching(true)
    // Update status to sending
    const { error } = await supabase.from('campaigns').update({ status: 'sending', launched_at: new Date().toISOString() }).eq('id', campaign.id)
    if (error) { toast.error(error.message); setLaunching(false); return }

    // Simulate sending (in real app, this triggers your worker service)
    toast.success('Campaign launched! Emails are being queued for delivery.', { duration: 5000 })
    setShowLaunchModal(null)
    setLaunching(false)
    loadAll()
  }

  const filtered = campaigns.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Campaigns</h1>
          <p className="page-subtitle">Create and manage your email campaigns</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input" placeholder="Search campaigns..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      {/* Campaigns grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Send size={28} /></div>
            <p className="empty-title">{search ? 'No campaigns found' : 'No campaigns yet'}</p>
            <p className="empty-desc">{search ? 'Try a different search term' : 'Create your first email campaign and start reaching your audience'}</p>
            {!search && <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Plus size={14} /> Create Campaign</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filtered.map(c => {
            const list = contactLists.find(l => l.id === c.list_id)
            return (
              <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>{c.name}</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.subject}</p>
                  </div>
                  <span className={`badge badge-${STATUS_MAP[c.status] || 'neutral'}`}>{c.status || 'draft'}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {c.from_email && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      From: <span style={{ color: 'var(--text-secondary)' }}>{c.from_name} &lt;{c.from_email}&gt;</span>
                    </div>
                  )}
                  {list && (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      List: <span style={{ color: 'var(--text-secondary)' }}>{list.name} ({list.total_contacts || 0} contacts)</span>
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Created: {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </div>
                </div>

                <div className="divider" style={{ margin: 0 }} />

                <div style={{ display: 'flex', gap: '8px' }}>
                  {c.status === 'draft' && (
                    <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => setShowLaunchModal(c)}>
                      <Play size={13} /> Launch
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', flex: c.status !== 'draft' ? 1 : 0 }}>
                    <Eye size={13} /> View
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create New Campaign</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Campaign Name *</label>
                <input className="input" placeholder="e.g. Summer Sale 2026" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email Subject Line *</label>
                <input className="input" placeholder="e.g. Exclusive offer just for you 🎉" value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })} required />
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Sender Name *</label>
                  <input className="input" placeholder="Your Company" value={form.from_name}
                    onChange={e => setForm({ ...form, from_name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Sender Email *</label>
                  <input className="input" type="email" placeholder="hello@yourcompany.com" value={form.from_email}
                    onChange={e => setForm({ ...form, from_email: e.target.value })} required />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Email Template</label>
                <select className="input" value={form.template_id}
                  onChange={e => setForm({ ...form, template_id: e.target.value })}>
                  <option value="">Select a template</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Contact List</label>
                <select className="input" value={form.list_id}
                  onChange={e => setForm({ ...form, list_id: e.target.value })}>
                  <option value="">Select a contact list</option>
                  {contactLists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.total_contacts || 0} contacts)</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" /> : <><Plus size={16} /> Create Campaign</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Launch confirmation modal */}
      {showLaunchModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowLaunchModal(null)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: 'rgba(108,99,255,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                border: '1px solid rgba(108,99,255,0.3)'
              }}>
                <Send size={28} color="var(--accent)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '22px', marginBottom: '10px' }}>
                Launch Campaign?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>
                You're about to launch <strong style={{ color: 'var(--text-primary)' }}>{showLaunchModal.name}</strong>
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '28px' }}>
                This will start sending emails to all contacts in the selected list. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button className="btn btn-secondary" onClick={() => setShowLaunchModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleLaunch(showLaunchModal)} disabled={launching}>
                  {launching ? <div className="spinner" /> : <><Play size={15} /> Yes, Launch!</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
