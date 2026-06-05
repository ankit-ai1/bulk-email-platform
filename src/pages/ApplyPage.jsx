import { useState, useEffect } from 'react'
import SiteFooter from '../components/shared/SiteFooter'
import { Link, useSearchParams } from 'react-router-dom'
import { Zap, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

const planNames = {
  starter: 'Starter — 200 emails/day',
  pro: 'Pro — 1,000 emails/day',
  'pro-plus': 'Pro Plus — 5,000+ emails/day',
}

const planColors = {
  starter: '#00c896',
  pro: '#6c63ff',
  'pro-plus': '#f59e0b',
}

const useCases = [
  'Transactional emails (receipts, notifications, OTPs)',
  'Marketing newsletters',
  'Both transactional & marketing',
  'Product updates & announcements',
  'Other',
]

const listSources = [
  'Double opt-in subscription form',
  'Single opt-in subscription form',
  'Existing customer database (prior relationship)',
  'Event/conference signups',
  'Other (will explain in notes)',
]

export default function ApplyPage() {
  const [params] = useSearchParams()
  const selectedPlan = params.get('plan') || 'starter'

  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    website: '',
    plan: selectedPlan,
    useCase: '',
    listSource: '',
    monthlyVolume: '',
    notes: '',
    agreedToTerms: false,
    agreedToAntiSpam: false,
  })

  useEffect(() => {
    setForm(f => ({ ...f, plan: selectedPlan }))
  }, [selectedPlan])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  function validateStep1() {
    if (!form.businessName.trim()) return 'Business name is required.'
    if (!form.contactName.trim()) return 'Contact name is required.'
    if (!form.email.trim() || !form.email.includes('@')) return 'Valid email is required.'
    return null
  }

  function validateStep2() {
    if (!form.useCase) return 'Please select your use case.'
    if (!form.listSource) return 'Please select how you collect email addresses.'
    if (!form.monthlyVolume.trim()) return 'Please provide an estimated monthly volume.'
    return null
  }

  function validateStep3() {
    if (!form.agreedToTerms) return 'You must agree to the Terms of Service.'
    if (!form.agreedToAntiSpam) return 'You must agree to the Anti-Spam Policy.'
    return null
  }

  function handleNext() {
    const err = step === 1 ? validateStep1() : validateStep2()
    if (err) { setError(err); return }
    setStep(s => s + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validateStep3()
    if (err) { setError(err); return }

    setSubmitting(true)
    try {
      const { error: dbError } = await supabase.from('applications').insert({
        business_name: form.businessName,
        contact_name: form.contactName,
        email: form.email,
        website: form.website || null,
        plan: form.plan,
        use_case: form.useCase,
        list_source: form.listSource,
        monthly_volume: form.monthlyVolume,
        notes: form.notes || null,
        status: 'pending',
      })
      if (dbError) throw dbError
      setSubmitted(true)
    } catch (err) {
      setError('Something went wrong. Please try again or contact us.')
    } finally {
      setSubmitting(false)
    }
  }

  const planColor = planColors[form.plan] || '#00c896'

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: '#fff', border: '1.5px solid #e5e7eb',
    borderRadius: '9px', color: '#0f0f1a', fontSize: '14px',
    fontFamily: 'var(--font-body)', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#444', marginBottom: '7px',
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
        {/* Navbar */}
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
        </nav>

        {/* Success */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
          <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(0,200,150,0.1)', border: '2px solid rgba(0,200,150,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <CheckCircle size={32} color="#00c896" />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: '#0f0f1a', marginBottom: '14px' }}>
              Application Received
            </h1>
            <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.75', marginBottom: '10px' }}>
              Thank you, <strong style={{ color: '#0f0f1a' }}>{form.contactName}</strong>. Your application for the{' '}
              <strong style={{ color: planColor }}>{planNames[form.plan]}</strong> plan has been submitted successfully.
            </p>
            <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.75', marginBottom: '36px' }}>
              Our team will review your application within <strong style={{ color: '#444' }}>48 business hours</strong> and get back to you at{' '}
              <strong style={{ color: '#444' }}>{form.email}</strong> with next steps.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" style={{
                background: 'linear-gradient(135deg,#00c896,#6c63ff)',
                color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700,
                padding: '11px 26px', borderRadius: '9px',
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 6px 20px rgba(108,99,255,0.25)',
              }}>
                Back to Home <ArrowRight size={15} />
              </Link>
              <Link to="/contact" style={{
                background: '#f5f5f7', border: '1.5px solid #e5e7eb',
                color: '#555', textDecoration: 'none', fontSize: '14px', fontWeight: 600,
                padding: '11px 26px', borderRadius: '9px',
              }}>
                Contact Support
              </Link>
            </div>
          </div>
        </div>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'var(--font-body)', color: '#0f0f1a', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
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
        <Link to="/pricing" style={{ fontSize: '13px', color: '#888', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ArrowLeft size={14} /> Back to Pricing
        </Link>
      </nav>

      {/* Hero strip */}
      <div style={{ background: 'linear-gradient(160deg,#f0f4ff 0%,#fff 60%)', padding: '36px 48px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: '580px', margin: '0 auto', paddingBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', padding: '5px 14px', marginBottom: '16px', fontSize: '11px', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.08em' }}>
            APPLICATION FORM
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '28px', color: '#0f0f1a', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Apply for access
          </h1>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: '1.7' }}>
            We manually review every application to maintain high deliverability standards for all senders.
          </p>
        </div>
      </div>

      {/* Form container */}
      <div style={{ flex: 1, maxWidth: '580px', width: '100%', margin: '0 auto', padding: '40px 24px 80px', boxSizing: 'border-box' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: step >= s ? 'linear-gradient(135deg,#00c896,#6c63ff)' : '#f5f5f7',
                border: step >= s ? 'none' : '1.5px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
                color: step >= s ? '#fff' : '#bbb',
                boxShadow: step >= s ? '0 4px 10px rgba(108,99,255,0.2)' : 'none',
              }}>{s}</div>
              <span style={{ fontSize: '12px', color: step === s ? '#0f0f1a' : '#bbb', fontWeight: step === s ? 600 : 400 }}>
                {s === 1 ? 'Business Info' : s === 2 ? 'Email Setup' : 'Confirmation'}
              </span>
              {s < 3 && <div style={{ width: '28px', height: '1.5px', background: step > s ? '#00c896' : '#e5e7eb' }} />}
            </div>
          ))}
        </div>

        {/* Selected plan badge */}
        <div style={{
          background: `${planColor}08`, border: `1.5px solid ${planColor}25`,
          borderRadius: '10px', padding: '12px 16px', marginBottom: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: '#888' }}>Selected Plan:</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: planColor }}>{planNames[form.plan]}</span>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Step 1 — Business Info */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#0f0f1a', marginBottom: '4px' }}>Tell us about your business</h2>
                <p style={{ fontSize: '13px', color: '#aaa' }}>We review every application before enabling sending access.</p>
              </div>

              <div>
                <label style={labelStyle}>Business / Organisation Name *</label>
                <input style={inputStyle} placeholder="Acme Corp" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Your Full Name *</label>
                <input style={inputStyle} placeholder="John Doe" value={form.contactName} onChange={e => update('contactName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Business Email Address *</label>
                <input style={inputStyle} type="email" placeholder="you@yourdomain.com" value={form.email} onChange={e => update('email', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Website <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                <input style={inputStyle} placeholder="https://yourwebsite.com" value={form.website} onChange={e => update('website', e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 2 — Email Setup */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#0f0f1a', marginBottom: '4px' }}>How will you use MailRax?</h2>
                <p style={{ fontSize: '13px', color: '#aaa' }}>This helps us ensure your use case meets our compliance requirements.</p>
              </div>

              <div>
                <label style={labelStyle}>Primary Use Case *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {useCases.map(uc => (
                    <label key={uc} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                      background: form.useCase === uc ? 'rgba(0,200,150,0.06)' : '#fafafa',
                      border: form.useCase === uc ? '1.5px solid rgba(0,200,150,0.3)' : '1.5px solid #e5e7eb',
                      borderRadius: '9px', padding: '11px 14px',
                    }}>
                      <input type="radio" name="useCase" value={uc} checked={form.useCase === uc} onChange={() => update('useCase', uc)} style={{ accentColor: '#00c896' }} />
                      <span style={{ fontSize: '13px', color: '#444' }}>{uc}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>How do you collect email addresses? *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {listSources.map(ls => (
                    <label key={ls} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
                      background: form.listSource === ls ? 'rgba(108,99,255,0.05)' : '#fafafa',
                      border: form.listSource === ls ? '1.5px solid rgba(108,99,255,0.25)' : '1.5px solid #e5e7eb',
                      borderRadius: '9px', padding: '11px 14px',
                    }}>
                      <input type="radio" name="listSource" value={ls} checked={form.listSource === ls} onChange={() => update('listSource', ls)} style={{ accentColor: '#6c63ff' }} />
                      <span style={{ fontSize: '13px', color: '#444' }}>{ls}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Estimated monthly email volume *</label>
                <input style={inputStyle} placeholder="e.g. 5,000 emails/month" value={form.monthlyVolume} onChange={e => update('monthlyVolume', e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Additional notes <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  style={{ ...inputStyle, height: '90px', resize: 'vertical' }}
                  placeholder="Any other details about your use case..."
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: '#0f0f1a', marginBottom: '4px' }}>Review & Submit</h2>
                <p style={{ fontSize: '13px', color: '#aaa' }}>Please confirm your details and agree to our policies.</p>
              </div>

              {/* Summary */}
              <div style={{ background: '#f8f9fc', border: '1.5px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Business', value: form.businessName },
                  { label: 'Contact', value: form.contactName },
                  { label: 'Email', value: form.email },
                  { label: 'Plan', value: planNames[form.plan] },
                  { label: 'Use Case', value: form.useCase },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', paddingBottom: '8px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '13px', color: '#aaa' }}>{label}</span>
                    <span style={{ fontSize: '13px', color: '#0f0f1a', fontWeight: 500, textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Agreements */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { field: 'agreedToTerms', label: 'Terms of Service', to: '/terms-of-service' },
                  { field: 'agreedToAntiSpam', label: 'Anti-Spam Policy', to: '/anti-spam-policy' },
                ].map(({ field, label, to }) => (
                  <label key={field} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer',
                    background: form[field] ? 'rgba(0,200,150,0.05)' : '#fafafa',
                    border: form[field] ? '1.5px solid rgba(0,200,150,0.25)' : '1.5px solid #e5e7eb',
                    borderRadius: '10px', padding: '14px',
                  }}>
                    <input
                      type="checkbox"
                      checked={form[field]}
                      onChange={e => update(field, e.target.checked)}
                      style={{ accentColor: '#00c896', marginTop: '2px', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: '13px', color: '#555', lineHeight: '1.6' }}>
                      I have read and agree to the MailRax{' '}
                      <Link to={to} target="_blank" style={{ color: '#00c896', textDecoration: 'none', fontWeight: 600 }}>{label}</Link>
                      {' '}and confirm that I will only send emails to opted-in recipients.
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '16px', background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.2)',
              borderRadius: '9px', padding: '11px 14px', fontSize: '13px', color: '#ef4444',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '28px', justifyContent: step > 1 ? 'space-between' : 'flex-end' }}>
            {step > 1 && (
              <button type="button" onClick={() => setStep(s => s - 1)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: '#f5f5f7', border: '1.5px solid #e5e7eb',
                color: '#555', fontSize: '14px', fontWeight: 600,
                padding: '11px 22px', borderRadius: '9px', cursor: 'pointer',
              }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}

            {step < 3 ? (
              <button type="button" onClick={handleNext} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'linear-gradient(135deg,#00c896,#6c63ff)',
                color: '#fff', fontSize: '14px', fontWeight: 700,
                padding: '11px 28px', borderRadius: '9px', cursor: 'pointer', border: 'none',
                boxShadow: '0 6px 20px rgba(108,99,255,0.25)',
              }}>
                Continue <ArrowRight size={14} />
              </button>
            ) : (
              <button type="submit" disabled={submitting} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: submitting ? '#e5e7eb' : 'linear-gradient(135deg,#00c896,#6c63ff)',
                color: submitting ? '#aaa' : '#fff', fontSize: '14px', fontWeight: 700,
                padding: '11px 28px', borderRadius: '9px', cursor: submitting ? 'not-allowed' : 'pointer', border: 'none',
                boxShadow: submitting ? 'none' : '0 6px 20px rgba(108,99,255,0.25)',
              }}>
                {submitting ? 'Submitting…' : 'Submit Application'} {!submitting && <ArrowRight size={14} />}
              </button>
            )}
          </div>

        </form>
      </div>

      <SiteFooter />

    </div>
  )
}
