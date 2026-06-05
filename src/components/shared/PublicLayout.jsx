import { Link, useLocation } from 'react-router-dom'
import { Zap, CheckCircle } from 'lucide-react'
import SiteFooter from './SiteFooter'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Contact', to: '/contact' },
]

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff', color: '#0f0f1a', fontFamily: 'var(--font-body)', '--text-primary': '#0f0f1a', '--text-secondary': '#555', '--text-muted': '#888' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #00c896, #6c63ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(108,99,255,0.25)',
            }}>
              <Zap size={15} color="#fff" fill="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: '#0f0f1a' }}>
              MailRax
            </span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navLinks.map(({ label, to }) => (
              <Link key={to} to={to} style={{
                fontSize: '13px', fontWeight: pathname === to ? 600 : 400,
                color: pathname === to ? '#0f0f1a' : '#888',
                textDecoration: 'none', padding: '6px 12px', borderRadius: '7px',
                background: pathname === to ? 'rgba(0,0,0,0.05)' : 'transparent',
              }}>
                {label}
              </Link>
            ))}
            <Link to="/login" style={{
              marginLeft: '8px', fontSize: '13px', fontWeight: 700,
              color: '#fff', textDecoration: 'none',
              padding: '7px 16px', borderRadius: '8px',
              background: 'linear-gradient(135deg, #00c896, #6c63ff)',
              boxShadow: '0 3px 10px rgba(108,99,255,0.3)',
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '56px 24px 80px', width: '100%' }}>
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}
