import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ArrowRight, ArrowLeft, Mail, Lock, User, Globe } from 'lucide-react'
import { LOGO_URL } from '../lib/logo'

const REMEMBER_KEY = 'mailrax_remembered_email'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '' })
  const [forgotSent, setForgotSent] = useState(false)
  const [signupEmail, setSignupEmail] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) { setForm(f => ({ ...f, email: saved })); setRememberMe(true) }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, form.email)
        else localStorage.removeItem(REMEMBER_KEY)
        toast.success('Welcome back!'); navigate('/')
      } else {
        const { error } = await signUp(form.email, form.password, form.fullName)
        if (error) throw error
        toast.success('Account created! Check your email to verify.')
        setSignupEmail(form.email); setForm({ email: '', password: '', fullName: '' })
      }
    } catch (err) { toast.error(err.message || 'Something went wrong') }
    finally { setLoading(false) }
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
      setForgotSent(true); toast.success('Password reset email sent!')
    } catch (err) { toast.error(err.message || 'Failed to send reset email') }
    finally { setLoading(false) }
  }

  function switchMode(m) { setMode(m); setForgotSent(false); setSignupEmail(null) }

  return (
    /* ── ROOT: side-by-side row ── */
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      minHeight: '100vh',
      width: '100%',
      overflow: 'hidden',
    }}>

      {/* ═══════════════════════════════════
          LEFT DARK PANEL  (45%)
      ═══════════════════════════════════ */}
      <div
        className="login-left-panel"
        style={{
          width: '45%',
          flexShrink: 0,
          minHeight: '100vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          background: '#140c06',
        }}
      >
        {/* warm radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 55% at 25% 35%, rgba(160,70,20,0.55) 0%, rgba(60,25,8,0.75) 55%, #0d0805 100%)',
        }} />
        {/* subtle grid dots */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        {/* TOP: tagline */}
        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: '13px', color: 'rgba(255,255,255,0.42)',
          fontFamily: 'var(--font-body)', letterSpacing: '0.01em',
        }}>
          Smarter bulk email — built for serious senders.
        </p>

        {/* MIDDLE: headline + features */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: 'clamp(42px, 4.8vw, 68px)',
            lineHeight: 1.06,
            color: '#fff',
            letterSpacing: '-0.025em',
            marginBottom: '36px',
          }}>
            Send smarter.<br />
            <span style={{ color: '#f97316' }}>Reach further.</span>
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '48px' }}>
            {[
              '2.4M+ emails delivered daily',
              'Real-time open & click analytics',
              'GDPR, CAN-SPAM & CASL compliant',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.38)',
                }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f97316' }} />
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.52)', fontFamily: 'var(--font-body)' }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM: stat card */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '20px 24px',
            maxWidth: '240px',
          }}>
            {/* live dot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-body)' }}>
                Campaign Live
              </span>
            </div>

            {/* mini bar chart */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '40px', marginBottom: '14px' }}>
              {[35, 55, 42, 70, 50, 85, 62, 90, 70, 88].map((h, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: '3px 3px 0 0',
                  background: i >= 7 ? 'linear-gradient(180deg, #f97316, #ef4444)' : 'rgba(255,255,255,0.14)',
                }} />
              ))}
            </div>

            {/* stat number */}
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '28px', color: '#fff', lineHeight: 1 }}>
              34.7%
            </div>
            <div style={{ fontSize: '12px', color: '#22c55e', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
              ↑ Open rate · this week
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════
          RIGHT WHITE PANEL  (55%)
      ═══════════════════════════════════ */}
      <div style={{
        flex: 1,
        minHeight: '100vh',
        background: '#ffffff',
        borderRadius: '32px 0 0 32px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Top bar: logo + CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '28px 52px 0',
        }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src={LOGO_URL} alt="MailRax" style={{ height: '32px', width: 'auto', objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: '#0f0f1a' }}>
              MailRax
            </span>
          </Link>

          {mode === 'login' && (
            <button onClick={() => switchMode('signup')} style={topLinkStyle}>
              <User size={14} /> Sign Up
            </button>
          )}
          {(mode === 'signup' || mode === 'forgot') && (
            <button onClick={() => switchMode('login')} style={topLinkStyle}>
              <ArrowLeft size={14} /> Sign In
            </button>
          )}
        </div>

        {/* Form area — vertically centered */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '40px 52px',
          maxWidth: '480px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}>

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <>
              <h2 style={headingStyle}>Reset password</h2>
              <p style={subStyle}>Enter your email and we'll send a reset link.</p>

              {forgotSent ? (
                <div style={{ textAlign: 'center', paddingTop: '24px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Mail size={26} color="#22c55e" />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: '#0f0f1a', marginBottom: '8px' }}>Check your inbox</h3>
                  <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '28px' }}>
                    Reset link sent to <strong style={{ color: '#374151' }}>{form.email}</strong>
                  </p>
                  <button onClick={() => switchMode('login')} style={ghostBtnStyle}>
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <PillInput type="email" placeholder="Email address" value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} icon={<Mail size={16} color="#9ca3af" />} required />
                  <ActionButton loading={loading} label="Send Reset Link" />
                  <button type="button" onClick={() => switchMode('login')} style={ghostBtnStyle}>
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>
                </form>
              )}
            </>
          )}

          {/* ── SIGNUP SUCCESS ── */}
          {signupEmail && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Mail size={26} color="#22c55e" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px', color: '#0f0f1a', marginBottom: '8px' }}>Check your inbox</h3>
              <p style={{ color: '#9ca3af', fontSize: '15px', marginBottom: '28px' }}>
                Verification link sent to <strong style={{ color: '#374151' }}>{signupEmail}</strong>
              </p>
              <button type="button" onClick={() => setSignupEmail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f97316', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-body)' }}>
                Already verified? Sign in →
              </button>
            </div>
          )}

          {/* ── LOGIN / SIGNUP ── */}
          {mode !== 'forgot' && !signupEmail && (
            <>
              <h2 style={headingStyle}>{mode === 'login' ? 'Sign In' : 'Create account'}</h2>
              <p style={subStyle}>
                {mode === 'login' ? 'Welcome back to your campaign dashboard' : 'Get started with MailRax today'}
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {mode === 'signup' && (
                  <PillInput type="text" placeholder="Full name" value={form.fullName || ''}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    icon={<User size={16} color="#9ca3af" />} required />
                )}

                <PillInput type="email" placeholder="Email or Username" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  icon={<Mail size={16} color="#9ca3af" />} required />

                {/* Password — toggle inside field */}
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <Lock size={16} color="#9ca3af" />
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Password"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    style={pillInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    {showPw ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>

                {/* Forgot password row */}
                {mode === 'login' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#6b7280', fontFamily: 'var(--font-body)' }}>
                      <div
                        onClick={() => setRememberMe(v => !v)}
                        style={{
                          width: '17px', height: '17px', borderRadius: '4px', flexShrink: 0,
                          border: `2px solid ${rememberMe ? '#f97316' : '#d1d5db'}`,
                          background: rememberMe ? '#f97316' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {rememberMe && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.2 5.8L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f97316', fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-body)', padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <ActionButton loading={loading} label={mode === 'login' ? 'Sign In' : 'Create Account'} />
              </form>
            </>
          )}
        </div>

        {/* Bottom footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 52px 28px',
        }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'var(--font-body)' }}>
            © {new Date().getFullYear()} MailRax Inc.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/contact" style={{ fontSize: '12px', color: '#9ca3af', textDecoration: 'none', fontFamily: 'var(--font-body)' }}>
              Contact Us
            </Link>
            <button style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#9ca3af', fontFamily: 'var(--font-body)', padding: 0 }}>
              <Globe size={13} /> English
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Shared sub-components ── */

function PillInput({ type, placeholder, value, onChange, icon, required }) {
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={{ ...pillInputStyle, paddingLeft: icon ? '50px' : '20px' }}
      />
    </div>
  )
}

function ActionButton({ loading, label }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        width: '100%',
        padding: '17px 24px',
        borderRadius: '100px',
        border: 'none',
        background: loading ? '#e5e7eb' : 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)',
        color: loading ? '#9ca3af' : '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '16px',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : '0 8px 28px rgba(249,115,22,0.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '8px',
        transition: 'opacity 0.2s',
      }}
    >
      {loading ? <div className="spinner" /> : <>{label} <ArrowRight size={17} /></>}
    </button>
  )
}

/* ── Shared style objects ── */

const pillInputStyle = {
  width: '100%',
  padding: '17px 50px 17px 50px',
  borderRadius: '100px',
  border: '1.5px solid #e5e7eb',
  fontSize: '15px',
  fontFamily: 'var(--font-body)',
  color: '#111827',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

const headingStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 800,
  fontSize: '34px',
  color: '#0f0f1a',
  marginBottom: '6px',
  lineHeight: 1.15,
}

const subStyle = {
  fontSize: '15px',
  color: '#9ca3af',
  marginBottom: '32px',
  fontFamily: 'var(--font-body)',
  lineHeight: 1.6,
}

const topLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  color: '#6b7280',
  fontFamily: 'var(--font-body)',
  padding: 0,
}

const ghostBtnStyle = {
  width: '100%',
  padding: '15px',
  borderRadius: '100px',
  border: '1.5px solid #e5e7eb',
  background: '#fff',
  color: '#6b7280',
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
}
