import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, Menu, X } from 'lucide-react'

const navLinks = [
  ['Home', '/'],
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Contact', '/contact'],
]

export default function SiteNavbar() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px', borderBottom: '1px solid rgba(0,0,0,0.07)',
        background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
      }} className="pub-nav">

        {/* Logo */}
        <Link to="/" onClick={() => setOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(108,99,255,0.25)' }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: '#0f0f1a' }}>MailRax</span>
        </Link>

        {/* Desktop links */}
        <div className="site-nav-desktop" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
          {navLinks.map(([l, t]) => {
            const active = pathname === t
            return (
              <Link key={t} to={t} style={{
                color: active ? '#0f0f1a' : '#666', textDecoration: 'none',
                fontSize: '14px', fontWeight: active ? 600 : 500,
                padding: '7px 13px', borderRadius: '8px',
                background: active ? 'rgba(0,0,0,0.05)' : 'transparent',
                transition: 'color 0.15s',
              }}>{l}</Link>
            )
          })}
          <Link to="/login" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '7px 13px' }}>Sign In</Link>
          <Link to="/pricing" style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '9px 20px', borderRadius: '9px', boxShadow: '0 4px 14px rgba(108,99,255,0.28)', marginLeft: '6px', whiteSpace: 'nowrap' }}>
            Apply for Access
          </Link>
        </div>

        {/* Hamburger (mobile only) */}
        <button
          className="site-nav-hamburger"
          onClick={() => setOpen(v => !v)}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#0f0f1a', borderRadius: '8px' }}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99,
          background: '#fff', paddingTop: '72px',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          <div style={{ padding: '8px 20px 32px', display: 'flex', flexDirection: 'column' }}>
            {navLinks.map(([l, t]) => (
              <Link key={t} to={t} onClick={() => setOpen(false)} style={{
                fontSize: '18px', fontWeight: 700, textDecoration: 'none',
                color: pathname === t ? '#6c63ff' : '#0f0f1a',
                padding: '16px 8px',
                borderBottom: '1px solid #f0f0f5',
              }}>{l}</Link>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} style={{
              fontSize: '18px', fontWeight: 700, textDecoration: 'none',
              color: '#0f0f1a', padding: '16px 8px', borderBottom: '1px solid #f0f0f5',
            }}>Sign In</Link>
            <Link to="/pricing" onClick={() => setOpen(false)} style={{
              marginTop: '24px', background: 'linear-gradient(135deg,#00c896,#6c63ff)',
              color: '#fff', textDecoration: 'none', fontSize: '16px', fontWeight: 700,
              padding: '15px 24px', borderRadius: '12px', textAlign: 'center',
              boxShadow: '0 6px 20px rgba(108,99,255,0.3)',
            }}>Apply for Access</Link>
          </div>
        </div>
      )}
    </>
  )
}
