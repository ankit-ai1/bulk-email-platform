import { Link } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'

const LOGO = 'https://res.cloudinary.com/dtg3lepr4/image/upload/v1780738217/WhatsApp_Image_2026-06-06_at_2.50.11_PM_1_nrubcm.jpg'

export default function SiteFooter() {
  return (
    <footer className="pub-pad" style={{ background: '#0a0a14', paddingTop: '52px', paddingBottom: '32px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* Top grid */}
        <div className="pub-footer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '40px', marginBottom: '48px' }}>

          {/* Brand */}
          <div>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px', textDecoration: 'none' }}>
              <img src={LOGO} alt="" style={{ height: '34px', width: 'auto', objectFit: 'contain' }} />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: '#fff' }}>MailRax</span>
            </Link>
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
