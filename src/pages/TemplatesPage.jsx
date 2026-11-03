import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { api } from '../lib/api'
import EmailCheck from '../components/EmailCheck'
import EmailBuilder, { renderBlocks } from '../components/EmailBuilder'
import toast from 'react-hot-toast'
import { Plus, FileText, Trash2, X, Eye, Pencil, Code, Search } from 'lucide-react'
import { format } from 'date-fns'

export default function TemplatesPage() {
  const { user, loading: authLoading, hasFeature, organization } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTemplate, setEditTemplate] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', body: '', is_html: false })
  const [blocks, setBlocks] = useState(null) // non-null while using the visual builder
  const [aiBrief, setAiBrief] = useState('')
  const [aiBusy, setAiBusy] = useState(false)

  async function draftWithAi() {
    setAiBusy(true)
    try {
      const r = await api('/api/ai/generate', { body: { kind: 'content', input: { brief: aiBrief, template_name: form.name } } })
      setBlocks(null)
      setForm(f => ({ ...f, subject: r.subject, body: r.html, is_html: true }))
      toast.success('Draft ready. Review it before saving.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAiBusy(false)
    }
  }

  useEffect(() => { if (user) loadTemplates() }, [user])

  async function loadTemplates() {
    setLoading(true)
    const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const row = blocks ? { ...form, body: renderBlocks(blocks, organization?.brand_color), is_html: true, builder_blocks: blocks } : { ...form, builder_blocks: null }
    try {
      if (editTemplate) {
        const { error } = await supabase.from('templates').update({ ...row, updated_at: new Date().toISOString() }).eq('id', editTemplate.id)
        if (error) throw error
        toast.success('Template updated!')
      } else {
        const { error } = await supabase.from('templates').insert({ ...row, user_id: user.id })
        if (error) throw error
        toast.success('Template created!')
      }
      resetModal()
      loadTemplates()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function openEdit(t) {
    setEditTemplate(t)
    setForm({ name: t.name, subject: t.subject || '', body: t.body || '', is_html: t.is_html || false })
    setBlocks(t.builder_blocks || null)
    setShowModal(true)
  }

  function resetModal() {
    setBlocks(null)
    setAiBrief('')
    setShowModal(false)
    setEditTemplate(null)
    setForm({ name: '', subject: '', body: '', is_html: false })
  }

  async function handleDelete(id) {
    if (!confirm('Delete this template?')) return
    const { error } = await supabase.from('templates').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Template deleted'); loadTemplates() }
  }

  const filtered = templates.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.subject?.toLowerCase().includes(search.toLowerCase())
  )

  const PLACEHOLDERS = ['{{name}}', '{{email}}', '{{company}}', '{{first_name}}']

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Email Templates</h1>
          <p className="page-subtitle">Create reusable templates with personalization placeholders</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Template
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Search templates..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
      </div>

      {/* Placeholder hint */}
      <div style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', borderRadius: 'var(--radius-md)', padding: '14px 18px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Available placeholders:</span>
        {PLACEHOLDERS.map(p => (
          <code key={p} style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontFamily: 'monospace' }}>{p}</code>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><FileText size={28} /></div>
            <p className="empty-title">{search ? 'No templates found' : 'No templates yet'}</p>
            <p className="empty-desc">Create reusable email templates with dynamic personalization</p>
            {!search && <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Plus size={14} /> Create Template</button>}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,159,67,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="#ff9f43" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || 'No subject'}</p>
                </div>
                {t.is_html && <span className="badge badge-info">HTML</span>}
              </div>

              <div style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                padding: '12px', fontSize: '12px', color: 'var(--text-secondary)',
                lineHeight: 1.5, maxHeight: '80px', overflow: 'hidden',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical'
              }}>
                {t.body ? t.body.replace(/<[^>]*>/g, '').substring(0, 150) + '...' : 'No content'}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {t.updated_at ? `Updated ${format(new Date(t.updated_at), 'MMM d, yyyy')}` : `Created ${format(new Date(t.created_at), 'MMM d, yyyy')}`}
              </div>

              <div className="divider" style={{ margin: 0 }} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setPreviewTemplate(t)}>
                  <Eye size={13} /> Preview
                </button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => openEdit(t)}>
                  <Pencil size={13} /> Edit
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && resetModal()}>
          <div className="modal" style={{ maxWidth: '700px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editTemplate ? 'Edit Template' : 'Create Template'}</h2>
              <button className="btn btn-ghost btn-sm" onClick={resetModal} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">Template Name *</label>
                  <input className="input" placeholder="e.g. Welcome Email" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Default Subject</label>
                  <input className="input" placeholder="e.g. Welcome, {{name}}!" value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{
                    width: '36px', height: '20px', borderRadius: '10px',
                    background: form.is_html ? 'var(--accent)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)', position: 'relative',
                    transition: 'background 0.2s', cursor: 'pointer'
                  }} onClick={() => setForm({ ...form, is_html: !form.is_html })}>
                    <div style={{
                      width: '14px', height: '14px', borderRadius: '50%', background: 'white',
                      position: 'absolute', top: '2px',
                      left: form.is_html ? '18px' : '2px',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                  <Code size={14} /> HTML Mode
                </label>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Use HTML for rich formatting</span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className={`btn btn-sm ${blocks ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setBlocks(b => (b ? null : []))}>
                  {blocks ? 'Switch to code editor' : 'Use drag-and-drop builder'}
                </button>
                {hasFeature('ai') && (
                  <>
                    <input className="input" style={{ flex: '1 1 220px', width: 'auto' }} aria-label="Describe the email" placeholder="Describe the email and let AI draft it" value={aiBrief} onChange={e => setAiBrief(e.target.value)} />
                    <button type="button" className="btn btn-secondary btn-sm" disabled={!aiBrief.trim() || aiBusy} onClick={draftWithAi}>{aiBusy ? 'Drafting…' : 'Draft with AI'}</button>
                  </>
                )}
              </div>

              {blocks ? <EmailBuilder blocks={blocks} onChange={setBlocks} brandColor={organization?.brand_color} /> : <div className="input-group">
                <label className="input-label">Email Body *</label>
                <textarea
                  className="input"
                  placeholder={form.is_html
                    ? '<h1>Hello {{name}},</h1>\n<p>Your email content here...</p>'
                    : 'Hello {{name}},\n\nYour email content here...\n\nBest regards,\nYour Team'
                  }
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  style={{ minHeight: '240px', fontFamily: form.is_html ? 'monospace' : 'var(--font-body)', fontSize: '13px' }}
                  required
                />
              </div>}

              <div style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                💡 Use placeholders: {PLACEHOLDERS.map(p => <code key={p} style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)', padding: '1px 5px', borderRadius: '3px', margin: '0 2px' }}>{p}</code>)} — they'll be replaced with real contact data when sending.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={resetModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <div className="spinner" /> : editTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreviewTemplate(null)}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{previewTemplate.name}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Subject: {previewTemplate.subject || 'No subject'}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewTemplate(null)} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
              padding: '24px', minHeight: '200px', border: '1px solid var(--border)',
              fontSize: '14px', lineHeight: 1.7, color: 'var(--text-secondary)'
            }}>
              <EmailCheck subject={previewTemplate.subject || ''} html={(previewTemplate.is_html ? previewTemplate.body : `<pre style="font-family:sans-serif;white-space:pre-wrap">${(previewTemplate.body || '').replace(/</g, '&lt;')}</pre>`)?.replace(/{{name}}/g, 'John').replace(/{{email}}/g, 'john@example.com').replace(/{{first_name}}/g, 'John')} />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>Preview shown with sample data</p>
          </div>
        </div>
      )}
    </div>
  )
}
