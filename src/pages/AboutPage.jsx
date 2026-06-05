import PublicLayout from '../components/shared/PublicLayout'
import { Zap, Shield, BarChart2, Users } from 'lucide-react'

const values = [
  {
    icon: Zap,
    title: 'Speed & Reliability',
    description: 'Built for high-volume sending with robust infrastructure that delivers your campaigns on time, every time.',
  },
  {
    icon: Shield,
    title: 'Trust & Compliance',
    description: 'We take email compliance seriously. Our platform is built around best practices for CAN-SPAM, GDPR, and CASL.',
  },
  {
    icon: BarChart2,
    title: 'Data-Driven',
    description: 'Detailed logs and analytics give you full visibility into campaign performance and delivery outcomes.',
  },
  {
    icon: Users,
    title: 'User First',
    description: 'We build features our users actually need — a clean interface with no unnecessary complexity.',
  },
]

export default function AboutPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <div style={{ marginBottom: '56px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Zap size={28} color="white" fill="white" />
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>About MailForge</h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '560px', margin: '0 auto', lineHeight: '1.7' }}>
          MailForge is a bulk email platform built for businesses and developers who need reliable, scalable email delivery without the complexity.
        </p>
      </div>

      {/* Mission */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '32px', marginBottom: '48px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>Our Mission</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          Email is one of the most powerful channels for reaching your audience — but most platforms make it harder than it needs to be.
          MailForge exists to give businesses a straightforward, powerful tool to manage contacts, create templates,
          send campaigns, and track results — all from one clean interface.
          We believe responsible email sending is good for everyone, so we've built compliance and best practices into every part of our platform.
        </p>
      </div>

      {/* Values */}
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>What We Stand For</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px', marginBottom: '48px' }}>
        {values.map(({ icon: Icon, title, description }) => (
          <div key={title} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '24px',
            display: 'flex', gap: '16px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>{description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* What we offer */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '32px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>What MailForge Offers</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            'Campaign management with scheduling and real-time status tracking',
            'Contact list management with CSV import and segmentation',
            'Rich HTML email templates with live preview',
            'Multi-sender email verification for flexible sending identities',
            'Detailed delivery logs with open and failure tracking',
            'SendGrid-powered delivery infrastructure for high deliverability',
          ].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent-3)', marginTop: '2px', flexShrink: 0 }}>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
