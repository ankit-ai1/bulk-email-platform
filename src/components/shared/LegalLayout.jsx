import SiteNavbar from './SiteNavbar'
import SiteFooter from './SiteFooter'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function Section({ title, children }) {
  const num = title.match(/^(\d+)\./)
  const label = num ? num[1] : null
  const rest = label ? title.replace(/^\d+\.\s*/, '') : title

  return (
    <section style={{ marginBottom: '40px', paddingBottom: '40px', borderBottom: '1px solid #f0f0f5' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
        {label && (
          <span style={{
            minWidth: '30px', height: '30px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#00c896,#6c63ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 800, color: '#fff', flexShrink: 0, marginTop: '2px',
          }}>{label}</span>
        )}
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f0f1a', lineHeight: '1.4' }}>{rest}</h2>
      </div>
      <div style={{ paddingLeft: label ? '44px' : '0', fontSize: '14.5px', color: '#555', lineHeight: '1.85', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </section>
  )
}

export default function LegalLayout({ title, subtitle, badge, accentColor = '#6c63ff', date, children }) {
  const bg = accentColor === '#00c896'
    ? 'linear-gradient(160deg,#f0fff8 0%,#fff 60%)'
    : accentColor === '#ef4444'
    ? 'linear-gradient(160deg,#fff5f5 0%,#fff 60%)'
    : accentColor === '#f59e0b'
    ? 'linear-gradient(160deg,#fffbeb 0%,#fff 60%)'
    : 'linear-gradient(160deg,#f3f0ff 0%,#fff 60%)'

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)', color: '#0f0f1a', '--text-primary': '#0f0f1a', '--text-secondary': '#555', '--text-muted': '#888', '--accent': accentColor }}>
      <SiteNavbar />

      {/* Hero */}
      <section className="pub-pad" style={{ paddingTop: '60px', paddingBottom: '52px', background: bg, borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', right: '-40px', width: '320px', height: '320px', borderRadius: '50%', background: `radial-gradient(circle,${accentColor}12,transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888', textDecoration: 'none', marginBottom: '24px', fontWeight: 500 }}>
            <ArrowLeft size={13} /> Back to home
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: `${accentColor}12`, border: `1px solid ${accentColor}30`, borderRadius: '20px', padding: '5px 14px', marginBottom: '18px', fontSize: '11px', fontWeight: 700, color: accentColor, letterSpacing: '0.08em', display: 'block', width: 'fit-content' }}>
            {badge}
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px,4vw,44px)', color: '#0f0f1a', marginBottom: '14px', letterSpacing: '-0.01em', lineHeight: '1.15' }}>
            {title}
          </h1>
          <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.75', maxWidth: '580px', marginBottom: '20px' }}>{subtitle}</p>
          <p style={{ fontSize: '12px', color: '#aaa', fontWeight: 500 }}>Last updated: {date}</p>
        </div>
      </section>

      {/* Content */}
      <main className="pub-pad" style={{ paddingTop: '56px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
