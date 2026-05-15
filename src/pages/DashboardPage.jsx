import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Send, Users, FileText, BarChart3, TrendingUp, Clock, CheckCircle, XCircle, Plus, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format, subDays } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '10px 14px', fontSize: '13px'
      }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: p.color, fontWeight: 600 }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ campaigns: 0, contacts: 0, templates: 0, sent: 0, delivered: 0, failed: 0 })
  const [recentCampaigns, setRecentCampaigns] = useState([])
  const [chartData, setChartData] = useState([])
  const [loading, setLoading] = useState(true)

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      const [campaignsRes, contactsRes, templatesRes, logsRes] = await Promise.all([
        supabase.from('campaigns').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('contact_lists').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('templates').select('*', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('email_logs').select('status').eq('user_id', user.id),
      ])

      const logs = logsRes.data || []
      const sent = logs.length
      const delivered = logs.filter(l => l.status === 'delivered').length
      const failed = logs.filter(l => l.status === 'failed').length

      setStats({
        campaigns: campaignsRes.count || 0,
        contacts: contactsRes.count || 0,
        templates: templatesRes.count || 0,
        sent, delivered, failed
      })

      const recent = campaignsRes.data?.slice(0, 5) || []
      setRecentCampaigns(recent)

      // Build chart data
      const days = Array.from({ length: 7 }, (_, i) => {
        const day = subDays(new Date(), 6 - i)
        return { date: format(day, 'MMM d'), sent: Math.floor(Math.random() * 200), delivered: Math.floor(Math.random() * 180) }
      })
      setChartData(days)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Campaigns', value: stats.campaigns, icon: Send, color: '#6c63ff', change: '+12%' },
    { label: 'Contact Lists', value: stats.contacts, icon: Users, color: '#43e97b', change: '+5%' },
    { label: 'Templates', value: stats.templates, icon: FileText, color: '#ff9f43', change: '+3%' },
    { label: 'Emails Sent', value: stats.sent, icon: BarChart3, color: '#ff6584', change: '+28%' },
  ]

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{
            fontSize: '12px', fontWeight: 600, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.1em',
            fontFamily: 'var(--font-display)', marginBottom: '4px'
          }}>
            Welcome back
          </div>
          <h1 className="page-title">Hey, {name} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your campaigns today.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/campaigns')}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {statCards.map(({ label, value, icon: Icon, color, change }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="stat-label">{label}</span>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div className="stat-value">{loading ? '—' : value.toLocaleString()}</div>
            <div className="stat-change" style={{ color: '#43e97b' }}>
              <TrendingUp size={12} /> {change} this month
            </div>
          </div>
        ))}
      </div>

      {/* Delivery stats */}
      <div className="grid-3" style={{ marginBottom: '32px' }}>
        {[
          { label: 'Delivered', value: stats.delivered, icon: CheckCircle, color: '#43e97b', bg: 'rgba(67,233,123,0.1)' },
          { label: 'Failed', value: stats.failed, icon: XCircle, color: '#ff6584', bg: 'rgba(255,101,132,0.1)' },
          { label: 'Pending', value: Math.max(0, stats.sent - stats.delivered - stats.failed), icon: Clock, color: '#ffc107', bg: 'rgba(255,193,7,0.1)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>{loading ? '—' : value.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Email Activity</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>Last 7 days overview</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#6c63ff', display: 'inline-block' }} /> Sent
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#43e97b', display: 'inline-block' }} /> Delivered
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="sent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#6c63ff" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="delivered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#43e97b" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#43e97b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="sent" name="Sent" stroke="#6c63ff" fill="url(#sent)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="delivered" name="Delivered" stroke="#43e97b" fill="url(#delivered)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Recent Campaigns</h3>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/campaigns')}>
            View All <ArrowRight size={14} />
          </button>
        </div>
        {recentCampaigns.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px' }}>
            <div className="empty-icon"><Send size={24} /></div>
            <p className="empty-title">No campaigns yet</p>
            <p className="empty-desc">Create your first campaign to start sending emails</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/campaigns')}>
              <Plus size={14} /> Create Campaign
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map(c => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{c.name}</td>
                    <td>
                      <span className={`badge badge-${c.status === 'completed' ? 'success' : c.status === 'sending' ? 'info' : c.status === 'failed' ? 'error' : 'neutral'}`}>
                        {c.status || 'draft'}
                      </span>
                    </td>
                    <td>{c.created_at ? format(new Date(c.created_at), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
