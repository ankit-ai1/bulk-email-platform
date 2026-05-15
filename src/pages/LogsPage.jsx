import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { BarChart3, CheckCircle, XCircle, Clock, Search, Filter, Download } from 'lucide-react'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function LogsPage() {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [logsRes, campRes] = await Promise.all([
      supabase.from('email_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
      supabase.from('campaigns').select('id, name').eq('user_id', user.id),
    ])
    setLogs(logsRes.data || [])
    setCampaigns(campRes.data || [])
    setLoading(false)
  }

  const stats = {
    total: logs.length,
    delivered: logs.filter(l => l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pending: logs.filter(l => l.status === 'pending').length,
  }

  const pieData = [
    { name: 'Delivered', value: stats.delivered, color: '#43e97b' },
    { name: 'Failed', value: stats.failed, color: '#ff6584' },
    { name: 'Pending', value: stats.pending, color: '#ffc107' },
  ].filter(d => d.value > 0)

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.email?.toLowerCase().includes(search.toLowerCase()) || l.recipient_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchCampaign = campaignFilter === 'all' || l.campaign_id === campaignFilter
    return matchSearch && matchStatus && matchCampaign
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  function exportCSV() {
    const csv = [
      ['Email', 'Name', 'Campaign', 'Status', 'Sent At'].join(','),
      ...filtered.map(l => [l.email, l.recipient_name || '', campaigns.find(c => c.id === l.campaign_id)?.name || '', l.status, l.created_at].join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'email_logs.csv'; a.click()
  }

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Logs & Reports</h1>
          <p className="page-subtitle">Complete audit trail of all email sending activity</p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Total Sent', value: stats.total, color: '#6c63ff' },
          { label: 'Delivered', value: stats.delivered, color: '#43e97b' },
          { label: 'Failed', value: stats.failed, color: '#ff6584' },
          { label: 'Pending', value: stats.pending, color: '#ffc107' },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{loading ? '—' : value.toLocaleString()}</div>
            {stats.total > 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{((value / stats.total) * 100).toFixed(1)}%</div>}
          </div>
        ))}
      </div>

      {/* Chart + Filters row */}
      <div className="grid-2" style={{ marginBottom: '24px', alignItems: 'start' }}>
        {pieData.length > 0 && (
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Delivery Breakdown</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>Filter Logs</h3>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search by email or name..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }} style={{ paddingLeft: '36px' }} />
          </div>
          <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="all">All Statuses</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
            <option value="bounced">Bounced</option>
          </select>
          <select className="input" value={campaignFilter} onChange={e => { setCampaignFilter(e.target.value); setPage(1) }}>
            <option value="all">All Campaigns</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {filtered.length.toLocaleString()} of {logs.length.toLocaleString()} logs
          </p>
        </div>
      </div>

      {/* Logs table */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}><div className="spinner" style={{ width: '32px', height: '32px' }} /></div>
        ) : paginated.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><BarChart3 size={28} /></div>
            <p className="empty-title">No logs found</p>
            <p className="empty-desc">Logs will appear here once you launch campaigns</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Email</th>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Sent At</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(log => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{log.recipient_name || '—'}</td>
                    <td>{log.email}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{campaigns.find(c => c.id === log.campaign_id)?.name || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {log.status === 'delivered' ? <CheckCircle size={14} color="#43e97b" /> :
                         log.status === 'failed' ? <XCircle size={14} color="#ff6584" /> :
                         <Clock size={14} color="#ffc107" />}
                        <span className={`badge badge-${log.status === 'delivered' ? 'success' : log.status === 'failed' ? 'error' : 'warning'}`}>
                          {log.status}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {log.created_at ? format(new Date(log.created_at), 'MMM d, yyyy HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
