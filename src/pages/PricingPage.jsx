import { useState } from 'react'
import { Link } from 'react-router-dom'
import SiteNavbar from '../components/shared/SiteNavbar'
import SiteFooter from '../components/shared/SiteFooter'
import { Check, ArrowRight, Mail, Shield, BarChart2, Users } from 'lucide-react'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'XXX',
    period: '/month',
    tagline: 'Perfect for small businesses getting started with email.',
    emailsPerDay: '200',
    emailsPerMonth: '~6,000',
    color: '#00c896',
    features: [
      '200 emails per day',
      '~6,000 emails per month',
      '1 verified sender domain',
      'Up to 3 contact lists',
      'Basic HTML templates',
      'Delivery logs (7 days)',
      'Email support',
    ],
    cta: 'Apply for Starter',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'XXX',
    period: '/month',
    tagline: 'For growing businesses that need higher volume and more control.',
    emailsPerDay: '1,000',
    emailsPerMonth: '~30,000',
    color: '#6c63ff',
    features: [
      '1,000 emails per day',
      '~30,000 emails per month',
      '3 verified sender domains',
      'Unlimited contact lists',
      'Advanced HTML templates',
      'Delivery logs (30 days)',
      'Campaign scheduling',
      'Priority email support',
    ],
    cta: 'Apply for Pro',
    popular: true,
  },
  {
    id: 'pro-plus',
    name: 'Pro Plus',
    price: 'XXX',
    period: '/month',
    tagline: 'For enterprises and agencies managing large-scale email operations.',
    emailsPerDay: '5,000+',
    emailsPerMonth: '~150,000+',
    color: '#f59e0b',
    features: [
      '5,000+ emails per day',
      '~150,000+ emails per month',
      'Unlimited sender domains',
      'Unlimited contact lists',
      'Full template library',
      'Delivery logs (90 days)',
      'Campaign scheduling',
      'Dedicated account manager',
      'Custom sending limits on request',
    ],
    cta: 'Apply for Pro Plus',
    popular: false,
  },
]

const allFeatures = [
  { icon: Shield, label: 'Compliance-first onboarding for all plans' },
  { icon: Mail, label: 'Transactional & marketing email support' },
  { icon: BarChart2, label: 'Real-time delivery analytics' },
  { icon: Users, label: 'Contact list management & CSV import' },
]

export default function PricingPage() {
  const [selected, setSelected] = useState('pro')

  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f0f1a', fontFamily: 'var(--font-body)' }}>
      <SiteNavbar />

      {/* Header */}
      <section className="pub-pad" style={{ textAlign: 'center', paddingTop: '72px', paddingBottom: '56px', background: 'linear-gradient(160deg,#f0f4ff 0%,#fff 60%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', padding: '6px 16px', marginBottom: '20px', fontSize: '11px', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.08em' }}>
          SIMPLE, TRANSPARENT PRICING
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(32px,5vw,54px)', marginBottom: '16px', color: '#0f0f1a' }}>
          Choose your plan
        </h1>
        <p style={{ fontSize: '16px', color: '#888', maxWidth: '520px', margin: '0 auto', lineHeight: '1.75' }}>
          All plans include compliance-first onboarding, domain verification, and full delivery analytics. No surprises.
        </p>
      </section>

      {/* Plans */}
      <section className="pub-pad" style={{ paddingBottom: '80px' }}>
        <div className="pub-plan-grid" style={{ maxWidth: '1280px', margin: '0 auto' }}>
          {plans.map(plan => {
            const isSelected = selected === plan.id
            return (
            <div key={plan.id}
              onClick={() => setSelected(plan.id)}
              style={{
                background: '#fff', cursor: 'pointer',
                border: isSelected ? `2.5px solid ${plan.color}` : '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: '18px', padding: '32px',
                position: 'relative', display: 'flex', flexDirection: 'column',
                boxShadow: isSelected ? `0 12px 40px ${plan.color}28` : '0 4px 16px rgba(0,0,0,0.05)',
                transition: 'border 0.18s, box-shadow 0.18s, transform 0.18s',
                transform: isSelected ? 'translateY(-4px)' : 'none',
              }}>
              {isSelected && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg,${plan.color},#a78bfa)`, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  {plan.popular && !isSelected ? 'MOST POPULAR' : 'SELECTED'}
                </div>
              )}
              {plan.popular && !isSelected && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '4px 16px', borderRadius: '20px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: `${plan.color}12`, border: `1px solid ${plan.color}25`, borderRadius: '8px', padding: '5px 12px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: plan.color }}>{plan.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 900, color: '#0f0f1a' }}>{plan.price}</span>
                  <span style={{ fontSize: '14px', color: '#aaa' }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#888', lineHeight: '1.65' }}>{plan.tagline}</p>
              </div>

              <div style={{ background: `${plan.color}08`, border: `1px solid ${plan.color}18`, borderRadius: '10px', padding: '14px 16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: plan.color, fontFamily: 'var(--font-display)' }}>{plan.emailsPerDay}</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>emails / day</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#555' }}>{plan.emailsPerMonth}</div>
                  <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>emails / month</div>
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: `${plan.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Check size={11} color={plan.color} />
                    </div>
                    <span style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link to={`/apply?plan=${plan.id}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: isSelected ? `linear-gradient(135deg,${plan.color},#a78bfa)` : '#f5f5f7',
                color: isSelected ? '#fff' : '#888', textDecoration: 'none', fontSize: '14px', fontWeight: 700,
                padding: '13px 24px', borderRadius: '10px',
                boxShadow: isSelected ? `0 6px 20px ${plan.color}35` : 'none',
                transition: 'background 0.18s, color 0.18s',
              }}>
                {plan.cta} <ArrowRight size={15} />
              </Link>
            </div>
            )
          })}
        </div>
      </section>

      {/* All plans include */}
      <section className="pub-pad" style={{ paddingBottom: '80px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', background: '#f8f9fc', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '16px', padding: '36px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f0f1a', marginBottom: '24px', textAlign: 'center' }}>Included in every plan</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px' }}>
            {allFeatures.map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', flexShrink: 0, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color="#00c896" />
                </div>
                <span style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="pub-pad" style={{ paddingBottom: '80px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '10px' }}>Not sure which plan is right for you?</p>
        <Link to="/contact" style={{ fontSize: '14px', color: '#6c63ff', textDecoration: 'none', fontWeight: 600 }}>
          Contact us — we'll help you choose →
        </Link>
      </section>

      <SiteFooter />
    </div>
  )
}
