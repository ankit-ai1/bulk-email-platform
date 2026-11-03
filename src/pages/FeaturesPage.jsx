import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BarChart3, Bot, CalendarDays, Check, GitBranch, Globe2, Inbox, LayoutTemplate, Send, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import SiteNavbar from '../components/shared/SiteNavbar'
import SiteFooter from '../components/shared/SiteFooter'

const ease = [0.22, 1, 0.36, 1]
const seen = { once: true, amount: 0.35 }
const Pop = ({ children, delay = 0, className }) => (
  <motion.div className={className} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={seen} transition={{ duration: 0.55, delay, ease }}>{children}</motion.div>
)
const Grow = ({ width, delay = 0, className }) => (
  <motion.span className={className} initial={{ width: 0 }} whileInView={{ width }} viewport={seen} transition={{ duration: 1.2, delay, ease }} />
)

function WizardArt() {
  const steps = ['Details', 'Audience', 'Content', 'Sending', 'Launch']
  return (
    <div className="fa-stack">
      {steps.map((s, i) => (
        <Pop key={s} delay={i * 0.14} className={`fa-step ${i === 4 ? 'last' : ''}`}><span>{i === 4 ? <Send size={13} /> : <Check size={13} />}</span>{s}</Pop>
      ))}
    </div>
  )
}

function SegmentArt() {
  const chips = ['Bought in 90 days', 'Spent over 5,000', 'City: Pune', 'Clicked recently']
  return (
    <div>
      <div className="fa-chips">{chips.map((c, i) => <Pop key={c} delay={i * 0.15} className="fa-chip">{c}</Pop>)}</div>
      {[['All contacts', '100%'], ['After filters', '38%'], ['Your segment', '14%']].map(([label, w], i) => (
        <div key={label} className="fa-bar"><small>{label}</small><div><Grow width={w} delay={0.4 + i * 0.2} className={`t${i}`} /></div></div>
      ))}
    </div>
  )
}

function DesignArt() {
  return (
    <div className="fa-ab">
      {[['A', '“New arrivals are here”', '62%'], ['B', '“Your festive picks, Asha”', '84%']].map(([v, subject, w], i) => (
        <Pop key={v} delay={i * 0.2} className={`fa-ab-card ${i ? 'win' : ''}`}>
          <b>{v}</b><p>{subject}</p>
          <div className="fa-bar"><small>Click rate</small><div><Grow width={w} delay={0.3 + i * 0.2} className={i ? 't1' : 't2'} /></div></div>
        </Pop>
      ))}
    </div>
  )
}

function CalendarArt() {
  const marks = { 3: 'sent', 8: 'sent', 11: 'plan', 16: 'plan', 22: 'plan', 25: 'now' }
  return (
    <div className="fa-cal">
      {Array.from({ length: 28 }, (_, i) => (
        <motion.span key={i} className={marks[i] || ''} initial={{ opacity: 0, scale: 0.7 }} whileInView={{ opacity: 1, scale: 1 }} viewport={seen} transition={{ delay: i * 0.025, duration: 0.3 }}>{i + 1}</motion.span>
      ))}
    </div>
  )
}

function RotationArt() {
  return (
    <div>
      {[['Primary Workspace', '72%', 'Healthy'], ['Sales Outreach', '46%', 'Healthy'], ['News Server', '100%', 'At daily limit']].map(([name, w, state], i) => (
        <Pop key={name} delay={i * 0.15} className="fa-acct">
          <div><b>{name}</b><small className={w === '100%' ? 'warn' : ''}>{state}</small></div>
          <div className="fa-bar"><div><Grow width={w} delay={0.25 + i * 0.15} className={w === '100%' ? 't3' : 't1'} /></div></div>
        </Pop>
      ))}
    </div>
  )
}

function FlowArt() {
  return (
    <div className="fa-flow">
      <Pop className="fa-node">Send first email</Pop>
      <motion.i initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={seen} transition={{ delay: 0.3, duration: 0.4 }} />
      <Pop delay={0.5} className="fa-node accent">Did they click?</Pop>
      <motion.i initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={seen} transition={{ delay: 0.8, duration: 0.4 }} />
      <div className="fa-branch">
        <Pop delay={1} className="fa-node dark">Yes: send the next offer</Pop>
        <Pop delay={1.15} className="fa-node sand">No: follow up in 3 days</Pop>
      </div>
    </div>
  )
}

function InboxArt() {
  const rows = [['Ravi Kumar', 'Re: Festive offers', 'Campaign reply'], ['Meera Shah', 'Can we talk pricing?', 'Campaign reply'], ['Team Orbit', 'Invoice question', '']]
  return <div className="fa-inbox">{rows.map(([from, subject, tag], i) => (
    <Pop key={from} delay={i * 0.18} className={`fa-mail ${i === 0 ? 'unread' : ''}`}><em>{from[0]}</em><div><b>{from}</b><small>{subject}</small></div>{tag && <span>{tag}</span>}</Pop>
  ))}</div>
}

function AnalyticsArt() {
  const heights = [38, 56, 44, 72, 60, 88, 76]
  return (
    <div className="fa-chart">
      {heights.map((h, i) => (
        <motion.span key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={seen} transition={{ duration: 0.9, delay: i * 0.08, ease }} />
      ))}
    </div>
  )
}

function AiArt() {
  const lines = ['Five subject lines for your festive sale', 'Your click rate rises when offers come first', 'Try a segment of recent buyers in Pune']
  return <div className="fa-ai">{lines.map((line, i) => (
    <motion.p key={line} initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }} whileInView={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }} viewport={seen} transition={{ duration: 1, delay: i * 0.5, ease: 'easeOut' }}><Sparkles size={14} />{line}</motion.p>
  ))}</div>
}

function DomainArt() {
  return <div className="fa-checks">{['Domain ownership', 'SPF', 'DKIM', 'DMARC'].map((c, i) => (
    <Pop key={c} delay={i * 0.2} className="fa-check"><span><Check size={14} /></span>{c}<small>Verified</small></Pop>
  ))}</div>
}

const MODULES = [
  { id: 'campaigns', icon: Send, tag: 'Campaigns', title: 'Launch with confidence, and stay in control', text: 'A guided setup takes you from idea to launch, so nothing is missed.', points: ['Choose lists and segments', 'Send a test before you launch', 'Schedule for later, or send now', 'Pause, resume, stop or duplicate anytime'], Art: WizardArt },
  { id: 'audience', icon: Users, tag: 'Audience', title: 'Talk to the right people, not everyone', text: 'Your contact list becomes a simple CRM with a full history for every person.', points: ['Import from CSV or Excel', 'Filter by behavior, purchases, demographics or engagement', 'Save segments and reuse them', 'List hygiene finds invalid and inactive addresses'], Art: SegmentArt },
  { id: 'design', icon: LayoutTemplate, tag: 'Design & testing', title: 'Build emails that work, then prove it', text: 'Start from a template and let real results decide what stays.', points: ['Drag-and-drop builder or your own HTML', 'Desktop, phone and dark mode previews', 'Automatic check for common rendering problems', 'A/B test subject, content and send time'], Art: DesignArt },
  { id: 'calendar', icon: CalendarDays, tag: 'Planning', title: 'See your whole month of email', text: 'Plan ahead and keep the whole team on the same schedule.', points: ['Month view of every campaign', 'Plan a draft on any date', 'Drag to reschedule', 'Sent, scheduled and planned at a glance'], Art: CalendarArt },
  { id: 'sending', icon: GitBranch, tag: 'Multi-account sending', title: 'Spread the work across your accounts', text: 'Use one SMTP account or several. Your own limits are always respected.', points: ['Hourly, daily and monthly limits per account', 'Choose accounts per campaign', 'Unhealthy accounts pause automatically', 'Compare performance by account'], Art: RotationArt },
  { id: 'automation', icon: Bot, tag: 'Automation', title: 'Follow up without lifting a finger', text: 'Build workflows that respond to what each contact actually does.', points: ['Start from a list, click or open', 'Add emails, waits and conditions', 'Pause and review execution history', 'Unsubscribes leave the workflow at once'], Art: FlowArt },
  { id: 'inbox', icon: Inbox, tag: 'Unified inbox', title: 'Answer every reply from one place', text: 'No more switching mail apps to see how people responded.', points: ['Connect several mailboxes over IMAP', 'Threads, search, drafts, archive and trash', 'Reply, reply all and forward', 'Replies linked to their campaign and contact'], Art: InboxArt },
  { id: 'analytics', icon: BarChart3, tag: 'Analytics', title: 'Numbers you can actually act on', text: 'Follow every campaign from sent to sale, with honest labels on what is estimated.', points: ['Delivery, clicks, replies and bounces', 'Conversions and revenue by campaign', 'Compare campaigns, accounts and domains', 'Export reports as CSV or PDF'], Art: AnalyticsArt },
  { id: 'ai', icon: Sparkles, tag: 'AI assistant', title: 'A second brain for your copy and results', text: 'AI works from your brief and your own numbers. You always review before anything goes out.', points: ['Draft emails and subject lines', 'Personalization suggestions', 'Segment ideas from your audience', 'Insights from your sending history'], Art: AiArt },
  { id: 'deliverability', icon: Globe2, tag: 'Deliverability', title: 'Set up your domain the right way', text: 'Step-by-step records and live checks, so your email starts from a trusted place.', points: ['SPF, DKIM and DMARC records provided', 'One click to check your DNS', 'Automatic suppression of bounces and complaints', 'One-click unsubscribe on every campaign email'], Art: DomainArt },
  { id: 'security', icon: ShieldCheck, tag: 'Teams & security', title: 'Everyone gets exactly the access they need', text: 'Built for companies with more than one person, and for data that must stay separate.', points: ['Three roles with permission controls', 'Each company’s data isolated at the database', 'Two-factor sign-in and audit logs', 'Encrypted SMTP passwords, API keys and signed webhooks'], Art: () => (
    <div className="fa-roles">{[['Synerax Admin', 'The platform'], ['Client Admin', 'The company'], ['Campaign Manager', 'Assigned work']].map(([r, s], i) => (
      <Pop key={r} delay={i * 0.2} className={`fa-role t${i}`} ><b>{r}</b><small>{s}</small></Pop>
    ))}</div>
  ) },
]

export default function FeaturesPage() {
  return (
    <div className="site">
      <SiteNavbar />
      <section className="fp-hero">
        <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }}>
          <span className="eyebrow"><i />Features</span>
          <h1>All your email work, <em>in one place</em></h1>
          <p>Eleven connected tools for planning, sending, answering and improving every campaign.</p>
        </motion.div>
        <motion.nav className="fp-jump" aria-label="Jump to a feature" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.25, ease }}>
          {MODULES.map(({ id, tag, icon: Icon }) => <a key={id} href={`#${id}`}><Icon size={14} />{tag}</a>)}
        </motion.nav>
      </section>

      {MODULES.map(({ id, icon: Icon, tag, title, text, points, Art }, i) => (
        <section key={id} id={id} className={`fm ${['fm-white', 'fm-cream', 'fm-sand', 'fm-mist'][i % 4]}`}>
          <div className={`fm-inner ${i % 2 ? 'flip' : ''}`}>
            <motion.div className="fm-copy" initial={{ opacity: 0, x: i % 2 ? 30 : -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.8, ease }}>
              <span className="fm-tag"><Icon size={15} />{tag}</span>
              <h2>{title}</h2>
              <p>{text}</p>
              <ul>{points.map(point => <li key={point}><Check size={16} />{point}</li>)}</ul>
            </motion.div>
            <motion.div className="fm-art" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.8, ease }}><Art /></motion.div>
          </div>
        </section>
      ))}

      <section className="final-cta">
        <div className="final-inner">
          <h2>See it working for your team</h2>
          <p>Tell us about your business and the Synerax team will set up your workspace.</p>
          <div className="hero-cta">
            <Link to="/apply" className="site-btn site-btn-sand">Request access <ArrowRight size={16} /></Link>
            <Link to="/contact" className="site-btn site-btn-outline">Talk to us</Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
