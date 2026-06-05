import { Link, useLocation } from 'react-router-dom'
import SiteFooter from '../components/shared/SiteFooter'
import { Zap, Mail, HeadphonesIcon, Shield, Scale, ArrowRight, Clock, MessageSquare } from 'lucide-react'

const contacts = [
  { icon: Mail, title: 'General Enquiries', description: 'Questions about our platform, pricing, or features? We\'ll point you in the right direction.', email: 'hello@mailrax.app', color: '#00c896' },
  { icon: HeadphonesIcon, title: 'Technical Support', description: 'Having issues with your account, campaigns, or deliverability? We\'re here to help.', email: 'support@mailrax.app', color: '#6c63ff' },
  { icon: Shield, title: 'Abuse & Compliance', description: 'Report spam, policy violations, or suspicious activity originating from our platform.', email: 'abuse@mailrax.app', color: '#ef4444' },
  { icon: Scale, title: 'Legal & Privacy', description: 'Data requests, legal notices, GDPR requests, and privacy-related concerns.', email: 'legal@mailrax.app', color: '#f59e0b' },
]

const responseTimes = [
  { type: 'General enquiries', time: 'Within 2 business days' },
  { type: 'Technical support', time: 'Within 24 hours' },
  { type: 'Abuse reports', time: 'Within 12 hours' },
  { type: 'Legal & privacy', time: 'Within 5 business days' },
]

function Navbar() {
  const { pathname } = useLocation()
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: '64px',
      borderBottom: '1px solid rgba(0,0,0,0.07)',
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(108,99,255,0.25)' }}>
          <Zap size={15} color="#fff" fill="#fff" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: '#0f0f1a' }}>MailRax</span>
      </Link>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[['Home','/'],['About','/about'],['Pricing','/pricing'],['Contact','/contact']].map(([l,t]) => {
          const active = pathname === t
          return (
          <Link key={t} to={t} style={{ color: active ? '#0f0f1a' : '#888', textDecoration: 'none', fontSize: '14px', fontWeight: active ? 600 : 400, padding: '7px 14px', borderRadius: '8px', background: active ? 'rgba(0,0,0,0.05)' : 'transparent', transition: 'color 0.15s' }}>{l}</Link>
          )
        })}
        <Link to="/login" style={{ color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '9px 22px', borderRadius: '9px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', marginLeft: '8px', boxShadow: '0 4px 12px rgba(108,99,255,0.25)' }}>Sign In</Link>
      </div>
    </nav>
  )
}

export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f0f1a', fontFamily: 'var(--font-body)' }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: '80px 48px 64px', background: 'linear-gradient(160deg,#f3f0ff 0%,#fff 60%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '8%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,99,255,0.08),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px', fontSize: '11px', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.08em' }}>
            <MessageSquare size={12} /> GET IN TOUCH
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(32px,5vw,58px)', lineHeight: '1.1', maxWidth: '700px', marginBottom: '20px', letterSpacing: '-0.02em', color: '#0f0f1a' }}>
            We're here to{' '}
            <span style={{ background: 'linear-gradient(135deg,#6c63ff,#00c896)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              help you
            </span>
          </h1>
          <p style={{ fontSize: '16px', color: '#888', maxWidth: '540px', lineHeight: '1.8' }}>
            Reach out to the right team below and we'll get back to you as quickly as possible.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section style={{ padding: '0 48px 64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
          {contacts.map(({ icon: Icon, title, description, email, color }) => (
            <div key={email} style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.07)', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg,${color},transparent)` }} />
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${color}10`, border: `1px solid ${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f0f1a', marginBottom: '8px' }}>{title}</h3>
                <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.75', marginBottom: '16px' }}>{description}</p>
                <a href={`mailto:${email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color, textDecoration: 'none', fontWeight: 600 }}>
                  {email} <ArrowRight size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Response times */}
      <section style={{ padding: '0 48px 64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ background: '#f8f9fc', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '20px', padding: '40px 48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '40px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={18} color="#00c896" />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f0f1a' }}>Response Times</h2>
              </div>
              <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.75' }}>Our team responds to all enquiries as fast as possible. Abuse reports are always prioritized.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {responseTimes.map(({ type, time }, i) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', gap: '16px', borderBottom: i < responseTimes.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
                  <span style={{ fontSize: '13px', color: '#666' }}>{type}</span>
                  <span style={{ fontSize: '12px', color: '#00c896', fontWeight: 600, background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: '6px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '0 48px 80px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', background: 'linear-gradient(135deg,#f0f4ff,#f0fff8)', border: '1.5px solid rgba(0,200,150,0.15)', borderRadius: '16px', padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#0f0f1a', marginBottom: '8px' }}>Ready to get started?</h3>
            <p style={{ fontSize: '14px', color: '#888' }}>Browse our plans and apply for access in under 5 minutes.</p>
          </div>
          <Link to="/pricing" style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '12px 28px', borderRadius: '9px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(108,99,255,0.25)' }}>
            View Plans <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
