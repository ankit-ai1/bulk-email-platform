import { Link, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'

const footerLinks = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms of Service', to: '/terms-of-service' },
  { label: 'Anti-Spam Policy', to: '/anti-spam-policy' },
  { label: 'Acceptable Use', to: '/acceptable-use-policy' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'About', to: '/about' },
]

export default function PublicLayout({ children }) {
  const { pathname } = useLocation()

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={16} color="white" fill="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)' }}>
              MailForge
            </span>
          </Link>
          <Link to="/login" style={{
            fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500,
            padding: '6px 16px', border: '1px solid var(--accent)', borderRadius: '6px',
          }}>
            Sign In
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: '900px', margin: '0 auto', padding: '48px 24px', width: '100%' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '32px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px', marginBottom: '20px' }}>
            {footerLinks.map(link => (
              <Link key={link.to} to={link.to} style={{
                fontSize: '13px', textDecoration: 'none',
                color: pathname === link.to ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
                {link.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} MailForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
