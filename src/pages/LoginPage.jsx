import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Zap, Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react'

const REMEMBER_KEY = 'mailforge_remembered_email'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  // mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [forgotSent, setForgotSent] = useState(false)
  const [signupEmail, setSignupEmail] = useState(null)

  // Pre-fill remembered email on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setForm(f => ({ ...f, email: saved }))
      setRememberMe(true)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error

        if (rememberMe) {
          localStorage.setItem(REMEMBER_KEY, form.email)
        } else {
          localStorage.removeItem(REMEMBER_KEY)
        }

        toast.success('Welcome back!')
        navigate('/')
      } else {
        const { error } = await signUp(form.email, form.password, form.fullName)
        if (error) throw error
        toast.success('Account created! Check your email to verify.')
        setSignupEmail(form.email)
        setForm({ email: '', password: '', fullName: '' })
      }
    } catch (err) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    if (!form.email) { toast.error('Enter your email address'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setForgotSent(true)
      toast.success('Password reset email sent!')
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(m) {
    setMode(m)
    setForgotSent(false)
    setSignupEmail(null)
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
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,101,132,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', animation: 'slideUp 0.3s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6c63ff 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 0 40px rgba(108,99,255,0.4)',
          }}>
            <Zap size={28} color="white" />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: 'var(--text-primary)', marginBottom: '6px' }}>
            MailForge
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {mode === 'login' && 'Sign in to your campaign platform'}
            {mode === 'signup' && 'Create your account to get started'}
            {mode === 'forgot' && 'Reset your account password'}
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>

          {/* ── EMAIL VERIFICATION NOTICE ── */}
          {signupEmail && (
            <div style={{
              background: 'rgba(67,233,123,0.1)',
              border: '1px solid rgba(67,233,123,0.3)',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}>
              <Mail size={20} color="#43e97b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px', margin: '0 0 4px 0' }}>
                  Verify your email
                </h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                  We sent a verification link to <strong>{signupEmail}</strong>. Click the link to verify your account.
                </p>
                <button
                  type="button"
                  onClick={() => setSignupEmail(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    padding: '6px 0',
                    marginTop: '8px',
                    fontWeight: '600',
                  }}
                >
                  Already verified? Sign in
                </button>
              </div>
            </div>
          )}

          {/* ── LOGIN / SIGNUP TOGGLE ── */}
          {mode !== 'forgot' && !signupEmail && (
            <div style={{
              display: 'flex', background: 'var(--bg-elevated)',
              borderRadius: '10px', padding: '4px', marginBottom: '28px',
              border: '1px solid var(--border)',
            }}>
              {['login', 'signup'].map(m => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  flex: 1, padding: '8px', borderRadius: '7px', border: 'none',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? 'white' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-display)', fontWeight: 600,
                  fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s ease',
                }}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              {forgotSent ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: 'rgba(67,233,123,0.15)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <Mail size={24} color="#43e97b" />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '17px', marginBottom: '8px' }}>
                    Check your inbox
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    We sent a password reset link to <strong>{form.email}</strong>. It expires in 1 hour.
                  </p>
                  <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => switchMode('login')}>
                    <ArrowLeft size={15} /> Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', background: 'rgba(108,99,255,0.08)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid rgba(108,99,255,0.2)',
                    fontSize: '13px', color: 'var(--text-secondary)',
                  }}>
                    <KeyRound size={15} color="var(--accent)" />
                    Enter your email and we'll send you a reset link
                  </div>

                  <div className="input-group">
                    <label className="input-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input className="input" type="email" placeholder="you@company.com"
                        value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                        style={{ paddingLeft: '40px' }} required />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary btn-lg"
                    disabled={loading} style={{ justifyContent: 'center' }}>
                    {loading ? <div className="spinner" /> : <><Mail size={15} /> Send Reset Link</>}
                  </button>

                  <button type="button" className="btn btn-ghost"
                    style={{ justifyContent: 'center', fontSize: '13px' }}
                    onClick={() => switchMode('login')}>
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── LOGIN / SIGNUP FORM ── */}
          {mode !== 'forgot' && !signupEmail && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'signup' && (
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input className="input" type="text" placeholder="John Doe"
                      value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
                      style={{ paddingLeft: '40px' }} required />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" type="email" placeholder="you@company.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    style={{ paddingLeft: '40px' }} required />
                </div>
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => switchMode('forgot')} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-body)',
                      padding: 0,
                    }}>
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" type={showPw ? 'text' : 'password'}
                    placeholder="••••••••" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    style={{ paddingLeft: '40px', paddingRight: '44px' }} required minLength={6} />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 0,
                  }}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me — only on login */}
              {mode === 'login' && (
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)',
                }}>
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    style={{
                      width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                      border: `2px solid ${rememberMe ? 'var(--accent)' : 'var(--border)'}`,
                      background: rememberMe ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s', cursor: 'pointer',
                    }}
                  >
                    {rememberMe && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  Remember me
                </label>
              )}

              <button type="submit" className="btn btn-primary btn-lg"
                disabled={loading} style={{ marginTop: '8px', justifyContent: 'center' }}>
                {loading ? <div className="spinner" /> : (
                  <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={16} /></>
                )}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Bulk Email Campaign Platform · Secure & Private
        </p>
      </div>
    </div>
  )
}
