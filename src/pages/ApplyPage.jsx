import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, KeyRound, Mail, Rocket, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import SiteNavbar from '../components/shared/SiteNavbar'
import SiteFooter from '../components/shared/SiteFooter'

const PLANS = [
  { id: 'starter', name: 'Starter', volume: '200 emails/day', note: 'For small lists getting started' },
  { id: 'pro', name: 'Pro', volume: '1,000 emails/day', note: 'For growing teams sending weekly' },
  { id: 'pro-plus', name: 'Pro Plus', volume: '5,000+ emails/day', note: 'For high volume and several accounts' },
]

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

const STEPS = ['Business', 'Sending', 'Review']
const NEXT = [
  [ClipboardCheck, 'We review your application', 'The Synerax team checks your use case and how your contacts opted in.'],
  [KeyRound, 'We set up your workspace', 'Your company, plan and Client Admin login are created for you.'],
  [Rocket, 'You start sending', 'Connect your domain and SMTP accounts, import contacts and launch.'],
]
const ease = [0.22, 1, 0.36, 1]

export default function ApplyPage() {
  const [params] = useSearchParams()
  const initialPlan = PLANS.some(p => p.id === params.get('plan')) ? params.get('plan') : 'starter'

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    businessName: '', contactName: '', email: '', website: '', plan: initialPlan,
    useCase: '', listSource: '', monthlyVolume: '', notes: '', agreedToTerms: false, agreedToAntiSpam: false,
  })

  useEffect(() => { setForm(f => ({ ...f, plan: initialPlan })) }, [initialPlan])

  const update = (field, value) => { setForm(f => ({ ...f, [field]: value })); setError('') }
  const plan = PLANS.find(p => p.id === form.plan)

  const problems = [
    () => (!form.businessName.trim() ? 'Business name is required.' : !form.contactName.trim() ? 'Your name is required.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? 'Enter a valid business email.' : null),
    () => (!form.useCase ? 'Choose your primary use case.' : !form.listSource ? 'Tell us how you collect email addresses.'
      : !form.monthlyVolume.trim() ? 'Add your estimated monthly volume.' : null),
    () => (!form.agreedToTerms ? 'Please agree to the Terms of Service.' : !form.agreedToAntiSpam ? 'Please agree to the Anti-Spam Policy.' : null),
  ]

  function next() {
    const problem = problems[step]()
    if (problem) { setError(problem); return }
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submit(e) {
    e.preventDefault()
    const problem = problems[2]()
    if (problem) { setError(problem); return }
    setSubmitting(true)
    const { error: dbError } = await supabase.from('applications').insert({
      business_name: form.businessName.trim(), contact_name: form.contactName.trim(), email: form.email.trim().toLowerCase(),
      website: form.website.trim() || null, plan: form.plan, use_case: form.useCase, list_source: form.listSource,
      monthly_volume: form.monthlyVolume.trim(), notes: form.notes.trim() || null, status: 'pending',
    })
    setSubmitting(false)
    if (dbError) { setError('Something went wrong. Please try again, or email hr@synerax.in.'); return }
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="site">
      <SiteNavbar />
      <section className="ap-hero">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <span className="eyebrow"><i />Request access</span>
          <h1>Apply for <em>Synerax Mail</em></h1>
          <p>Every application is reviewed by a person, which keeps sending reputation high for everyone on the platform.</p>
        </motion.div>
      </section>

      <section className="ap-body">
        <motion.aside className="ap-side" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }}>
          <h2>What happens next</h2>
          <ol>
            {NEXT.map(([Icon, title, text], i) => (
              <li key={title}><span><Icon size={18} /></span><div><b>{i + 1}. {title}</b><p>{text}</p></div></li>
            ))}
          </ol>
          <div className="ap-side-note"><ShieldCheck size={18} /><p>We only approve senders who email people that asked to hear from them.</p></div>
          <a href="mailto:hr@synerax.in" className="ap-side-mail"><Mail size={16} /> Questions? hr@synerax.in</a>
        </motion.aside>

        <motion.div className="ap-card" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease }}>
          {submitted ? (
            <div className="ap-done">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}><Check size={30} /></motion.span>
              <h2>Application received</h2>
              <p>Thanks, {form.contactName.split(' ')[0]}. We will review your application for the <b>{plan.name}</b> plan and reply to <b>{form.email}</b>.</p>
              <div className="hero-cta"><Link to="/home" className="site-btn site-btn-primary">Back to home</Link><Link to="/features" className="site-btn site-btn-ghost">Explore features</Link></div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="ap-stepper">
                {STEPS.map((label, i) => (
                  <div key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
                    <span>{i < step ? <Check size={14} /> : i + 1}</span>{label}
                  </div>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={step} className="ap-pane" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.25 }}>
                  {step === 0 && <>
                    <div className="ap-head"><h2>Tell us about your business</h2><p>Who you are and the plan you have in mind.</p></div>
                    <fieldset className="ap-plans">
                      <legend>Plan</legend>
                      {PLANS.map(p => (
                        <label key={p.id} className={form.plan === p.id ? 'on' : ''}>
                          <input type="radio" name="plan" value={p.id} checked={form.plan === p.id} onChange={() => update('plan', p.id)} />
                          <span className="ap-plan-check"><Check size={13} /></span>
                          <b>{p.name}</b><strong>{p.volume}</strong><small>{p.note}</small>
                        </label>
                      ))}
                    </fieldset>
                    <div className="ap-row">
                      <label>Business or organisation <i>*</i><input placeholder="Acme Corp" value={form.businessName} onChange={e => update('businessName', e.target.value)} autoComplete="organization" /></label>
                      <label>Your full name <i>*</i><input placeholder="Asha Rao" value={form.contactName} onChange={e => update('contactName', e.target.value)} autoComplete="name" /></label>
                    </div>
                    <div className="ap-row">
                      <label>Business email <i>*</i><input type="email" placeholder="you@yourdomain.com" value={form.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></label>
                      <label>Website <span>optional</span><input placeholder="https://yourwebsite.com" value={form.website} onChange={e => update('website', e.target.value)} autoComplete="url" /></label>
                    </div>
                  </>}

                  {step === 1 && <>
                    <div className="ap-head"><h2>How you will send</h2><p>This helps us confirm your list is permission-based.</p></div>
                    <fieldset className="ap-options">
                      <legend>Primary use case <i>*</i></legend>
                      {useCases.map(u => (
                        <label key={u} className={form.useCase === u ? 'on' : ''}><input type="radio" name="useCase" checked={form.useCase === u} onChange={() => update('useCase', u)} /><span />{u}</label>
                      ))}
                    </fieldset>
                    <fieldset className="ap-options">
                      <legend>How do you collect email addresses? <i>*</i></legend>
                      {listSources.map(s => (
                        <label key={s} className={form.listSource === s ? 'on' : ''}><input type="radio" name="listSource" checked={form.listSource === s} onChange={() => update('listSource', s)} /><span />{s}</label>
                      ))}
                    </fieldset>
                    <label>Estimated monthly volume <i>*</i><input placeholder="e.g. 5,000 emails a month" value={form.monthlyVolume} onChange={e => update('monthlyVolume', e.target.value)} /></label>
                    <label>Anything else we should know? <span>optional</span><textarea rows={3} placeholder="Your audience, how often you send, anything unusual" value={form.notes} onChange={e => update('notes', e.target.value)} /></label>
                  </>}

                  {step === 2 && <>
                    <div className="ap-head"><h2>Review and submit</h2><p>Check your details before sending.</p></div>
                    <dl className="ap-review">
                      {[['Business', form.businessName], ['Contact', form.contactName], ['Email', form.email], ['Plan', `${plan.name} · ${plan.volume}`], ['Use case', form.useCase], ['Contacts from', form.listSource], ['Monthly volume', form.monthlyVolume]].map(([k, v]) => (
                        <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                      ))}
                    </dl>
                    {[['agreedToTerms', 'Terms of Service', '/terms-of-service'], ['agreedToAntiSpam', 'Anti-Spam Policy', '/anti-spam-policy']].map(([field, label, to]) => (
                      <label key={field} className={`ap-agree ${form[field] ? 'on' : ''}`}>
                        <input type="checkbox" checked={form[field]} onChange={e => update(field, e.target.checked)} /><span><Check size={13} /></span>
                        I agree to the <Link to={to} target="_blank">{label}</Link>
                      </label>
                    ))}
                  </>}
                </motion.div>
              </AnimatePresence>

              {error && <p className="ap-error" role="alert">{error}</p>}

              <div className="ap-foot">
                {step > 0 ? <button type="button" className="site-btn site-btn-ghost" onClick={() => { setError(''); setStep(s => s - 1) }}><ArrowLeft size={16} /> Back</button> : <span />}
                {step < 2
                  ? <button type="button" className="site-btn site-btn-primary" onClick={next}>Continue <ArrowRight size={16} /></button>
                  : <button type="submit" className="site-btn site-btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'} <ArrowRight size={16} /></button>}
              </div>
            </form>
          )}
        </motion.div>
      </section>
      <SiteFooter />
    </div>
  )
}
