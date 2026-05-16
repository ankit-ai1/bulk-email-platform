import { useState, useEffect, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Upload, Users, Plus, Trash2, X, FileSpreadsheet, Search, ChevronDown, ChevronRight, Edit2, Mail, Check } from 'lucide-react'
import { format } from 'date-fns'

export default function ContactsPage() {
  const { user, loading: authLoading } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [showAddContactModal, setShowAddContactModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showEditContactModal, setShowEditContactModal] = useState(false)
  const [expandedList, setExpandedList] = useState(null)
  const [listContacts, setListContacts] = useState({})
  const [search, setSearch] = useState('')
  const [listSearch, setListSearch] = useState('')
  const [form, setForm] = useState({ name: '' })
  const [contactForm, setContactForm] = useState({ name: '', email: '' })
  const [uploading, setUploading] = useState(false)
  const [parsedContacts, setParsedContacts] = useState([])
  const [fileName, setFileName] = useState('')
  const [currentList, setCurrentList] = useState(null)
  const [editingContact, setEditingContact] = useState(null)
  const fileRef = useRef()
  const importFileRef = useRef()

  useEffect(() => { if (user) loadLists() }, [user])

  async function loadLists() {
    setLoading(true)
    const { data } = await supabase.from('contact_lists').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    setLists(data || [])
    setLoading(false)
  }

  async function loadContacts(listId) {
    if (listContacts[listId]) return
    const { data } = await supabase.from('contacts').select('*').eq('list_id', listId).order('created_at', { ascending: false })
    setListContacts(prev => ({ ...prev, [listId]: data || [] }))
  }

  // Force refresh contacts (bypass cache)
  async function refreshContacts(listId) {
    const { data } = await supabase.from('contacts').select('*').eq('list_id', listId).order('created_at', { ascending: false })
    setListContacts(prev => ({ ...prev, [listId]: data || [] }))
  }

  // Search contacts within expanded list
  const filteredListContacts = useMemo(() => {
    if (!expandedList || !listContacts[expandedList]) return []
    if (!listSearch.trim()) return listContacts[expandedList]
    return listContacts[expandedList].filter(c =>
      c.email.toLowerCase().includes(listSearch.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(listSearch.toLowerCase()))
    )
  }, [expandedList, listContacts, listSearch])

  // Parse file for bulk upload
  function handleImportFileChange(e) {
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
        toast.success(`Parsed ${contacts.length} contacts from CSV`)
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Please upload CSV or Excel files only')
    }
  }

  // Create new contact list with bulk import
  async function handleCreateList(e) {
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

      const batchSize = 500
      for (let i = 0; i < parsedContacts.length; i += batchSize) {
        const batch = parsedContacts.slice(i, i + batchSize).map(c => ({
          ...c, list_id: list.id, user_id: user.id, status: 'active'
        }))
        const { error } = await supabase.from('contacts').insert(batch)
        if (error) throw error
      }

      toast.success(`List created with ${parsedContacts.length} contacts!`)
      setShowCreateListModal(false)
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

  // Add single contact
  async function handleAddContact(e) {
    e.preventDefault()
    if (!contactForm.email) {
      toast.error('Email is required')
      return
    }

    setUploading(true)
    try {
      // Check if email already exists in this list
      const { data: existing } = await supabase.from('contacts').select('id').eq('list_id', currentList.id).eq('email', contactForm.email.toLowerCase())
      if (existing && existing.length > 0) {
        toast.error('This email already exists in the list')
        setUploading(false)
        return
      }

      const { error } = await supabase.from('contacts').insert({
        name: contactForm.name,
        email: contactForm.email.toLowerCase(),
        list_id: currentList.id,
        user_id: user.id,
        status: 'active'
      })

      if (error) throw error

      // Update total_contacts
      await supabase.from('contact_lists').update({
        total_contacts: (currentList.total_contacts || 0) + 1
      }).eq('id', currentList.id)

      toast.success('Contact added!')
      setShowAddContactModal(false)
      setContactForm({ name: '', email: '' })
      
      loadLists() // Refresh list stats
      await refreshContacts(currentList.id) // Force refresh contacts
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Import more contacts to existing list
  async function handleImportContacts(e) {
    e.preventDefault()
    if (!parsedContacts.length) {
      toast.error('Please upload a file with contacts first')
      return
    }

    setUploading(true)
    try {
      const { data: existingContacts } = await supabase.from('contacts').select('email').eq('list_id', currentList.id)
      const existingEmails = new Set(existingContacts?.map(c => c.email.toLowerCase()) || [])

      const newContacts = parsedContacts.filter(c => !existingEmails.has(c.email.toLowerCase()))
      
      if (newContacts.length === 0) {
        toast.error('All contacts already exist in this list')
        setUploading(false)
        return
      }

      const batchSize = 500
      for (let i = 0; i < newContacts.length; i += batchSize) {
        const batch = newContacts.slice(i, i + batchSize).map(c => ({
          name: c.name,
          email: c.email.toLowerCase(),
          list_id: currentList.id,
          user_id: user.id,
          status: 'active'
        }))
        const { error } = await supabase.from('contacts').insert(batch)
        if (error) throw error
      }

      // Update total_contacts
      const skipped = parsedContacts.length - newContacts.length
      await supabase.from('contact_lists').update({
        total_contacts: (currentList.total_contacts || 0) + newContacts.length
      }).eq('id', currentList.id)

      toast.success(`Added ${newContacts.length} contacts${skipped > 0 ? ` (${skipped} duplicates skipped)` : ''}!`)
      setShowImportModal(false)
      setParsedContacts([])
      setFileName('')

      loadLists() // Refresh list stats
      await refreshContacts(currentList.id) // Force refresh contacts
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Edit contact
  async function handleEditContact(e) {
    e.preventDefault()
    if (!contactForm.email) {
      toast.error('Email is required')
      return
    }

    setUploading(true)
    try {
      // Check if new email already exists (but allow same email)
      if (contactForm.email !== editingContact.email) {
        const { data: existing } = await supabase.from('contacts').select('id').eq('list_id', editingContact.list_id).eq('email', contactForm.email.toLowerCase())
        if (existing && existing.length > 0) {
          toast.error('This email already exists in the list')
          setUploading(false)
          return
        }
      }

      const { error } = await supabase.from('contacts').update({
        name: contactForm.name,
        email: contactForm.email.toLowerCase()
      }).eq('id', editingContact.id)

      if (error) throw error

      toast.success('Contact updated!')
      setShowEditContactModal(false)
      setContactForm({ name: '', email: '' })
      setEditingContact(null)

      await refreshContacts(editingContact.list_id)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Delete single contact
  async function handleDeleteContact(contactId, listId, totalContacts) {
    if (!confirm('Delete this contact?')) return

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId)
      if (error) throw error

      // Update total_contacts
      await supabase.from('contact_lists').update({
        total_contacts: Math.max(0, (totalContacts || 1) - 1)
      }).eq('id', listId)

      toast.success('Contact deleted')
      loadLists() // Refresh list stats
      await refreshContacts(listId) // Force refresh contacts
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Toggle contact status
  async function handleToggleStatus(contactId, listId, currentStatus) {
    try {
      const newStatus = currentStatus === 'active' ? 'unsubscribed' : 'active'
      const { error } = await supabase.from('contacts').update({ status: newStatus }).eq('id', contactId)
      if (error) throw error

      toast.success(`Contact ${newStatus === 'active' ? 'activated' : 'unsubscribed'}`)
      await refreshContacts(listId) // Force refresh to get latest data
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Delete list
  async function handleDeleteList(id) {
    if (!confirm('Delete this contact list and all its contacts?')) return
    try {
      await supabase.from('contacts').delete().eq('list_id', id)
      const { error } = await supabase.from('contact_lists').delete().eq('id', id)
      if (error) throw error
      toast.success('List deleted')
      loadLists()
    } catch (err) {
      toast.error(err.message)
    }
  }

  // Download sample template
  function downloadSampleTemplate() {
    const sampleData = [
      { name: 'Your Name', email: 'ankitraj0061@gmail.com' },
      { name: 'John Smith', email: 'john.smith@yourcompany.com' },
      { name: 'Jane Doe', email: 'jane.doe@yourcompany.com' },
      { name: 'Michael Johnson', email: 'michael.j@yourcompany.com' },
      { name: 'Sarah Williams', email: 'sarah.w@yourcompany.com' }
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    ws['!cols'] = [{ wch: 20 }, { wch: 30 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contacts')
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
        <button className="btn btn-primary" onClick={() => setShowCreateListModal(true)}>
          <Plus size={16} /> New List
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '360px' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Search lists..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '40px' }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Users size={28} /></div>
            <p className="empty-title">No contact lists yet</p>
            <p className="empty-desc">Upload your first CSV or Excel file to create a contact list</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateListModal(true)}><Plus size={14} /> Create List</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(list => (
            <div key={list.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => {
                if (expandedList === list.id) setExpandedList(null)
                else { setExpandedList(list.id); loadContacts(list.id); setListSearch('') }
              }}>
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
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); handleDeleteList(list.id) }}>
                    <Trash2 size={13} />
                  </button>
                  {expandedList === list.id ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                </div>
              </div>

              {expandedList === list.id && (
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  <div style={{ padding: '16px 24px', background: 'var(--bg-elevated)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setCurrentList(list); setShowAddContactModal(true); setContactForm({ name: '', email: '' }) }}>
                      <Plus size={13} /> Add Contact
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentList(list); setShowImportModal(true); setParsedContacts([]); setFileName('') }}>
                      <Upload size={13} /> Import More
                    </button>
                  </div>

                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" placeholder="Search by name or email..." value={listSearch} onChange={e => setListSearch(e.target.value)} style={{ paddingLeft: '36px', height: '36px' }} />
                  </div>

                  {listContacts[list.id] ? (
                    <div className="table-container" style={{ border: 'none', borderRadius: 0, maxHeight: '400px', overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
                            <th>#</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredListContacts.length > 0 ? filteredListContacts.slice(0, 50).map((c, i) => (
                            <tr key={c.id}>
                              <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                              <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name || '—'}</td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{c.email}</td>
                              <td>
                                <button className="btn btn-sm" onClick={() => handleToggleStatus(c.id, list.id, c.status)} style={{
                                  background: c.status === 'active' ? 'rgba(67,233,123,0.15)' : 'rgba(192,192,192,0.15)',
                                  color: c.status === 'active' ? '#43e97b' : 'var(--text-secondary)',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 500,
                                  fontSize: '11px',
                                  padding: '4px 10px'
                                }}>
                                  {c.status === 'active' ? <Check size={12} style={{ display: 'inline', marginRight: '4px' }} /> : null}
                                  {c.status}
                                </button>
                              </td>
                              <td style={{ display: 'flex', gap: '6px' }}>
                                <button className="btn btn-sm" onClick={() => { setEditingContact(c); setContactForm({ name: c.name, email: c.email }); setShowEditContactModal(true) }} style={{
                                  background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px'
                                }}>
                                  <Edit2 size={12} />
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContact(c.id, list.id, list.total_contacts)} style={{ padding: '4px 8px' }}>
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                                No contacts match your search
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {filteredListContacts.length > 50 && (
                        <div style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                          Showing 50 of {filteredListContacts.length} contacts
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

      {/* Create List Modal */}
      {showCreateListModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCreateListModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Create Contact List</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateListModal(false)} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateList} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">List Name *</label>
                <input className="input" placeholder="e.g. Newsletter Subscribers" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="input-group">
                <label className="input-label">Upload File (CSV or Excel) *</label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <button type="button" onClick={downloadSampleTemplate} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileSpreadsheet size={14} /> Download Sample Template
                  </button>
                </div>
                <div onClick={() => fileRef.current?.click()} style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: parsedContacts.length ? 'rgba(67,233,123,0.05)' : 'var(--bg-elevated)',
                  borderColor: parsedContacts.length ? 'rgba(67,233,123,0.4)' : 'var(--border)',
                }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; handleImportFileChange({ target: { files: e.dataTransfer.files } }) }}>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFileChange} style={{ display: 'none' }} />
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateListModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !form.name || !parsedContacts.length}>
                  {uploading ? <><div className="spinner" /> Uploading...</> : <><Upload size={15} /> Create List</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Contact Modal */}
      {showAddContactModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddContactModal(false)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Contact</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddContactModal(false)} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Name</label>
                <input className="input" placeholder="John Doe" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Email *</label>
                <input className="input" type="email" placeholder="john@example.com" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddContactModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !contactForm.email}>
                  {uploading ? <div className="spinner" /> : <Plus size={15} />} Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditContactModal(false)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Edit Contact</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEditContactModal(false)} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleEditContact} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group">
                <label className="input-label">Name</label>
                <input className="input" placeholder="John Doe" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Email *</label>
                <input className="input" type="email" placeholder="john@example.com" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} required />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditContactModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !contactForm.email}>
                  {uploading ? <div className="spinner" /> : <Check size={15} />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import More Contacts Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Import More Contacts</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)} style={{ padding: '6px' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleImportContacts} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label className="input-label">Upload CSV or Excel File *</label>
                <div onClick={() => importFileRef.current?.click()} style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '32px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: parsedContacts.length ? 'rgba(67,233,123,0.05)' : 'var(--bg-elevated)',
                  borderColor: parsedContacts.length ? 'rgba(67,233,123,0.4)' : 'var(--border)',
                }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); importFileRef.current.files = e.dataTransfer.files; handleImportFileChange({ target: { files: e.dataTransfer.files } }) }}>
                  <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFileChange} style={{ display: 'none' }} />
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
                      <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Duplicates will be automatically skipped</p>
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploading || !parsedContacts.length}>
                  {uploading ? <><div className="spinner" /> Importing...</> : <><Upload size={15} /> Import Contacts</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
