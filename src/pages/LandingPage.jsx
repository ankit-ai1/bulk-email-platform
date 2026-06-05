import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, ArrowRight, CheckCircle, Star, Shield, BarChart2, Send, Users, Globe, Mail, TrendingUp, Layers, Database, ChevronRight } from 'lucide-react'

/* ─── scroll animation hook ─── */
function useInView(threshold = 0.12) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

function Fade({ children, delay = 0, dir = 'up', style: s = {}, className = '' }) {
  const [ref, v] = useInView()
  const map = { up: 'translateY(32px)', left: 'translateX(-32px)', right: 'translateX(32px)', none: 'none' }
  return (
    <div ref={ref} className={className} style={{
      opacity: v ? 1 : 0,
      transform: v ? 'none' : map[dir],
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...s,
    }}>{children}</div>
  )
}

/* ─── CSS product mockups ─── */
function DashboardMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', display: 'flex', height: '370px', boxShadow: '0 32px 80px rgba(108,99,255,0.18), 0 8px 24px rgba(0,0,0,0.08)' }}>
      {/* sidebar */}
      <div style={{ width: '54px', background: '#0f0f1a', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', marginBottom: '10px' }} />
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ width: '34px', height: '28px', borderRadius: '7px', background: i===0 ? 'rgba(108,99,255,0.35)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '14px', height: '2px', borderRadius: '2px', background: i===0 ? '#a78bfa' : 'rgba(255,255,255,0.2)' }} />
          </div>
        ))}
      </div>
      {/* main */}
      <div style={{ flex: 1, background: '#f5f6fa', padding: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f0f1a' }}>Dashboard</div>
          <div style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', borderRadius: '7px', padding: '4px 12px', fontSize: '9px', color: '#fff', fontWeight: 700 }}>+ New Campaign</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
          {[['Sent','24.5K','#6c63ff','+12%'],['Delivered','23.8K','#00c896','+8%'],['Open Rate','34.2%','#f59e0b','+3%'],['Click Rate','8.7%','#ef4444','+1%']].map(([l,v,c,ch]) => (
            <div key={l} style={{ background: '#fff', borderRadius: '8px', padding: '9px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: '8px', color: '#aaa', marginTop: '2px' }}>{l}</div>
              <div style={{ fontSize: '8px', color: ch.startsWith('+') ? '#00c896' : '#ef4444', marginTop: '1px', fontWeight: 600 }}>{ch}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', flex: 1 }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>Email Performance — Last 30 days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px' }}>
            {[35,52,42,68,48,80,62,88,70,60,78,94].map((h,i) => (
              <div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0', height: `${h}%`, background: i===11 ? 'linear-gradient(to top,#00c896,#6ce5c9)' : 'linear-gradient(to top,#6c63ff,#a78bfa)', opacity: 0.75 }} />
            ))}
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: '8px', padding: '9px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: '9px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>Recent Campaigns</div>
          {[['Weekly Newsletter','Sent','#00c896','42%'],['Product Update','Active','#6c63ff','28%'],['Re-engagement','Draft','#aaa','—']].map(([n,s,c,r]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f5f5f5' }}>
              <div style={{ fontSize: '9px', color: '#333', fontWeight: 500 }}>{n}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '8px', background: `${c}18`, color: c, padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>{s}</div>
                <div style={{ fontSize: '9px', color: '#888', width: '20px', textAlign: 'right' }}>{r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CampaignMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
      <div style={{ background: '#f8f9fc', borderBottom: '1px solid #eee', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '16px', marginLeft: '4px' }} />
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f0f1a' }}>Campaigns</div>
          <div style={{ background: '#6c63ff', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>+ Create</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '12px' }}>
          {[['12','Active','#00c896'],['4','Scheduled','#6c63ff'],['28','Completed','#f59e0b']].map(([n,l,c]) => (
            <div key={l} style={{ background: `${c}10`, border: `1px solid ${c}30`, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 900, color: c }}>{n}</div>
              <div style={{ fontSize: '8px', color: '#888', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
        </div>
        {[
          ['Summer Sale Promo','Sent','42.1%','8.3%','#00c896'],
          ['Onboarding Seq.','Active','38.4%','12.1%','#6c63ff'],
          ['Monthly Digest','Scheduled','—','—','#f59e0b'],
          ['Win-back Series','Draft','—','—','#aaa'],
        ].map(([name,status,open,click,color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '10px', fontWeight: 600, color: '#1a1a2e' }}>{name}</div>
            <div style={{ fontSize: '8px', background: `${color}15`, color, padding: '2px 7px', borderRadius: '4px', fontWeight: 700, width: '60px', textAlign: 'center' }}>{status}</div>
            <div style={{ fontSize: '9px', color: '#888', width: '36px', textAlign: 'right' }}>{open}</div>
            <div style={{ fontSize: '9px', color: '#888', width: '36px', textAlign: 'right' }}>{click}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalyticsMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
      <div style={{ background: '#f8f9fc', borderBottom: '1px solid #eee', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '16px', marginLeft: '4px' }} />
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f0f1a', marginBottom: '12px' }}>Delivery Analytics</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '8px', marginBottom: '12px' }}>
          {[['Delivery Rate','99.1%','#00c896'],['Bounce Rate','0.4%','#ef4444'],['Spam Rate','0.02%','#f59e0b'],['Unsubscribe','0.1%','#6c63ff']].map(([l,v,c]) => (
            <div key={l} style={{ background: `${c}08`, border: `1px solid ${c}20`, borderRadius: '8px', padding: '10px' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: c }}>{v}</div>
              <div style={{ fontSize: '8px', color: '#999', marginTop: '2px' }}>{l}</div>
            </div>
          ))}
        </div>
        {/* area chart */}
        <div style={{ background: '#f8f9fc', borderRadius: '10px', padding: '12px' }}>
          <div style={{ fontSize: '9px', fontWeight: 600, color: '#666', marginBottom: '8px' }}>Opens over time</div>
          <svg viewBox="0 0 260 70" style={{ width: '100%', height: '70px' }}>
            <defs>
              <linearGradient id="areag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6c63ff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6c63ff" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d="M0,55 C20,50 30,30 50,28 C70,26 80,40 100,35 C120,30 130,15 150,12 C170,9 180,20 200,18 C220,16 240,8 260,5 L260,70 L0,70 Z" fill="url(#areag)" />
            <path d="M0,55 C20,50 30,30 50,28 C70,26 80,40 100,35 C120,30 130,15 150,12 C170,9 180,20 200,18 C220,16 240,8 260,5" fill="none" stroke="#6c63ff" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  )
}

function ContactsMockup() {
  return (
    <div style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
      <div style={{ background: '#f8f9fc', borderBottom: '1px solid #eee', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c }} />)}
        <div style={{ flex: 1, background: '#eee', borderRadius: '4px', height: '16px', marginLeft: '4px' }} />
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f0f1a' }}>Contact Lists</div>
          <div style={{ background: '#00c896', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>Import CSV</div>
        </div>
        {[
          ['Newsletter Subscribers','12,480','Active','#00c896'],
          ['Product Users','3,240','Active','#6c63ff'],
          ['Trial Users','890','Active','#f59e0b'],
          ['Churned Users','420','Inactive','#ef4444'],
          ['VIP Customers','156','Active','#00c896'],
        ].map(([name, count, status, color]) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f5f5f5', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: '12px', height: '9px', borderRadius: '2px', background: color, opacity: 0.6 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#1a1a2e' }}>{name}</div>
              <div style={{ fontSize: '8px', color: '#aaa', marginTop: '1px' }}>{count} contacts</div>
            </div>
            <div style={{ fontSize: '8px', background: `${color}15`, color, padding: '2px 7px', borderRadius: '4px', fontWeight: 700 }}>{status}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── hero visual ─── */
function HeroVisual() {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Main app card */}
      <div style={{
        background: '#fff', borderRadius: '20px',
        boxShadow: '0 40px 100px rgba(108,99,255,0.18), 0 10px 30px rgba(0,0,0,0.07)',
        overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)',
      }}>
        {/* Window chrome */}
        <div style={{ background: 'linear-gradient(90deg,#f8f9fc,#f4f4f6)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '7px', borderBottom: '1px solid #ebebed' }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c }} />)}
          <div style={{ flex: 1, height: '18px', background: '#e8e8ea', borderRadius: '5px', marginLeft: '8px' }} />
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#6c63ff', background: 'rgba(108,99,255,0.08)', padding: '3px 10px', borderRadius: '5px' }}>mailrax.app</div>
        </div>

        {/* Layout */}
        <div style={{ display: 'flex', height: '360px' }}>
          {/* Sidebar */}
          <div style={{ width: '52px', background: '#0f0f1a', padding: '14px 9px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '14px', height: '10px', border: '1.5px solid #fff', borderRadius: '2px', opacity: 0.9 }} />
            </div>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ width: '32px', height: '28px', borderRadius: '7px', background: i===1 ? 'rgba(108,99,255,0.3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: i===1 ? '16px' : '12px', height: '2px', borderRadius: '2px', background: i===1 ? '#a78bfa' : 'rgba(255,255,255,0.18)' }} />
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div style={{ flex: 1, background: '#f8f9fc', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>

            {/* Campaign header card */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '13px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f0f1a' }}>Summer Sale Campaign</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '4px' }}>
                  <span className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00c896', display: 'inline-block' }} />
                  <span style={{ fontSize: '10px', color: '#00c896', fontWeight: 600 }}>LIVE · Sending now</span>
                </div>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', borderRadius: '7px', padding: '5px 12px', fontSize: '9px', color: '#fff', fontWeight: 700, letterSpacing: '0.05em' }}>RUNNING</div>
            </div>

            {/* SVG delivery flow */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', flex: 1 }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#aaa', letterSpacing: '0.08em', marginBottom: '10px' }}>DELIVERY FLOW</div>
              <svg width="100%" height="110" viewBox="0 0 380 110" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="srvG" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00c896" /><stop offset="100%" stopColor="#6c63ff" />
                  </linearGradient>
                </defs>

                {/* Sender box */}
                <rect x="4" y="35" width="58" height="40" rx="10" fill="url(#srvG)" />
                <rect x="14" y="43" width="38" height="24" rx="3" fill="rgba(255,255,255,0.22)" />
                <path d="M14,43 L33,58 L52,43" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round" />

                {/* Paths */}
                <path id="hd1" d="M62,47 C130,47 190,22 290,20" fill="none" stroke="rgba(0,200,150,0.5)" strokeWidth="1.5" strokeDasharray="4 4" className="delivery-path" />
                <path id="hd2" d="M62,55 C130,55 190,55 290,55" fill="none" stroke="rgba(108,99,255,0.5)" strokeWidth="1.5" strokeDasharray="4 4" className="delivery-path" />
                <path id="hd3" d="M62,63 C130,63 190,88 290,90" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="1.5" strokeDasharray="4 4" className="delivery-path" />

                {/* Traveling dots */}
                <circle r="4.5" fill="#00c896" opacity="0.95">
                  <animateMotion dur="1.9s" repeatCount="indefinite"><mpath href="#hd1"/></animateMotion>
                </circle>
                <circle r="4.5" fill="#6c63ff" opacity="0.95">
                  <animateMotion dur="1.9s" begin="0.63s" repeatCount="indefinite"><mpath href="#hd2"/></animateMotion>
                </circle>
                <circle r="4.5" fill="#f59e0b" opacity="0.95">
                  <animateMotion dur="1.9s" begin="1.26s" repeatCount="indefinite"><mpath href="#hd3"/></animateMotion>
                </circle>

                {/* Inbox 1 — teal */}
                <g transform="translate(292,6)">
                  <rect width="42" height="28" rx="7" fill="#e8f5f1" stroke="#00c89625" strokeWidth="1"/>
                  <path d="M7,7 L21,18 L35,7" fill="none" stroke="#00c896" strokeWidth="1.2"/>
                  <path d="M7,7 h28 v14 h-28 z" fill="none" stroke="#00c89640" strokeWidth="0.8"/>
                  <g className="check-icon chk1">
                    <circle cx="49" cy="14" r="8" fill="#00c896"/>
                    <path d="M45,14 L48,17 L53,10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                </g>
                {/* Inbox 2 — purple */}
                <g transform="translate(292,41)">
                  <rect width="42" height="28" rx="7" fill="#ede9ff" stroke="#6c63ff25" strokeWidth="1"/>
                  <path d="M7,7 L21,18 L35,7" fill="none" stroke="#6c63ff" strokeWidth="1.2"/>
                  <path d="M7,7 h28 v14 h-28 z" fill="none" stroke="#6c63ff40" strokeWidth="0.8"/>
                  <g className="check-icon chk2">
                    <circle cx="49" cy="14" r="8" fill="#6c63ff"/>
                    <path d="M45,14 L48,17 L53,10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                </g>
                {/* Inbox 3 — amber */}
                <g transform="translate(292,76)">
                  <rect width="42" height="28" rx="7" fill="#fef3e2" stroke="#f59e0b25" strokeWidth="1"/>
                  <path d="M7,7 L21,18 L35,7" fill="none" stroke="#f59e0b" strokeWidth="1.2"/>
                  <path d="M7,7 h28 v14 h-28 z" fill="none" stroke="#f59e0b40" strokeWidth="0.8"/>
                  <g className="check-icon chk3">
                    <circle cx="49" cy="14" r="8" fill="#f59e0b"/>
                    <path d="M45,14 L48,17 L53,10" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </g>
                </g>
              </svg>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[['24.5K','Delivered','#00c896'],['34.2%','Open Rate','#6c63ff'],['0.02%','Spam','#f59e0b']].map(([v,l,c]) => (
                <div key={l} style={{ flex: 1, background: '#fff', borderRadius: '10px', padding: '10px 8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 900, color: c, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: '8px', color: '#aaa', marginTop: '3px', fontWeight: 500 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div style={{ background: '#fff', borderRadius: '10px', padding: '11px 14px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', color: '#888', fontWeight: 600 }}>Sending progress</span>
                <span style={{ fontSize: '9px', color: '#00c896', fontWeight: 700 }}>78% complete</span>
              </div>
              <div style={{ height: '5px', background: '#f0f0f5', borderRadius: '3px', overflow: 'hidden' }}>
                <div className="progress-fill" style={{ height: '100%', background: 'linear-gradient(90deg,#00c896,#6c63ff)', borderRadius: '3px' }} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── data ─── */
const comparisonFeatures = [
  'Compliance-first onboarding',
  'Send from your own domain',
  'Real-time delivery logs',
  'Anti-abuse monitoring',
  'Opt-in enforcement',
  'Domain authentication (SPF/DKIM)',
  'Spam complaint monitoring',
]

const testimonials = [
  { name: 'Rahul Mehta', role: 'CTO, GrowthStack', text: 'MailRax\'s compliance-first approach is exactly what we needed. Setup was smooth, deliverability is excellent, and the delivery logs give us full visibility into every email.', stars: 5 },
  { name: 'Priya Sharma', role: 'Marketing Head, Zevo', text: 'We switched from a generic bulk tool and immediately saw better inbox rates. The domain verification process is stricter but that\'s exactly why it works.', stars: 5 },
  { name: 'Ankur Joshi', role: 'Founder, SendFlow', text: 'As an agency managing email for multiple clients, MailRax gives us the multi-sender domain support we need. The logs are invaluable for troubleshooting.', stars: 5 },
]

const integrations = ['SendGrid', 'Supabase', 'Postmark', 'Twilio', 'Stripe', 'Zapier', 'Shopify', 'HubSpot', 'Slack', 'GitHub', 'Vercel', 'AWS']

/* ─── main component ─── */
export default function LandingPage() {
  const { pathname } = useLocation()
  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: '#0f0f1a', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>
      <style>{`
        @keyframes floatY {
          0%,100% { transform: perspective(1200px) rotateY(-6deg) rotateX(3deg) translateY(0px); }
          50% { transform: perspective(1200px) rotateY(-6deg) rotateX(3deg) translateY(-10px); }
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
        @keyframes heroUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes orbDrift {
          0%,100% { transform: scale(1) translate(0,0); }
          33%  { transform: scale(1.08) translate(12px,-16px); }
          66%  { transform: scale(0.95) translate(-8px,10px); }
        }
        @keyframes floatCard {
          0%,100% { transform: translateY(0); }
          50%  { transform: translateY(-7px); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes countUp {
          from { opacity: 0; transform: scale(0.88); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes progressGrow {
          from { width: 0%; }
          to   { width: 78%; }
        }
        @keyframes dashMove {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -20; }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        .mock-float      { animation: floatY 5s ease-in-out infinite; }
        .dot-pulse       { animation: pulse-dot 1.5s ease-in-out infinite; }
        .nav-link:hover  { color: #0f0f1a !important; }
        .delivery-path   { animation: dashMove 0.5s linear infinite; }
        .progress-fill   { animation: progressGrow 1.6s cubic-bezier(.4,0,.2,1) 0.6s both; }
        .check-icon      { animation: checkPop 0.4s ease both; opacity: 0; }
        .chk1 { animation-delay: 0.9s; }
        .chk2 { animation-delay: 1.5s; }
        .chk3 { animation-delay: 2.1s; }

        .hero-badge  { animation: heroUp 0.55s ease 0.05s both; }
        .hero-line1  { animation: heroUp 0.55s ease 0.18s both; }
        .hero-line2  { animation: heroUp 0.55s ease 0.30s both; }
        .hero-sub    { animation: heroUp 0.55s ease 0.44s both; }
        .hero-ctas   { animation: heroUp 0.55s ease 0.56s both; }
        .hero-trust  { animation: heroUp 0.55s ease 0.68s both; }
        .hero-right  { animation: heroUp 0.75s ease 0.30s both; }

        .orb1 { animation: orbDrift  9s ease-in-out infinite; }
        .orb2 { animation: orbDrift 11s ease-in-out 2s infinite; }
        .orb3 { animation: orbDrift  8s ease-in-out 1s infinite; }

        .fc1  { animation: heroUp 0.5s ease 1.0s both, floatCard 4.5s ease-in-out 1.5s infinite; }
        .fc2  { animation: heroUp 0.5s ease 1.2s both, floatCard 5.5s ease-in-out 2.0s infinite; }
        .fc3  { animation: heroUp 0.5s ease 1.1s both, floatCard 4.0s ease-in-out 1.8s infinite; }

        .gradient-shimmer {
          background: linear-gradient(90deg, #00c896 0%, #6c63ff 40%, #a78bfa 60%, #00c896 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite;
        }
        .cta-glow:hover  { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(108,99,255,0.45) !important; }
        .cta-ghost:hover { transform: translateY(-2px); background: #fff !important; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: '64px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(108,99,255,0.3)' }}>
            <Zap size={15} color="#fff" fill="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '18px', color: '#0f0f1a' }}>MailRax</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {[['Home','/'],['About','/about'],['Pricing','/pricing'],['Contact','/contact']].map(([l,t]) => {
            const active = pathname === t
            return (
            <Link key={t} to={t} style={{ color: active ? '#0f0f1a' : '#666', textDecoration: 'none', fontSize: '14px', fontWeight: active ? 600 : 500, padding: '7px 14px', borderRadius: '8px', background: active ? 'rgba(0,0,0,0.05)' : 'transparent', transition: 'color 0.15s' }}>{l}</Link>
            )
          })}
          <Link to="/login" style={{ color: '#666', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 16px' }}>Sign In</Link>
          <Link to="/pricing" style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: '14px', fontWeight: 700, padding: '9px 22px', borderRadius: '9px', boxShadow: '0 4px 14px rgba(108,99,255,0.3)' }}>
            Apply for Access
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '88px 48px 0', background: 'linear-gradient(150deg,#f0f4ff 0%,#fdf8ff 45%,#f0fff8 100%)', position: 'relative', overflow: 'hidden', minHeight: '700px' }}>

        {/* Animated bg orbs */}
        <div className="orb1" style={{ position: 'absolute', top: '-120px', left: '8%', width: '520px', height: '520px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(108,99,255,0.13),transparent 68%)', pointerEvents: 'none' }} />
        <div className="orb2" style={{ position: 'absolute', top: '30px', right: '4%', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(0,200,150,0.11),transparent 68%)', pointerEvents: 'none' }} />
        <div className="orb3" style={{ position: 'absolute', bottom: '-60px', left: '38%', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.07),transparent 68%)', pointerEvents: 'none' }} />

        {/* Subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(108,99,255,0.035) 1px,transparent 1px),linear-gradient(90deg,rgba(108,99,255,0.035) 1px,transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '72px', alignItems: 'center', position: 'relative' }}>

          {/* ── Left copy ── */}
          <div>
            {/* Badge */}
            <div className="hero-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', padding: '6px 16px', marginBottom: '28px', fontSize: '11px', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.08em' }}>
              <span className="dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6c63ff', display: 'inline-block' }} />
              SAAS EMAIL DELIVERY PLATFORM
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(36px,4.2vw,64px)', lineHeight: '1.08', marginBottom: '22px', letterSpacing: '-0.025em', color: '#0f0f1a' }}>
              <span className="hero-line1" style={{ display: 'block' }}>Send Emails That</span>
              <span className="hero-line2" style={{ display: 'block' }}>
                Actually{' '}
                <span className="gradient-shimmer">Reach the Inbox</span>
              </span>
            </h1>

            {/* Sub */}
            <p className="hero-sub" style={{ fontSize: '17px', color: '#555', lineHeight: '1.82', marginBottom: '36px', maxWidth: '470px' }}>
              Compliance-first bulk email built for serious senders. Own your domain, enforce opt-ins, and get full visibility into every delivery — before issues become disasters.
            </p>

            {/* CTAs */}
            <div className="hero-ctas" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <Link to="/pricing" className="cta-glow" style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '14px 32px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 8px 28px rgba(108,99,255,0.32)', transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}>
                Apply for Access <ArrowRight size={16} />
              </Link>
              <Link to="/about" className="cta-ghost" style={{ background: 'rgba(255,255,255,0.75)', border: '1.5px solid rgba(0,0,0,0.1)', color: '#333', textDecoration: 'none', fontSize: '15px', fontWeight: 600, padding: '14px 28px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '8px', backdropFilter: 'blur(10px)', transition: 'transform 0.2s ease, background 0.2s ease' }}>
                See How It Works <ChevronRight size={16} />
              </Link>
            </div>

            {/* Trust */}
            <div className="hero-trust" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
              </div>
              <span style={{ fontSize: '13px', color: '#888' }}><strong style={{ color: '#0f0f1a' }}>4.9/5</strong> from verified customers</span>
              <div style={{ width: '1px', height: '16px', background: '#ddd' }} />
              {['GDPR Ready','CAN-SPAM','CASL'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={12} color="#00c896" />
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right mockup + floating cards ── */}
          <div className="hero-right" style={{ position: 'relative', paddingBottom: '32px' }}>
            <div className="mock-float">
              <HeroVisual />
            </div>

            {/* Floating card 1 — delivered */}
            <div className="fc1" style={{ position: 'absolute', top: '18px', right: '-28px', background: '#fff', borderRadius: '14px', padding: '11px 15px', boxShadow: '0 12px 40px rgba(0,0,0,0.13)', border: '1px solid rgba(0,200,150,0.22)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '192px', zIndex: 10 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(0,200,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={16} color="#00c896" />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f0f1a' }}>24,512 Delivered</div>
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>just now · 0 bounced</div>
              </div>
            </div>

            {/* Floating card 2 — open rate */}
            <div className="fc2" style={{ position: 'absolute', bottom: '54px', left: '-28px', background: '#fff', borderRadius: '14px', padding: '11px 15px', boxShadow: '0 12px 40px rgba(0,0,0,0.13)', border: '1px solid rgba(108,99,255,0.22)', display: 'flex', alignItems: 'center', gap: '10px', minWidth: '172px', zIndex: 10 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(108,99,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={16} color="#6c63ff" />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f0f1a' }}>Open Rate 34.2%</div>
                <div style={{ fontSize: '10px', color: '#00c896', fontWeight: 600, marginTop: '2px' }}>↑ +3.1% this week</div>
              </div>
            </div>

            {/* Floating card 3 — spam shield */}
            <div className="fc3" style={{ position: 'absolute', top: '44%', right: '-36px', background: '#fff', borderRadius: '14px', padding: '11px 15px', boxShadow: '0 12px 40px rgba(0,0,0,0.13)', border: '1px solid rgba(245,158,11,0.22)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={16} color="#f59e0b" />
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f0f1a' }}>99.1% Delivery</div>
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '2px' }}>Spam rate: 0.02%</div>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ── Stats ── */}
      <section style={{ padding: '72px 48px', background: '#fff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <Fade>
            <p style={{ textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#aaa', letterSpacing: '0.08em', marginBottom: '48px' }}>
              TRUSTED EMAIL DELIVERY PLATFORM FOR COMPLIANT BUSINESSES
            </p>
          </Fade>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '24px' }}>
            {[['10M+','Emails Delivered','#6c63ff'],['1,000+','Businesses Onboarded','#00c896'],['99.9%','Uptime SLA','#f59e0b'],['< 2s','Avg. Send Latency','#ef4444'],['100%','Opt-in Required','#8b5cf6']].map(([v,l,c],i) => (
              <Fade key={l} delay={i*0.08}>
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 900, color: c, lineHeight: 1, marginBottom: '8px' }}>{v}</div>
                  <div style={{ fontSize: '13px', color: '#888', fontWeight: 500 }}>{l}</div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature 1 — Campaign Management ── */}
      <section style={{ padding: '80px 48px', background: '#eef2ff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <Fade dir="left">
            <CampaignMockup />
          </Fade>
          <Fade dir="right">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px', fontSize: '11px', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.07em' }}>
              CAMPAIGN MANAGEMENT
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: '#0f0f1a', marginBottom: '16px', lineHeight: '1.2' }}>
              Manage campaigns at scale with full visibility
            </h2>
            <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.85', marginBottom: '28px' }}>
              Create, schedule, and monitor email campaigns from one clean interface. Track delivery status, open rates, and click rates in real time — with per-email log access for troubleshooting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {['Campaign scheduling with timezone support','Per-campaign delivery and open rate tracking','Automated bounce and complaint handling','Multi-sender identity management'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(108,99,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <CheckCircle size={12} color="#6c63ff" />
                  </div>
                  <span style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#6c63ff', textDecoration: 'none' }}>
              Explore campaigns <ArrowRight size={14} />
            </Link>
          </Fade>
        </div>
      </section>

      {/* ── Feature 2 — Analytics ── */}
      <section style={{ padding: '80px 48px', background: '#fff9f0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <Fade dir="left">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px', fontSize: '11px', fontWeight: 700, color: '#d97706', letterSpacing: '0.07em' }}>
              ANALYTICS + DELIVERABILITY
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: '#0f0f1a', marginBottom: '16px', lineHeight: '1.2' }}>
              Real-time delivery analytics with zero blind spots
            </h2>
            <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.85', marginBottom: '28px' }}>
              Track every email's journey from send to inbox. See delivery rates, open rates, and failure reasons in real time. Know exactly what's working and fix what isn't — before it affects your sender reputation.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {['Per-email delivery status and failure reason','Real-time open rate and click tracking','Bounce and spam complaint rate monitoring','Domain reputation health indicators'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <CheckCircle size={12} color="#d97706" />
                  </div>
                  <span style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#d97706', textDecoration: 'none' }}>
              See analytics <ArrowRight size={14} />
            </Link>
          </Fade>
          <Fade dir="right">
            <AnalyticsMockup />
          </Fade>
        </div>
      </section>

      {/* ── Feature 3 — Contact Management ── */}
      <section style={{ padding: '80px 48px', background: '#f0fff8' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <Fade dir="left">
            <ContactsMockup />
          </Fade>
          <Fade dir="right">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px', fontSize: '11px', fontWeight: 700, color: '#059669', letterSpacing: '0.07em' }}>
              CONTACT MANAGEMENT
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: '#0f0f1a', marginBottom: '16px', lineHeight: '1.2' }}>
              Manage your audience with precision
            </h2>
            <p style={{ fontSize: '15px', color: '#555', lineHeight: '1.85', marginBottom: '28px' }}>
              Import opted-in contacts via CSV, segment them into targeted lists, and keep your database clean with built-in deduplication, unsubscribe tracking, and bounce removal.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {['CSV import with field mapping','Multiple contact lists with tagging','Automatic unsubscribe and bounce removal','Subscriber status and opt-in tracking'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                    <CheckCircle size={12} color="#059669" />
                  </div>
                  <span style={{ fontSize: '14px', color: '#555', lineHeight: '1.6' }}>{f}</span>
                </div>
              ))}
            </div>
            <Link to="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#059669', textDecoration: 'none' }}>
              Manage contacts <ArrowRight size={14} />
            </Link>
          </Fade>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section style={{ padding: '80px 48px', background: '#fff' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Fade>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.18)', borderRadius: '20px', padding: '5px 14px', marginBottom: '16px', fontSize: '11px', fontWeight: 700, color: '#6c63ff', letterSpacing: '0.07em' }}>
                WHY MAILRAX
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: '#0f0f1a', marginBottom: '12px' }}>
                Why teams switch to MailRax
              </h2>
              <p style={{ fontSize: '15px', color: '#888', maxWidth: '480px', margin: '0 auto' }}>
                Most platforms prioritize volume over responsibility. MailRax is built differently.
              </p>
            </div>
          </Fade>

          <Fade delay={0.1}>
            <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
              {/* header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 160px', background: '#f8f9fc', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ padding: '16px 24px', fontSize: '12px', fontWeight: 700, color: '#888' }}>Feature</div>
                {[['MailRax','linear-gradient(135deg,#00c896,#6c63ff)'],['Other ESPs','#ddd'],['Shared Tools','#ddd']].map(([l,bg]) => (
                  <div key={l} style={{ padding: '16px 0', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: l==='MailRax' ? '#fff' : '#888', background: l==='MailRax' ? bg : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {l==='MailRax' && <Zap size={12} color="#fff" style={{ marginRight: 6 }} />}{l}
                  </div>
                ))}
              </div>
              {comparisonFeatures.map((f, i) => (
                <div key={f} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 160px 160px', borderBottom: i < comparisonFeatures.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none', background: i%2===0 ? '#fff' : '#fafafa' }}>
                  <div style={{ padding: '14px 24px', fontSize: '14px', color: '#333', fontWeight: 500 }}>{f}</div>
                  <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,200,150,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle size={13} color="#00c896" />
                    </div>
                  </div>
                  {[i < 3 ? '~' : '✗', '✗'].map((sym, j) => (
                    <div key={j} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: sym==='~' ? '#f59e0b' : '#ef4444' }}>{sym}</div>
                  ))}
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* ── Compliance dark strip ── */}
      <section style={{ padding: '80px 48px', background: '#0f0f1a', color: '#fff' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', gap: '64px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Fade dir="left" style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0,200,150,0.12)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: '20px', padding: '5px 14px', marginBottom: '20px', fontSize: '11px', fontWeight: 700, color: '#00c896', letterSpacing: '0.07em' }}>
              COMPLIANCE-FIRST
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: '#fff', marginBottom: '16px', lineHeight: '1.2' }}>
              The only platform with compliance{' '}
              <span style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                built in from day one
              </span>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.85', marginBottom: '28px' }}>
              Before any account can send, we verify your domain, review your use case, and confirm you're sending only to opted-in recipients. This protects your reputation — and every sender on the platform.
            </p>
            <Link to="/anti-spam-policy" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 700, color: '#00c896', textDecoration: 'none' }}>
              Read our Anti-Spam Policy <ArrowRight size={14} />
            </Link>
          </Fade>
          <Fade dir="right" style={{ flex: '1 1 280px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {['CAN-SPAM Compliant','GDPR Ready','CASL Compliant','SPF + DKIM Auth','Double Opt-in Support','Complaint Monitoring'].map((item, i) => (
              <div key={item} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={14} color="#00c896" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{item}</span>
              </div>
            ))}
          </Fade>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section style={{ padding: '80px 48px', background: '#f8f9fc' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <Fade>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(24px,3vw,38px)', color: '#0f0f1a', marginBottom: '12px' }}>
                See how customers drive results with MailRax
              </h2>
              <p style={{ fontSize: '15px', color: '#888' }}>Businesses that take email delivery seriously.</p>
            </div>
          </Fade>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px' }}>
            {testimonials.map(({ name, role, text, stars }, i) => (
              <Fade key={name} delay={i*0.1}>
                <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)', height: '100%', boxSizing: 'border-box' }}>
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                    {[...Array(stars)].map((_,j) => <Star key={j} size={15} fill="#f59e0b" color="#f59e0b" />)}
                  </div>
                  <p style={{ fontSize: '14px', color: '#555', lineHeight: '1.8', marginBottom: '20px' }}>"{text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#00c896,#6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff' }}>{name[0]}</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f0f1a' }}>{name}</div>
                      <div style={{ fontSize: '12px', color: '#aaa' }}>{role}</div>
                    </div>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '80px 48px', background: 'linear-gradient(135deg,#0f1035 0%,#1a1040 50%,#0f1a35 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-50%)', width: '600px', height: '400px', background: 'radial-gradient(ellipse,rgba(108,99,255,0.2),transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', right: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle,rgba(0,200,150,0.15),transparent 70%)', pointerEvents: 'none' }} />
        <Fade style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '6px 16px', marginBottom: '24px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em' }}>
            <Mail size={11} /> START SENDING TODAY
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(28px,4vw,50px)', color: '#fff', marginBottom: '16px', letterSpacing: '-0.01em' }}>
            Send better emails.{' '}
            <span style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Start today.
            </span>
          </h2>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.8', marginBottom: '36px' }}>
            Apply for access, verify your domain, and start sending compliant email campaigns — in minutes.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/pricing" style={{ background: 'linear-gradient(135deg,#00c896,#6c63ff)', color: '#fff', textDecoration: 'none', fontSize: '15px', fontWeight: 700, padding: '14px 36px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 28px rgba(0,200,150,0.3)' }}>
              Apply for Access <ArrowRight size={16} />
            </Link>
            <Link to="/pricing" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', fontSize: '14px', fontWeight: 600, padding: '14px 28px', borderRadius: '10px' }}>
              View Plans
            </Link>
          </div>
        </Fade>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0a0a14', padding: '52px 48px 32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '40px', marginBottom: '48px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={13} color="#fff" fill="#fff" />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: '#fff' }}>MailRax</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.75' }}>SaaS email delivery for compliant businesses.</p>
            </div>
            {[
              ['Platform', [['Pricing','/pricing'],['About','/about'],['Contact','/contact']]],
              ['Legal', [['Privacy Policy','/privacy-policy'],['Terms of Service','/terms-of-service'],['Anti-Spam Policy','/anti-spam-policy'],['Acceptable Use','/acceptable-use-policy']]],
            ].map(([heading, links]) => (
              <div key={heading}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>{heading}</div>
                {links.map(([l,t]) => (
                  <Link key={t} to={t} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '10px', textDecoration: 'none' }}>{l}</Link>
                ))}
              </div>
            ))}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Compliance</div>
              {['CAN-SPAM','GDPR','CASL','SPF & DKIM'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                  <CheckCircle size={12} color="#00c896" />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>© {new Date().getFullYear()} MailRax. All rights reserved.</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Compliant email delivery for serious senders.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
