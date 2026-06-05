import { Link } from 'react-router-dom'
import SiteNavbar from '../components/shared/SiteNavbar'
import SiteFooter from '../components/shared/SiteFooter'
import { Zap, Shield, BarChart2, Users, CheckCircle, ArrowRight, Globe, Lock, Sparkles, Building2 } from 'lucide-react'

const values = [
  { icon: Shield, title: 'Compliance First', description: 'Every account goes through domain verification and anti-abuse review. We enforce strict opt-in requirements and complaint monitoring — responsible sending is non-negotiable.', color: '#00c896' },
  { icon: Globe, title: 'Your Domain, Your Reputation', description: 'Unlike shared-sender platforms, MailRax lets businesses send from their own verified domains — full control over sender reputation and brand identity.', color: '#6c63ff' },
  { icon: BarChart2, title: 'Full Visibility', description: 'Real-time delivery logs, campaign analytics, and failure tracking give you complete insight into every email sent. No black boxes — just clear data.', color: '#f59e0b' },
  { icon: Lock, title: 'Anti-Abuse Controls', description: 'Active monitoring of sending patterns, complaint rates, and bounce thresholds. Accounts that violate policies are suspended before impacting other senders.', color: '#ef4444' },
  { icon: Users, title: 'Built for Businesses', description: 'From early-stage startups to enterprises, MailRax scales with your needs. Manage multiple sender identities, contact lists, and campaigns in one place.', color: '#8b5cf6' },
  { icon: Zap, title: 'Reliable Infrastructure', description: 'Enterprise-grade email delivery with high-throughput sending capabilities and a 99.9% uptime SLA — so your campaigns go out on time, every time.', color: '#06b6d4' },
]

const capabilities = [
  'Transactional email delivery via verified business domains',
  'Permission-based bulk marketing campaign management',
  'Multi-sender identity management with domain verification',
  'Contact list management with CSV import and segmentation',
  'Rich HTML email templates with live personalization preview',
  'Real-time delivery logs and campaign performance analytics',
  'Automated bounce and complaint rate monitoring',
  'CAN-SPAM, GDPR, and CASL compliance enforcement',
]

const stats = [
  { value: '99.9%', label: 'Uptime SLA', color: '#00c896' },
  { value: 'Zero', label: 'Spam Tolerance', color: '#ef4444' },
  { value: '100%', label: 'Domain Verified', color: '#6c63ff' },
  { value: '< 2s', label: 'Avg. Latency', color: '#f59e0b' },
]

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f0f1a', fontFamily: 'var(--font-body)' }}>
      <SiteNavbar />

      {/* Hero */}
      <section className="pub-pad" style={{ paddingTop: '80px', paddingBottom: '64px', background: 'linear-gradient(160deg,#f0f4ff 0%,#fff8ff 50%,#f0fff8 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-60px', right: '10%', width: '320px', height: '320px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,99,255,0.1),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px', fontSize: '11px', fontWeight: 700, color: '#059669', letterSpacing: '0.08em' }}>
            <Building2 size={12} /> ABOUT MAILRAX
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(32px,5vw,58px)', lineHeight: '1.1', maxWidth: '800px', marginBottom: '22px', letterSpacing: '-0.02em', color: '#0f0f1a' }}>
            A SaaS Email Platform Built on{' '}
            <span style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Trust and Compliance
            </span>
          </h1>
          <p style={{ fontSize: '17px', color: '#666', lineHeight: '1.85', maxWidth: '680px', marginBottom: '36px' }}>
            MailRax enables businesses to send transactional and permission-based marketing emails using their own verified domains — with stricter compliance controls and anti-abuse enforcement built in from day one.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/pricing" style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '12px 28px', borderRadius: '9px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 20px rgba(108,99,255,0.25)' }}>
              Apply for Access <ArrowRight size={15} />
            </Link>
            <Link to="/contact" style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.1)', color: '#333', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '12px 28px', borderRadius: '9px' }}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="pub-pad" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px' }}>
          {stats.map(({ value, label, color }) => (
            <div key={label} style={{ background: '#f8f9fc', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '28px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '34px', fontWeight: 900, color, marginBottom: '6px' }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What sets us apart */}
      <section className="pub-pad" style={{ paddingBottom: '64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ background: 'linear-gradient(135deg,#f0f4ff,#f0fff8)', border: '1.5px solid rgba(0,200,150,0.15)', borderRadius: '20px', padding: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={20} color="#00c896" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,3vw,28px)', fontWeight: 800, color: '#0f0f1a' }}>What Sets MailRax Apart</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '58px' }}>
              {[
                'Most bulk email tools prioritize volume over responsibility. MailRax takes the opposite approach. Before any account can send, it must complete domain verification, agree to our anti-spam policies, and pass our onboarding compliance checks.',
                'This approach protects every sender on our platform. When bad actors can\'t get in, the reputation of our shared infrastructure stays strong — which directly benefits your deliverability.',
                'We believe responsible email sending is not a competitive disadvantage — it\'s a long-term business advantage. Businesses that send to engaged, opted-in audiences consistently outperform those that spray and pray.',
              ].map((text, i) => (
                <p key={i} style={{ fontSize: '15px', color: '#666', lineHeight: '1.85' }}>{text}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="pub-pad" style={{ paddingBottom: '64px', background: '#f8f9fc' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', paddingTop: '64px', paddingBottom: '64px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: '#0f0f1a', marginBottom: '10px' }}>Platform Capabilities</h2>
            <p style={{ fontSize: '15px', color: '#888', maxWidth: '480px', margin: '0 auto' }}>Everything your business needs to send email at scale — responsibly.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '10px' }}>
            {capabilities.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#fff', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                  <CheckCircle size={12} color="#00c896" />
                </div>
                <span style={{ fontSize: '13px', color: '#555', lineHeight: '1.65' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core principles */}
      <section className="pub-pad" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,34px)', fontWeight: 800, color: '#0f0f1a', marginBottom: '10px' }}>Our Core Principles</h2>
            <p style={{ fontSize: '15px', color: '#888', maxWidth: '480px', margin: '0 auto' }}>Not just values we list — built into how the platform works.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: '16px' }}>
            {values.map(({ icon: Icon, title, description, color }) => (
              <div key={title} style={{ background: '#fff', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg,${color},transparent)` }} />
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', marginBottom: '18px', background: `${color}12`, border: `1px solid ${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f0f1a', marginBottom: '10px' }}>{title}</h3>
                <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.8' }}>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who we serve */}
      <section className="pub-pad" style={{ paddingBottom: '64px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ background: '#f8f9fc', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '20px', padding: '48px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '40px' }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 800, color: '#0f0f1a', marginBottom: '16px' }}>Who We Serve</h2>
              <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.9', marginBottom: '14px' }}>MailRax is designed for businesses that send meaningful, permission-based emails — SaaS companies, e-commerce brands, agencies, and enterprises.</p>
              <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.9' }}>If you send spam, purchase email lists, or engage in deceptive practices — MailRax is not the right platform for you.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
              {['SaaS companies sending product updates','E-commerce brands running promotions','Agencies managing client email operations','Enterprises needing transactional email infrastructure'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1.5px solid rgba(0,200,150,0.15)', borderRadius: '9px', padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <CheckCircle size={14} color="#00c896" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#555' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
