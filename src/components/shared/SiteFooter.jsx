import { Link } from 'react-router-dom'
import { Zap, CheckCircle } from 'lucide-react'

export default function SiteFooter() {
  return (
    <footer style={{ background: '#0a0a14', padding: '52px 48px 32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Top grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '40px', marginBottom: '48px' }}>

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'linear-gradient(135deg,#00c896,#6c63ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={13} color="#fff" fill="#fff" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: '#fff' }}>MailRax</span>
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.75', maxWidth: '200px' }}>
              SaaS email delivery for compliant businesses.
            </p>
          </div>

          {/* Platform */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Platform</div>
            {[['Home','/'],['About','/about'],['Pricing','/pricing'],['Contact','/contact']].map(([l,t]) => (
              <Link key={t} to={t} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '10px', textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>

          {/* Legal */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Legal</div>
            {[
              ['Privacy Policy','/privacy-policy'],
              ['Terms of Service','/terms-of-service'],
              ['Anti-Spam Policy','/anti-spam-policy'],
              ['Acceptable Use','/acceptable-use-policy'],
            ].map(([l,t]) => (
              <Link key={t} to={t} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '10px', textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>

          {/* Compliance */}
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

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>© {new Date().getFullYear()} MailRax. All rights reserved.</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Compliant email delivery for serious senders.</p>
        </div>

      </div>
    </footer>
  )
}
