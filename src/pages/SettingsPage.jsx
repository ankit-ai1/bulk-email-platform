import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Settings, Mail, User, Shield, Save, CheckCircle, Eye, EyeOff, Lock, RefreshCw, Plus, Trash2, Clock, AtSign } from 'lucide-react'

const WORKER_URL = '/api'

// Debug: log the URL being used
if (typeof window !== 'undefined') {
  console.log('SettingsPage - WORKER_URL:', WORKER_URL)
}

export default function SettingsPage() {
  const { user } = useAuth()

  const [settings, setSettings] = useState({
    full_name: '', company_name: '', website: '',
    smtp_provider: 'sendgrid', sendgrid_api_key: '', ses_region: 'us-east-1',
    ses_access_key: '', ses_secret_key: '', from_name: '', from_email: '',
    daily_limit: 10000, batch_size: 100, delay_between_batches: 2,
    unsubscribe_link: true, track_opens: true, track_clicks: true,
  })
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('profile')

  // Test email
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState(null) // 'success' | 'error'

  // Password change
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [sendingReset, setSendingReset] = useState(false)

  // Show/hide API key
  const [showApiKey, setShowApiKey] = useState(false)

  // Sender emails
  const [senderEmails, setSenderEmails] = useState([])
  const [senderForm, setSenderForm] = useState({ name: '', email: '' })
  const [addingSender, setAddingSender] = useState(false)
  const [otpVisible, setOtpVisible] = useState({}) // { [id]: true/false }
  const [otpValues, setOtpValues] = useState({})   // { [id]: '123456' }
  const [verifyingOtp, setVerifyingOtp] = useState(null) // id being verified
  const [deletingSender, setDeletingSender] = useState(null)

  useEffect(() => { if (user) { loadSettings(); loadSenderEmails() } }, [user])

  async function loadSenderEmails() {
    const { data } = await supabase
      .from('sender_emails')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setSenderEmails(data || [])
  }

  async function handleAddSenderEmail(e) {
    e.preventDefault()
    if (!senderForm.name.trim() || !senderForm.email.trim()) return
    if (senderEmails.length >= 20) { toast.error('Maximum 20 sender emails allowed'); return }
    const emailAdded = senderForm.email.trim()
    setAddingSender(true)
    try {
      const res = await fetch(`${WORKER_URL}/send-verification-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAdded, name: senderForm.name.trim(), userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
      toast.success(`Verification code sent to ${emailAdded}`)
      setSenderForm({ name: '', email: '' })
      // Reload and auto-show OTP input for the new email
      const { data: updated } = await supabase
        .from('sender_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      setSenderEmails(updated || [])
      const fresh = (updated || []).find(s => s.email === emailAdded)
      if (fresh) setOtpVisible(v => ({ ...v, [fresh.id]: true }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingSender(false)
    }
  }

  async function handleResendOtp(se) {
    setAddingSender(true)
    try {
      const res = await fetch(`${WORKER_URL}/send-verification-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: se.email, name: se.name, userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`New code sent to ${se.email}`)
      setOtpValues(v => ({ ...v, [se.id]: '' }))
      setOtpVisible(v => ({ ...v, [se.id]: true }))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAddingSender(false)
    }
  }

  async function handleVerifyOtp(se) {
    const otp = (otpValues[se.id] || '').trim()
    if (otp.length !== 6) { toast.error('Enter the 6-digit code'); return }
    setVerifyingOtp(se.id)
    try {
      const res = await fetch(`${WORKER_URL}/verify-sender-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: se.email, userId: user.id, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      toast.success(`${se.email} verified!`)
      setOtpVisible(v => ({ ...v, [se.id]: false }))
      setOtpValues(v => ({ ...v, [se.id]: '' }))
      loadSenderEmails()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setVerifyingOtp(null)
    }
  }

  async function handleDeleteSender(id) {
    if (!confirm('Remove this sender email?')) return
    setDeletingSender(id)
    const { error } = await supabase.from('sender_emails').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Removed'); loadSenderEmails() }
    setDeletingSender(null)
  }

  async function loadSettings() {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      setSettings(prev => ({ ...prev, ...data }))
    } else {
      // First time — seed full_name from auth metadata
      setSettings(prev => ({
        ...prev,
        full_name: user?.user_metadata?.full_name || '',
      }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('user_settings')
      .upsert({ ...settings, user_id: user.id, updated_at: new Date().toISOString() })

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    // Sync full_name back to Supabase auth metadata
    if (tab === 'profile') {
      await supabase.auth.updateUser({ data: { full_name: settings.full_name } })
    }

    toast.success('Settings saved!')
    setSaving(false)
  }

  async function handleTestEmail(e) {
    e.preventDefault()
    if (!testEmail) return
    setTesting(true)
    setTestStatus(null)
    try {
      const res = await fetch(`${WORKER_URL}/test-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          fromEmail: settings.from_email,
          fromName: settings.from_name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setTestStatus('success')
      toast.success(`Test email sent to ${testEmail}! Check your inbox.`)
    } catch (err) {
      setTestStatus('error')
      toast.error(`Test failed: ${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  async function handleSendResetEmail() {
    setSendingReset(true)
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) toast.error(error.message)
    else toast.success(`Password reset link sent to ${user.email}`)
    setSendingReset(false)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setChangingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword })
    if (error) toast.error(error.message)
    else {
      toast.success('Password updated successfully!')
      setPasswords({ newPassword: '', confirmPassword: '' })
    }
    setChangingPassword(false)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'email', label: 'Email Provider', icon: Mail },
    { id: 'senders', label: 'Sender Emails', icon: AtSign },
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
        {/* Sidebar */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          <div className="card" style={{ padding: '8px' }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '10px 12px', borderRadius: '8px', border: 'none',
                background: tab === id ? 'rgba(108,99,255,0.12)' : 'transparent',
                color: tab === id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === id ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                borderLeft: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
              }}>
                <Icon size={15} color={tab === id ? 'var(--accent)' : 'currentColor'} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: '300px' }}>

          {/* ── PROFILE ── */}
          {tab === 'profile' && (
            <form onSubmit={handleSave}>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '24px' }}>Profile Information</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Full Name</label>
                    <input className="input" value={settings.full_name}
                      onChange={e => setSettings({ ...settings, full_name: e.target.value })}
                      placeholder="Your full name" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Company Name</label>
                    <input className="input" value={settings.company_name}
                      onChange={e => setSettings({ ...settings, company_name: e.target.value })}
                      placeholder="Your company" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Website</label>
                    <input className="input" value={settings.website}
                      onChange={e => setSettings({ ...settings, website: e.target.value })}
                      placeholder="https://yourcompany.com" />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <input className="input" value={user?.email} disabled style={{ opacity: 0.6 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Email cannot be changed here</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving...</> : <><Save size={15} /> Save Profile</>}
                </button>
              </div>
            </form>
          )}

          {/* ── EMAIL PROVIDER ── */}
          {tab === 'email' && (
            <form onSubmit={handleSave}>
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
                      <div style={{ position: 'relative' }}>
                        <input
                          className="input"
                          type={showApiKey ? 'text' : 'password'}
                          value={settings.sendgrid_api_key}
                          onChange={e => setSettings({ ...settings, sendgrid_api_key: e.target.value })}
                          placeholder="SG.xxxxxxxxxx"
                          style={{ paddingRight: '44px' }}
                        />
                        <button type="button" onClick={() => setShowApiKey(v => !v)} style={{
                          position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                        }}>
                          {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Get your API key from sendgrid.com → Settings → API Keys
                      </span>
                    </div>
                  )}

                  {settings.smtp_provider === 'ses' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div className="input-group">
                        <label className="input-label">AWS Region</label>
                        <select className="input" value={settings.ses_region}
                          onChange={e => setSettings({ ...settings, ses_region: e.target.value })}>
                          <option value="us-east-1">US East (N. Virginia)</option>
                          <option value="us-west-2">US West (Oregon)</option>
                          <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                          <option value="eu-west-1">Europe (Ireland)</option>
                        </select>
                      </div>
                      <div className="input-group">
                        <label className="input-label">Access Key ID</label>
                        <input className="input" type="password" value={settings.ses_access_key}
                          onChange={e => setSettings({ ...settings, ses_access_key: e.target.value })}
                          placeholder="AKIA..." />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Secret Access Key</label>
                        <input className="input" type="password" value={settings.ses_secret_key}
                          onChange={e => setSettings({ ...settings, ses_secret_key: e.target.value })}
                          placeholder="••••••••" />
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
                        onChange={e => setSettings({ ...settings, from_name: e.target.value })}
                        placeholder="Your Company" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Default From Email</label>
                      <input className="input" type="email" value={settings.from_email}
                        onChange={e => setSettings({ ...settings, from_email: e.target.value })}
                        placeholder="hello@yourcompany.com" />
                    </div>
                  </div>
                </div>

                {/* Test Configuration */}
                <div className="card">
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '6px' }}>Test Configuration</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Send a real test email using your current settings (worker must be running)
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input className="input" type="email" value={testEmail}
                      onChange={e => { setTestEmail(e.target.value); setTestStatus(null) }}
                      placeholder="test@example.com" style={{ flex: 1 }} />
                    <button type="button" className="btn btn-secondary"
                      onClick={handleTestEmail} disabled={testing || !testEmail}>
                      {testing ? <div className="spinner" /> : <><Mail size={14} /> Send Test</>}
                    </button>
                  </div>
                  {testStatus === 'success' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', fontSize: '13px', color: '#43e97b' }}>
                      <CheckCircle size={15} /> Test email delivered — check your inbox
                    </div>
                  )}
                  {testStatus === 'error' && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Make sure the worker is running: <code style={{ color: 'var(--accent)' }}>pm2 start email-worker</code>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving...</> : <><Save size={15} /> Save Provider Settings</>}
                </button>
              </div>
            </form>
          )}

          {/* ── SENDER EMAILS ── */}
          {tab === 'senders' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Sender Email Accounts</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Add up to 20 verified sender emails. Each email receives a verification code before it can be used in campaigns.
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {senderEmails.length}/20 accounts added &nbsp;·&nbsp; {senderEmails.filter(s => s.is_verified).length} verified
                  </span>
                </p>

                {senderEmails.length < 20 && (
                  <form onSubmit={handleAddSenderEmail} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <input
                      className="input"
                      placeholder="Sender Name"
                      value={senderForm.name}
                      onChange={e => setSenderForm(f => ({ ...f, name: e.target.value }))}
                      style={{ flex: '1 1 160px' }}
                      required
                    />
                    <input
                      className="input"
                      type="email"
                      placeholder="email@domain.com"
                      value={senderForm.email}
                      onChange={e => setSenderForm(f => ({ ...f, email: e.target.value }))}
                      style={{ flex: '2 1 220px' }}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={addingSender} style={{ flexShrink: 0 }}>
                      {addingSender ? <div className="spinner" /> : <><Plus size={14} /> Add & Verify</>}
                    </button>
                  </form>
                )}

                {senderEmails.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No sender emails added yet. Add one above to get started.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {senderEmails.map(se => (
                    <div key={se.id} style={{
                      padding: '14px 16px', borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${se.is_verified ? 'rgba(67,233,123,0.3)' : 'var(--border)'}`,
                      background: se.is_verified ? 'rgba(67,233,123,0.04)' : 'var(--bg-elevated)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{se.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{se.email}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {se.is_verified ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#43e97b', fontWeight: 600 }}>
                              <CheckCircle size={13} /> Verified
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)' }}>
                              <Clock size={13} /> Pending
                            </span>
                          )}
                          {!se.is_verified && (
                            <button className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '4px 10px' }}
                              onClick={() => setOtpVisible(v => ({ ...v, [se.id]: !v[se.id] }))}>
                              {otpVisible[se.id] ? 'Hide' : 'Enter Code'}
                            </button>
                          )}
                          <button className="btn btn-danger btn-sm" style={{ padding: '5px 8px' }}
                            disabled={deletingSender === se.id}
                            onClick={() => handleDeleteSender(se.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {!se.is_verified && otpVisible[se.id] && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <input
                            className="input"
                            placeholder="6-digit code"
                            maxLength={6}
                            value={otpValues[se.id] || ''}
                            onChange={e => setOtpValues(v => ({ ...v, [se.id]: e.target.value.replace(/\D/g, '') }))}
                            style={{ width: '140px', letterSpacing: '4px', fontWeight: 700, fontSize: '16px', textAlign: 'center' }}
                          />
                          <button className="btn btn-primary btn-sm"
                            disabled={verifyingOtp === se.id || (otpValues[se.id] || '').length !== 6}
                            onClick={() => handleVerifyOtp(se)}>
                            {verifyingOtp === se.id ? <div className="spinner" /> : 'Verify'}
                          </button>
                          <button className="btn btn-secondary btn-sm" disabled={addingSender}
                            onClick={() => handleResendOtp(se)}>
                            Resend Code
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SENDING CONFIG ── */}
          {tab === 'sending' && (
            <form onSubmit={handleSave}>
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Sending Configuration</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                  Control how emails are sent to maximize deliverability
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Daily Sending Limit</label>
                    <input className="input" type="number" value={settings.daily_limit}
                      onChange={e => setSettings({ ...settings, daily_limit: parseInt(e.target.value) })}
                      min={100} max={500000} />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Max emails per day — start with 500 and gradually increase
                    </span>
                  </div>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="input-label">Batch Size</label>
                      <input className="input" type="number" value={settings.batch_size}
                        onChange={e => setSettings({ ...settings, batch_size: parseInt(e.target.value) })}
                        min={10} max={1000} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Emails per batch</span>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Delay Between Batches (sec)</label>
                      <input className="input" type="number" value={settings.delay_between_batches}
                        onChange={e => setSettings({ ...settings, delay_between_batches: parseInt(e.target.value) })}
                        min={1} max={60} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prevents spam detection</span>
                    </div>
                  </div>

                  {[
                    { key: 'unsubscribe_link', label: 'Add Unsubscribe Link', desc: 'Legally required in most countries (CAN-SPAM, GDPR)' },
                    { key: 'track_opens', label: 'Track Email Opens', desc: 'Add tracking pixel to HTML emails' },
                    { key: 'track_clicks', label: 'Track Link Clicks', desc: 'Rewrite links for click tracking' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{desc}</div>
                      </div>
                      <div
                        onClick={() => setSettings({ ...settings, [key]: !settings[key] })}
                        style={{
                          width: '40px', height: '22px', borderRadius: '11px',
                          background: settings[key] ? 'var(--accent)' : 'var(--bg-card)',
                          border: '1px solid var(--border)', position: 'relative',
                          cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                        }}
                      >
                        <div style={{
                          width: '16px', height: '16px', borderRadius: '50%', background: 'white',
                          position: 'absolute', top: '2px', left: settings[key] ? '20px' : '2px',
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <><div className="spinner" /> Saving...</> : <><Save size={15} /> Save Config</>}
                </button>
              </div>
            </form>
          )}

          {/* ── SECURITY ── */}
          {tab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card" style={{ border: '1px solid rgba(67,233,123,0.25)' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <CheckCircle size={20} color="#43e97b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>Account Secured</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Protected with Supabase Auth. All data is encrypted at rest.
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Signed in as <strong>{user?.email}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Reset via email */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <RefreshCw size={16} color="var(--accent)" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Reset Password via Email</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Send a reset link to <strong>{user?.email}</strong>. Use this if you've forgotten your current password.
                </p>
                <button className="btn btn-secondary" onClick={handleSendResetEmail} disabled={sendingReset}>
                  {sendingReset ? <><div className="spinner" /> Sending...</> : <><RefreshCw size={14} /> Send Reset Link</>}
                </button>
              </div>

              {/* Change Password */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <Lock size={16} color="var(--accent)" />
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>Change Password</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Update your account password
                </p>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="input-group">
                    <label className="input-label">New Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        type={showPwd ? 'text' : 'password'}
                        value={passwords.newPassword}
                        onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                        style={{ paddingRight: '44px' }}
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                      }}>
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Confirm New Password</label>
                    <input
                      className="input"
                      type={showPwd ? 'text' : 'password'}
                      value={passwords.confirmPassword}
                      onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      required
                    />
                    {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                      <span style={{ fontSize: '11px', color: '#ff6b6b' }}>Passwords do not match</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary"
                      disabled={changingPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}>
                      {changingPassword ? <><div className="spinner" /> Updating...</> : <><Save size={15} /> Update Password</>}
                    </button>
                  </div>
                </form>
              </div>

              {/* Domain Authentication info */}
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>Domain Authentication</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Configure DNS records to prove your emails are legitimate and improve deliverability
                </p>
                {[
                  { type: 'SPF', desc: 'Authorizes sending servers', status: 'required' },
                  { type: 'DKIM', desc: 'Cryptographic email signing', status: 'required' },
                  { type: 'DMARC', desc: 'Policy for failed authentication', status: 'recommended' },
                ].map(({ type, desc, status }) => (
                  <div key={type} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '12px 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: '42px', height: '32px', background: 'rgba(108,99,255,0.1)',
                      borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>{type}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{type} Record</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
                    </div>
                    <span className={`badge ${status === 'required' ? 'badge-error' : 'badge-warning'}`}>{status}</span>
                  </div>
                ))}
                <div style={{
                  marginTop: '16px', background: 'rgba(108,99,255,0.08)',
                  borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                  fontSize: '12px', color: 'var(--text-secondary)',
                }}>
                  Configure these records in your domain registrar's DNS settings. Your email provider (SendGrid) will give you the exact values under Settings → Sender Authentication → Domain Authentication.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
