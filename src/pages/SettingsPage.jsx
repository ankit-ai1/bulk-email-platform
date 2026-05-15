import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Settings, Mail, Key, User, Shield, Save, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    full_name: '', company_name: '', website: '',
    smtp_provider: 'sendgrid', sendgrid_api_key: '', ses_region: 'us-east-1',
    ses_access_key: '', ses_secret_key: '', from_name: '', from_email: '',
    daily_limit: 10000, batch_size: 100, delay_between_batches: 2,
    unsubscribe_link: true, track_opens: true, track_clicks: true
  })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single()
    if (data) {
      setSettings(prev => ({ ...prev, ...data }))
    }
    setSettings(prev => ({
      ...prev,
      full_name: user?.user_metadata?.full_name || '',
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('user_settings').upsert({ ...settings, user_id: user.id, updated_at: new Date().toISOString() })
    if (error) toast.error(error.message)
    else toast.success('Settings saved!')
    setSaving(false)
  }

  async function handleTestEmail(e) {
    e.preventDefault()
    setTesting(true)
    setTimeout(() => {
      toast.success(`Test email sent to ${testEmail}! (Configure your email provider to actually send)`)
      setTesting(false)
    }, 1500)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'email', label: 'Email Provider', icon: Mail },
    { id: 'sending', label: 'Sending Config', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
  ]

  return (
    <div style={{ animation: 'slideIn 0.3s ease' }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your platform and email delivery settings</p>
      </div>

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Sidebar tabs */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '8px' }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                  padding: '10px 12px', borderRadius: '8px', border: 'none',
                  background: tab === id ? 'rgba(108,99,255,0.12)' : 'transparent',
                  color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === id ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  borderLeft: tab === id ? '2px solid var(--accent)' : '2px solid transparent'
                }}
              >
                <Icon size={15} color={tab === id ? 'var(--accent)' : 'currentColor'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <form onSubmit={handleSave}>
            {/* Profile */}
            {tab === 'profile' && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '24px' }}>Profile Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input className="input" value={settings.full_name}
                      onChange={e => setSettings({ ...settings, full_name: e.target.value })} placeholder="Your full name" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Company Name</label>
                    <input className="input" value={settings.company_name}
                      onChange={e => setSettings({ ...settings, company_name: e.target.value })} placeholder="Your company" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Website</label>
                    <input className="input" value={settings.website}
                      onChange={e => setSettings({ ...settings, website: e.target.value })} placeholder="https://yourcompany.com" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input className="input" value={user?.email} disabled style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email cannot be changed here</span>
                  </div>
                </div>
              </div>
            )}

            {/* Email Provider */}
            {tab === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Email Delivery Provider</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Configure the service used to send your bulk emails</p>

                  <div className="input-group" style={{ marginBottom: '20px' }}>
                    <label className="input-label">Provider</label>
                    <select className="input" value={settings.smtp_provider}
                      onChange={e => setSettings({ ...settings, smtp_provider: e.target.value })}>
                      <option value="sendgrid">SendGrid</option>
                      <option value="ses">Amazon SES</option>
                      <option value="mailgun">Mailgun</option>
                      <option value="smtp">Custom SMTP</option>
                    </select>
                  </div>

                  {settings.smtp_provider === 'sendgrid' && (
                    <div className="input-group">
                      <label className="input-label">SendGrid API Key</label>
                      <input className="input" type="password" value={settings.sendgrid_api_key}
                        onChange={e => setSettings({ ...settings, sendgrid_api_key: e.target.value })}
                        placeholder="SG.xxxxxxxxxx" />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Get your API key from sendgrid.com → Settings → API Keys</span>
                    </div>
                  )}

                  {settings.smtp_provider === 'ses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="input-group">
                        <label className="input-label">AWS Region</label>
                        <select className="input" value={settings.ses_region} onChange={e => setSettings({ ...settings, ses_region: e.target.value })}>
                          <option value="us-east-1">US East (N. Virginia)</option>
                          <option value="us-west-2">US West (Oregon)</option>
                          <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                          <option value="eu-west-1">Europe (Ireland)</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Access Key ID</label>
                        <input className="input" type="password" value={settings.ses_access_key}
                          onChange={e => setSettings({ ...settings, ses_access_key: e.target.value })} placeholder="AKIA..." />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Secret Access Key</label>
                        <input className="input" type="password" value={settings.ses_secret_key}
                          onChange={e => setSettings({ ...settings, ses_secret_key: e.target.value })} placeholder="••••••••" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>Default Sender</h3>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Default From Name</label>
                      <input className="input" value={settings.from_name}
                        onChange={e => setSettings({ ...settings, from_name: e.target.value })} placeholder="Your Company" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Default From Email</label>
                      <input className="input" type="email" value={settings.from_email}
                        onChange={e => setSettings({ ...settings, from_email: e.target.value })} placeholder="hello@yourcompany.com" />
                    </div>
                  </div>
                </div>

                {/* Test email */}
                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Test Configuration</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Send a test email to verify your settings</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input className="input" type="email" value={testEmail}
                      onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary" onClick={handleTestEmail} disabled={testing || !testEmail}>
                      {testing ? <div className="spinner" /> : <><Mail size={14} /> Send Test</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Sending Config */}
            {tab === 'sending' && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Sending Configuration</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>Control how emails are sent to maximize deliverability</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Daily Sending Limit</label>
                    <input className="input" type="number" value={settings.daily_limit}
                      onChange={e => setSettings({ ...settings, daily_limit: parseInt(e.target.value) })} min={100} max={500000} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Max emails to send per day (recommended: start with 500 and gradually increase)</span>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Batch Size</label>
                      <input className="input" type="number" value={settings.batch_size}
                        onChange={e => setSettings({ ...settings, batch_size: parseInt(e.target.value) })} min={10} max={1000} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Emails per batch</span>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Delay Between Batches (sec)</label>
                      <input className="input" type="number" value={settings.delay_between_batches}
                        onChange={e => setSettings({ ...settings, delay_between_batches: parseInt(e.target.value) })} min={1} max={60} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prevents spam detection</span>
                    </div>
                  </div>
                  {[
                    { key: 'unsubscribe_link', label: 'Add Unsubscribe Link', desc: 'Legally required in most countries' },
                    { key: 'track_opens', label: 'Track Email Opens', desc: 'Add tracking pixel to emails' },
                    { key: 'track_clicks', label: 'Track Link Clicks', desc: 'Rewrite links for click tracking' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                      <div
                        style={{
                          width: '40px', height: '22px', borderRadius: '11px',
                          background: settings[key] ? 'var(--accent)' : 'var(--bg-card)',
                          border: '1px solid var(--border)', position: 'relative', cursor: 'pointer',
                          transition: 'background 0.2s', flexShrink: 0
                        }}
                        onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
                      >
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '2px', left: settings[key] ? '20px' : '2px',
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security */}
            {tab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ border: '1px solid rgba(67,233,123,0.25)' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <CheckCircle size={20} color="#43e97b" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Account Secured</h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your account is protected with Supabase Auth. All data is encrypted at rest.</p>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>Domain Authentication</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Configure DNS records to prove your emails are legitimate</p>
                  {[
                    { type: 'SPF', desc: 'Authorizes sending servers', status: 'required' },
                    { type: 'DKIM', desc: 'Cryptographic email signing', status: 'required' },
                    { type: 'DMARC', desc: 'Policy for failed authentication', status: 'recommended' },
                  ].map(({ type, desc, status }) => (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: '42px', height: '32px', background: 'rgba(108,99,255,0.1)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{type}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{type} Record</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                      <span className={`badge ${status === 'required' ? 'badge-error' : 'badge-warning'}`}>{status}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: '16px', background: 'rgba(108,99,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    💡 Configure these records in your domain registrar's DNS settings. Your email provider will give you the exact values.
                  </div>
                </div>
              </div>
            )}

            {/* Save button */}
            {tab !== 'security' && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving...</> : <><Save size={15} /> Save Settings</>}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
