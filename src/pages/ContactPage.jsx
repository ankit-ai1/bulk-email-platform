import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Copy, Mail, MapPin, Send, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import SiteNavbar from '../components/shared/SiteNavbar'
import SiteFooter from '../components/shared/SiteFooter'

const EMAIL = 'hr@synerax.in'
const OFFICE = 'Noida, India'
const ENQUIRIES = ['Getting access to Synerax Mail', 'Plans and pricing', 'Support for an existing account', 'Partnership', 'Something else']
const EMPTY = { name: '', company: '', email: '', phone: '', type: '', message: '', website: '' }
const ease = [0.22, 1, 0.36, 1]

function InfoCard({ icon: Icon, label, value }) {
  const copy = () => navigator.clipboard.writeText(value).then(() => toast.success('Copied'))
  return (
    <div className="ct-card">
      <span className="ct-icon"><Icon size={20} /></span>
      <div className="ct-card-body"><small>{label}</small><b>{value}</b></div>
      <button type="button" className="ct-copy" onClick={copy} aria-label={`Copy ${label}`}><Copy size={15} /></button>
    </div>
  )
}

export default function ContactPage() {
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    // Filled only by bots: the field is invisible to people.
    if (form.website) { setForm(EMPTY); return }
    setBusy(true)
    const phone = form.phone.trim() ? `+91 ${form.phone.trim()}` : ''
    const { error } = await supabase.from('applications').insert({
      business_name: form.company.trim() || form.name.trim(),
      contact_name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      plan: 'contact',
      use_case: form.type,
      notes: [phone && `Phone: ${phone}`, form.message.trim()].filter(Boolean).join('\n'),
      status: 'pending',
    })
    setBusy(false)
    if (error) { toast.error(`Could not send your message. Please email ${EMAIL}.`); return }
    toast.success('Message sent. We will be in touch.')
    setForm(EMPTY)
  }

  return (
    <div className="site">
      <SiteNavbar />
      <section className="ct-hero">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <span className="ct-label">Contact</span>
          <h1>Let’s <em>connect</em></h1>
          <p>Questions about Synerax Mail, your plan or a partnership? Send us a message and a real person will reply.</p>
          <span className="ct-pill"><Zap size={15} /> We reply within 24 hours</span>
        </motion.div>
      </section>

      <section className="ct-body">
        <motion.div className="ct-info" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1, ease }}>
          <InfoCard icon={Mail} label="Email" value={EMAIL} />
          <InfoCard icon={MapPin} label="Office" value={OFFICE} />
          <div className="ct-card ct-hours">
            <span className="ct-icon"><Clock size={20} /></span>
            <div className="ct-card-body">
              <small>Business hours</small>
              <div className="ct-hour"><span>Monday – Saturday</span><b>9:00 AM – 8:00 PM IST</b></div>
              <div className="ct-hour"><span>Sunday</span><b>Closed</b></div>
            </div>
          </div>
          <div className="ct-map" aria-hidden="true">
            <svg viewBox="0 0 520 240" preserveAspectRatio="xMidYMid slice">
              <defs><pattern id="ct-grid" width="44" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(-6)"><path d="M44 0H0V34" fill="none" stroke="rgba(255,255,255,.12)" /></pattern></defs>
              <rect width="520" height="240" fill="url(#ct-grid)" />
              <path d="M90 0C100 90 70 170 110 240M390 0C370 90 410 170 380 240" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="6" />
              <path d="M0 175C110 150 170 180 240 160S360 75 520 95" fill="none" stroke="#e0bd8c" strokeWidth="5" />
            </svg>
            <span className="ct-map-pin"><MapPin size={20} /></span>
            <div className="ct-map-tag"><b>Synerax office</b><small>{OFFICE}</small></div>
          </div>
        </motion.div>

        <motion.form className="ct-form" onSubmit={submit} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease }}>
          <input className="ct-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} />
          <div className="ct-row">
            <label>Full name <i>*</i><input value={form.name} onChange={set('name')} autoComplete="name" required /></label>
            <label>Company<input value={form.company} onChange={set('company')} autoComplete="organization" /></label>
          </div>
          <div className="ct-row">
            <label>Work email <i>*</i><input type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></label>
            <label>Phone
              <span className="ct-phone"><span>+91</span><input type="tel" placeholder="98765 43210" value={form.phone} onChange={set('phone')} autoComplete="tel-national" /></span>
            </label>
          </div>
          <label>Enquiry type <i>*</i>
            <select value={form.type} onChange={set('type')} required>
              <option value="">Select…</option>
              {ENQUIRIES.map(t => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label>Message <i>*</i><textarea rows={4} placeholder="How can we help?" value={form.message} onChange={set('message')} required /></label>
          <div className="ct-submit">
            <small>By submitting, you agree to our <a href="/privacy-policy">privacy policy</a>.</small>
            <button className="site-btn ct-send" disabled={busy}><Send size={16} /> {busy ? 'Sending…' : 'Send message'}</button>
          </div>
        </motion.form>
      </section>
      <SiteFooter />
    </div>
  )
}
