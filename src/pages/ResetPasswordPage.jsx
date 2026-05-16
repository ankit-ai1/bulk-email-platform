import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Zap, Eye, EyeOff, Lock, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    if (error) {
      toast.error(error.message)
    } else {
      setDone(true)
      toast.success('Password updated!')
      setTimeout(() => navigate('/'), 2000)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', animation: 'slideUp 0.3s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 0 40px rgba(108,99,255,0.4)',
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '26px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Set New Password
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Choose a strong password for your account</p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={48} color="#43e97b" style={{ margin: '0 auto 16px', display: 'block' }} />
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
                Password Updated!
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Redirecting you to the dashboard…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="input-group">
                <label className="input-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" type={showPw ? 'text' : 'password'}
                    placeholder="Min. 6 characters" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ paddingLeft: '40px', paddingRight: '44px' }} required minLength={6} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" type={showPw ? 'text' : 'password'}
                    placeholder="Repeat password" value={form.confirm}
                    onChange={e => setForm({ ...form, confirm: e.target.value })}
                    style={{ paddingLeft: '40px' }} required />
                </div>
                {form.confirm && form.password !== form.confirm && (
                  <span style={{ fontSize: '11px', color: '#ff6b6b' }}>Passwords do not match</span>
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-lg"
                disabled={loading || !form.password || form.password !== form.confirm}
                style={{ justifyContent: 'center', marginTop: '4px' }}>
                {loading ? <div className="spinner" /> : <><Lock size={15} /> Update Password</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
