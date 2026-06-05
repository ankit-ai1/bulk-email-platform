import PublicLayout from '../components/shared/PublicLayout'
import { Mail, MessageSquare, Shield, Zap } from 'lucide-react'

const contacts = [
  {
    icon: Mail,
    title: 'General Enquiries',
    description: 'Questions about our platform, pricing, or features.',
    email: 'hello@mailforge.app',
  },
  {
    icon: MessageSquare,
    title: 'Support',
    description: 'Technical issues, account help, or billing questions.',
    email: 'support@mailforge.app',
  },
  {
    icon: Shield,
    title: 'Abuse & Compliance',
    description: 'Report spam, policy violations, or security issues.',
    email: 'abuse@mailforge.app',
  },
  {
    icon: Zap,
    title: 'Legal & Privacy',
    description: 'Data requests, legal notices, and privacy concerns.',
    email: 'legal@mailforge.app',
  },
]

export default function ContactPage() {
  return (
    <PublicLayout>
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>Contact Us</h1>
        <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '560px' }}>
          We're here to help. Reach out to the right team below and we'll get back to you as quickly as possible.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px', marginBottom: '48px' }}>
        {contacts.map(({ icon: Icon, title, description, email }) => (
          <div key={email} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} color="var(--accent)" />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>{description}</p>
              <a href={`mailto:${email}`} style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                {email}
              </a>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '28px',
      }}>
        <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Response Times</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { type: 'General enquiries', time: 'Within 2 business days' },
            { type: 'Support requests', time: 'Within 24 hours' },
            { type: 'Abuse reports', time: 'Within 12 hours' },
            { type: 'Legal & privacy', time: 'Within 5 business days' },
          ].map(({ type, time }) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{type}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  )
}
