import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, Users, Plus, Trash2, X, FileSpreadsheet, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export default function ContactsPage() {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [expandedList, setExpandedList] = useState(null)
  const [listContacts, setListContacts] = useState({})
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '' })
  const [uploading, setUploading] = useState(false)
  const [parsedContacts, setParsedContacts] = useState([])
  const [fileName, setFileName] = useState('')
  const fileRef = useRef()

  useEffect(() => { loadLists() }, [])

  async function loadLists() {
    setLoading(true)
    const { data } = await supabase.from('contact_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setLists(data || [])
    setLoading(false)
  }

  async function loadContacts(listId) {
    if (listContacts[listId]) return
    const { data } = await supabase.from('contacts').select('*').eq('list_id', listId).limit(50)
    setListContacts(prev => ({ ...prev, [listId]: data || [] }))
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)

    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data }) => {
          const contacts = data.map(r => ({
            name: r.name || r.Name || r.NAME || '',
            email: r.email || r.Email || r.EMAIL || ''
          })).filter(c => c.email)
          setParsedContacts(contacts)
          toast.success(`Parsed ${contacts.length} contacts from CSV`)
        }
      })
    } else if (['xlsx', 'xls'].includes(ext)) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(ws)
        const contacts = data.map(r => ({
          name: r.name || r.Name || r.NAME || '',
          email: r.email || r.Email || r.EMAIL || ''
        })).filter(c => c.email)
        setParsedContacts(contacts)
        toast.success(`Parsed ${contacts.length} contacts from Excel`)
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Please upload CSV or Excel files only')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!parsedContacts.length) {
      toast.error('Please upload a file with contacts first')
      return
    }
    setUploading(true)
    try {
      const { data: list, error: listError } = await supabase.from('contact_lists').insert({
        name: form.name, user_id: user.id, total_contacts: parsedContacts.length
      }).select().single()

      if (listError) throw listError

      // Insert contacts in batches of 500
      const batchSize = 500
      for (let i = 0; i < parsedContacts.length; i += batchSize) {
        const batch = parsedContacts.slice(i, i + batchSize).map(c => ({
          ...c, list_id: list.id, user_id: user.id, status: 'active'
        }))
        const { error } = await supabase.from('contacts').insert(batch)
        if (error) throw error
      }

      toast.success(`List created with ${parsedContacts.length} contacts!`)
      setShowModal(false)
      setForm({ name: '' })
      setParsedContacts([])
      setFileName('')
      loadLists()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this contact list and all its contacts?')) return
    await supabase.from('contacts').delete().eq('list_id', id)
    const { error } = await supabase.from('contact_lists').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('List deleted'); loadLists() }
  }

  function downloadSampleTemplate() {
    // Create sample data
    const sampleData = [
      { name: 'John Smith', email: 'john.smith@example.com' },
      { name: 'Jane Doe', email: 'jane.doe@example.com' },
      { name: 'Michael Johnson', email: 'michael.j@example.com' },
      { name: 'Sarah Williams', email: 'sarah.w@example.com' },
      { name: 'David Brown', email: 'david.brown@example.com' }
    ]

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(sampleData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // name column
      { wch: 30 }  // email column
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')

    // Download
    XLSX.writeFile(wb, 'sample_contacts_template.xlsx')
    toast.success('Sample template downloaded!')
  }

  const filtered = lists.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Contact Lists</h1>
          <p className="page-subtitle">Upload and manage your recipient contact lists</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New List
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Search lists..." value={search}
          onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Users size={28} /></div>
            <p className="empty-title">No contact lists yet</p>
            <p className="empty-desc">Upload your first CSV or Excel file to create a contact list</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Plus size={14} /> Create List</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(list => (
            <div key={list.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div
                style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }}
                onClick={() => {
                  if (expandedList === list.id) setExpandedList(null)
                  else { setExpandedList(list.id); loadContacts(list.id) }
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={20} color="var(--accent)" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '2px' }}>{list.name}</h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>{(list.total_contacts || 0).toLocaleString()} contacts</span>
                    <span>Created {format(new Date(list.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge badge-success">Active</span>
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDelete(list.id) }}>
                    <Trash2 size={13} />
                  </button>
                  {expandedList === list.id ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                </div>
              </div>

              {expandedList === list.id && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {listContacts[list.id] ? (
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listContacts[list.id].slice(0, 10).map((c, i) => (
                            <tr key={c.id}>
                              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name || '—'}</td>
                              <td>{c.email}</td>
                              <td><span className={`badge badge-${c.status === 'active' ? 'success' : 'neutral'}`}>{c.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {list.total_contacts > 10 && (
                        <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                          Showing 10 of {list.total_contacts.toLocaleString()} contacts
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
                      <div className="spinner" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Contact List</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">List Name *</label>
                <input className="input" placeholder="e.g. Newsletter Subscribers" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>

              <div className="input-group">
                <label className="input-label">Upload File (CSV or Excel) *</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FileSpreadsheet size={14} />
                    Download Sample Template
                  </button>
                </div>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '32px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: parsedContacts.length ? 'rgba(67,233,123,0.05)' : 'var(--bg-elevated)',
                    borderColor: parsedContacts.length ? 'rgba(67,233,123,0.4)' : 'var(--border)',
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleFileChange({ target: { files: e.dataTransfer.files } }) }}
                >
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
                  {parsedContacts.length ? (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(67,233,123,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <FileSpreadsheet size={24} color="#43e97b" />
                      </div>
                      <p style={{ color: '#43e97b', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{parsedContacts.length} contacts parsed</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{fileName}</p>
                    </>
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid var(--border)' }}>
                        <Upload size={22} color="var(--text-muted)" />
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '4px' }}>Drop your file here or click to browse</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Supports CSV and Excel (.xlsx, .xls)</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '8px' }}>File must have <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: '3px' }}>email</code> and optionally <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: '3px' }}>name</code> columns</p>
                    </>
                  )}
                </div>
              </div>

              {parsedContacts.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Preview:</strong> {parsedContacts.slice(0, 3).map(c => c.email).join(', ')}{parsedContacts.length > 3 ? ` +${parsedContacts.length - 3} more` : ''}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading}>
                  {uploading ? <><div className="spinner" /> Uploading...</> : <><Upload size={15} /> Create List</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
