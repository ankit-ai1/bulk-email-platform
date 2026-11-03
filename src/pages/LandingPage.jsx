import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight, BarChart3, Bot, CalendarDays, Check, FileUp, Filter, GitBranch, Inbox, KeyRound, Layers, LifeBuoy, MessageSquareReply, MousePointerClick, Plug,
  Send, Server, ShieldCheck, Sparkles, Users,
} from 'lucide-react'
import SiteNavbar from '../components/shared/SiteNavbar'
import SiteFooter from '../components/shared/SiteFooter'

const ease = [0.22, 1, 0.36, 1]
const rise = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } }
const Reveal = ({ children, className, as = 'div' }) => {
  const Tag = motion[as]
  return <Tag className={className} variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>{children}</Tag>
}

const HEADLINE = ['Every', 'campaign.', 'Every', 'inbox.', 'One', 'calm', 'command', 'centre.']

function HeroProduct() {
  const line = 'M0 92 C36 78 58 84 92 60 S150 70 186 44 S250 50 288 24 S340 30 372 12'
  return (
    <motion.div className="hp" initial={{ opacity: 0, y: 60, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, delay: 0.5, ease }}>
      <div className="hp-window">
        <aside className="hp-side">
          <i className="on" /><i /><i /><i /><i /><i />
        </aside>
        <div className="hp-main">
          <div className="hp-top"><b>Festive launch</b><span className="hp-live"><em />Sending</span></div>
          <div className="hp-stats">
            {[['Sent', '18,240'], ['Delivered', '98.2%'], ['Click rate', '6.4%'], ['Replies', '212']].map(([k, v], i) => (
              <motion.div key={k} className="hp-stat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.1, ease }}><span>{k}</span><b>{v}</b></motion.div>
            ))}
          </div>
          <div className="hp-chart">
            <svg viewBox="0 0 372 104" preserveAspectRatio="none" aria-hidden="true">
              <motion.path d={`${line} V104 H0 Z`} fill="#3f7492" fillOpacity=".12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }} />
              <motion.path d={line} fill="none" stroke="#173d5a" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 1.1, duration: 1.6, ease: 'easeInOut' }} />
            </svg>
          </div>
        </div>
      </div>
      <motion.div className="hp-float hp-float-a" animate={{ y: [0, -9, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
        <span className="hp-ico ember"><GitBranch size={15} /></span><div><b>Rotation active</b><small>3 accounts, all within limits</small></div>
      </motion.div>
      <motion.div className="hp-float hp-float-b" animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
        <span className="hp-ico steel"><ShieldCheck size={15} /></span><div><b>SPF, DKIM, DMARC</b><small>Domain verified</small></div>
      </motion.div>
      <p className="hp-note">Illustration with sample data</p>
    </motion.div>
  )
}

/** A campaign splitting across accounts that each stop at their own limit. */
function RotationFlow() {
  const accounts = [['Primary Workspace', 72, 'sand'], ['Sales Outreach', 48, 'mist'], ['News Server', 91, 'ember']]
  return (
    <div className="rot">
      <div className="rot-source"><Send size={18} /><b>Campaign</b><small>Queue of recipients</small></div>
      <svg className="rot-lines" viewBox="0 0 120 180" preserveAspectRatio="none" aria-hidden="true">
        {['M0 90 C60 90 60 24 120 24', 'M0 90 H120', 'M0 90 C60 90 60 156 120 156'].map((d, i) => (
          <g key={d}>
            <path d={d} stroke="rgba(255,255,255,.2)" strokeWidth="1.5" fill="none" />
            <motion.path d={d} stroke="#e0bd8c" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="6 200"
              animate={{ strokeDashoffset: [0, -206] }} transition={{ duration: 2.4, delay: i * 0.5, repeat: Infinity, ease: 'linear' }} />
          </g>
        ))}
      </svg>
      <div className="rot-accounts">
        {accounts.map(([name, pct, tone], i) => (
          <div key={name} className="rot-acct">
            <div><b>{name}</b><small>Daily quota</small></div>
            <div className="rot-track"><motion.span className={tone} initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1.3, delay: 0.2 + i * 0.15, ease }} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}

const JOURNEY = [
  [FileUp, 'Import', 'CSV or Excel lists, with duplicates caught'],
  [Filter, 'Segment', 'Pick the people this message is for'],
  [Send, 'Send', 'Spread across accounts within their limits'],
  [MousePointerClick, 'Engage', 'Clicks trigger the next automated step'],
  [MessageSquareReply, 'Reply', 'Answers land in your inbox, linked to the campaign'],
]
const CYCLE = 9

/** A loop: the line draws across the path while each stage lights up as it is reached. */
function Journey() {
  const n = JOURNEY.length
  return (
    <div className="jr">
      <div className="jr-rail" aria-hidden="true">
        <motion.span animate={{ scaleX: [0, 1, 1, 0] }} transition={{ duration: CYCLE, times: [0, 0.7, 0.94, 1], repeat: Infinity, ease: 'easeInOut' }} />
        <motion.i animate={{ left: ['0%', '100%', '100%', '0%'], opacity: [1, 1, 0, 0] }} transition={{ duration: CYCLE, times: [0, 0.7, 0.94, 1], repeat: Infinity, ease: 'easeInOut' }} />
      </div>
      <div className="jr-stages">
        {JOURNEY.map(([Icon, title, text], i) => {
          const at = (i / (n - 1)) * 0.7
          return (
            <div key={title} className="jr-stage">
              <motion.span className="jr-node"
                animate={{ backgroundColor: ['#fffdf8', '#fffdf8', '#173d5a', '#173d5a', '#fffdf8'], color: ['#173d5a', '#173d5a', '#ffffff', '#ffffff', '#173d5a'], scale: [1, 1, 1.12, 1, 1] }}
                transition={{ duration: CYCLE, times: [0, Math.max(at - 0.02, 0.001), at + 0.03, 0.94, 1], repeat: Infinity }}>
                <Icon size={20} />
              </motion.span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PROVIDERS = ['Google Workspace', 'Microsoft 365', 'Amazon SES', 'SendGrid', 'Any SMTP server', 'Any IMAP mailbox']

const FEATURES = [
  { icon: Send, title: 'Campaigns that stay under control', text: 'Build, preview, test and schedule by time zone. Pause, resume, stop or duplicate at any point.', wide: true, art: 'steps' },
  { icon: Users, title: 'Segments that mean something', text: 'Group by behavior, purchase history, demographics or engagement, then reuse them anywhere.' },
  { icon: CalendarDays, title: 'A real planning calendar', text: 'See the month at a glance and drag plans to a new date.' },
  { icon: Inbox, title: 'One inbox for every reply', text: 'Connected mailboxes in one view, with threads and replies linked to their campaign.' },
  { icon: Layers, title: 'Design and test together', text: 'Drag-and-drop or HTML templates, mobile and dark previews, and A/B tests on subject, content and send time.' },
  { icon: Bot, title: 'Automation on real behavior', text: 'If they click, take one path. If they stay quiet, follow up. Unsubscribes always stop the workflow.', wide: true, art: 'flow' },
  { icon: BarChart3, title: 'Analytics you can trust', text: 'Delivery, clicks, replies, bounces and revenue. Opens are clearly marked as estimates.', wide: true },
  { icon: Sparkles, title: 'AI that does real work', text: 'Draft copy, suggest subject lines and segments, and get insights from your own results.', wide: true },
]

const ROLES = [
  { icon: KeyRound, name: 'Synerax Admin', text: 'Onboard companies, assign plans and credits, monitor usage and answer support across the platform.' },
  { icon: Server, name: 'Client Admin', text: 'Run the company workspace: domains, SMTP accounts, team permissions, contacts and results.' },
  { icon: MousePointerClick, name: 'Campaign Manager', text: 'Create and send campaigns, with access to exactly the features their admin allows.' },
]

const SAFEGUARDS = [
  'One-click unsubscribe on every campaign email',
  'Automatic suppression of bounces and complaints',
  'Each company’s data isolated at the database',
  'SMTP passwords encrypted and never displayed',
  'SPF, DKIM and DMARC setup with live checks',
  'Contacts marked as no-consent are never emailed',
]

export default function LandingPage() {
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  return (
    <div className="site">
      <SiteNavbar />

      <section className="hero">
        <svg className="hero-waves" viewBox="0 0 1440 320" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 190 C240 110 420 260 720 180 S1180 90 1440 170 V320 H0 Z" fill="#8fb0c0" opacity=".2" />
          <path d="M0 240 C280 180 520 300 800 230 S1240 170 1440 230 V320 H0 Z" fill="#e0bd8c" opacity=".26" />
        </svg>
        <div className="hero-copy">
          <motion.span className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}><i />Email marketing, built for teams</motion.span>
          <h1>
            {HEADLINE.map((word, i) => (
              <motion.span key={i} className={i >= 4 ? 'accent' : ''} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 + i * 0.06, ease }}>{word} </motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.6 }}>
            Plan campaigns, manage your sending accounts, answer replies and see what is working, in one secure workspace for your whole company.
          </motion.p>
          <motion.div className="hero-cta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.75 }}>
            <Link to="/apply" className="site-btn site-btn-primary">Request access <ArrowRight size={16} /></Link>
            <Link to="/features" className="site-btn site-btn-ghost">See what’s inside</Link>
          </motion.div>
        </div>
        <HeroProduct />
      </section>

      <section className="section band-white" id="features">
        <Reveal className="section-head split">
          <motion.div variants={rise}><span className="eyebrow"><i />The platform</span><h2>Everything a campaign needs, from plan to reply</h2></motion.div>
          <motion.div variants={rise} className="head-side"><p>No more jumping between a list tool, a mail client and a spreadsheet.</p><Link to="/features" className="site-link">Explore all features <ArrowRight size={15} /></Link></motion.div>
        </Reveal>
        <Reveal className="bento">
          {FEATURES.map(({ icon: Icon, title, text, wide, art }) => (
            <motion.article key={title} variants={rise} whileHover={{ y: -5 }} className={`bento-card ${wide ? 'wide' : ''}`}>
              <span className="bento-icon"><Icon size={20} /></span>
              <h3>{title}</h3>
              <p>{text}</p>
              {art === 'steps' && (
                <div className="art-steps">{['Details', 'Audience', 'Content', 'Sending', 'Launch'].map((s, i) => (
                  <motion.span key={s} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.25 + i * 0.12 }}><Check size={12} />{s}</motion.span>
                ))}</div>
              )}
              {art === 'flow' && (
                <div className="art-flow">
                  <span>Send email</span><i /><span className="ember">Clicked?</span><i />
                  <div><span className="yes">Yes: next offer</span><span className="no">No: follow up</span></div>
                </div>
              )}
            </motion.article>
          ))}
        </Reveal>
      </section>

      <section className="journey-band">
        <Reveal className="section-head split">
          <motion.div variants={rise}><span className="eyebrow"><i />How a campaign flows</span><h2>From a raw list to a real conversation</h2></motion.div>
          <motion.p variants={rise}>Every step lives in the same workspace, so nothing gets lost between tools and every reply stays tied to the campaign that earned it.</motion.p>
        </Reveal>
        <Reveal className="journey-inner"><motion.div variants={rise}><Journey /></motion.div></Reveal>
      </section>

      <section className="dark-band">
        <Reveal className="dark-inner">
          <motion.div variants={rise} className="dark-copy">
            <span className="eyebrow on-dark"><i />Multi-account sending</span>
            <h2>Send through several accounts, inside the limits you set</h2>
            <p>Choose one SMTP account or many. Synerax Mail spreads each campaign by every account’s hourly, daily and monthly quota and its current health.</p>
            <ul>
              <li><Check size={16} />An account with repeated failures pauses itself</li>
              <li><Check size={16} />At the limit, sending waits for the next window</li>
              <li><Check size={16} />See performance for each account</li>
            </ul>
          </motion.div>
          <motion.div variants={rise}><RotationFlow /></motion.div>
        </Reveal>
      </section>

      <section className="section">
        <Reveal className="section-head split">
          <motion.div variants={rise}><span className="eyebrow"><i />Three workspaces</span><h2>The right view for every person</h2></motion.div>
          <motion.p variants={rise}>Each role gets its own dashboard, and sees only what it is allowed to.</motion.p>
        </Reveal>
        <Reveal className="roles">
          {ROLES.map(({ icon: Icon, name, text }, i) => (
            <motion.article key={name} variants={rise} className={`role tone-${i}`}>
              <Icon size={22} /><h3>{name}</h3><p>{text}</p>
            </motion.article>
          ))}
        </Reveal>
      </section>

      <section className="section band-mist connect">
        <Reveal className="connect-grid">
          <motion.div variants={rise}>
            <span className="eyebrow"><i />Connections</span>
            <h2>Works with the email you already use</h2>
            <p>Bring your own sending accounts and mailboxes. Your domain and your reputation stay yours.</p>
            <div className="connect-chips">
              {PROVIDERS.map(name => <span key={name}><Plug size={13} />{name}</span>)}
            </div>
          </motion.div>
          <motion.div variants={rise} className="code-card">
            <div className="code-head"><i /><i /><i /><span>REST API</span></div>
            <pre>{`POST /v1/contacts
X-API-Key: syn_••••••••

{
  "email": "asha@example.com",
  "list_id": "newsletter-list-id",
  "tags": ["vip"],
  "consent_status": "opted_in"
}`}</pre>
            <p>Add contacts and record sales from your own systems, and get signed webhooks when things happen.</p>
          </motion.div>
        </Reveal>
      </section>

      <section className="section band-white trust">
        <Reveal className="trust-grid">
          <motion.div variants={rise}>
            <span className="eyebrow"><i />Responsible by design</span>
            <h2>Good sending habits are built in, not optional</h2>
            <p>Your reputation depends on sending only to people who want your email. These safeguards are always working.</p>
            <Link to="/anti-spam-policy" className="site-link">Read our anti-spam policy <ArrowRight size={15} /></Link>
          </motion.div>
          <motion.ul variants={stagger} className="trust-list">
            {SAFEGUARDS.map(item => <motion.li key={item} variants={rise}><span><ShieldCheck size={16} /></span>{item}</motion.li>)}
          </motion.ul>
        </Reveal>
      </section>

      <section className="final-cta">
        <Reveal className="final-inner">
          <motion.h2 variants={rise}>Ready to bring your email under one roof?</motion.h2>
          <motion.p variants={rise}>Tell us about your business and how you collect your contacts. The Synerax team will set up your workspace.</motion.p>
          <motion.div variants={rise} className="hero-cta">
            <Link to="/apply" className="site-btn site-btn-sand">Request access <ArrowRight size={16} /></Link>
            <Link to="/contact" className="site-btn site-btn-outline"><LifeBuoy size={15} /> Talk to us</Link>
          </motion.div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
