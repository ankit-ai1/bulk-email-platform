import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Mail, MapPin } from 'lucide-react'
import { BrandLockup } from './Brand'

const COLUMNS = [
  ['Product', [['Features', '/features'], ['Pricing', '/pricing'], ['Request access', '/apply'], ['Sign in', '/login']]],
  ['Company', [['About us', '/about'], ['Contact', '/contact']]],
  ['Legal', [['Privacy policy', '/privacy-policy'], ['Terms of service', '/terms-of-service'], ['Anti-spam policy', '/anti-spam-policy'], ['Acceptable use', '/acceptable-use-policy']]],
]

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="sf-inner">
        <div className="sf-glow" aria-hidden="true"><span /></div>
        <div className="sf-cta">
          <h2>Great email is a people business.<br />We keep it that way.</h2>
          <div>
            <Link to="/apply" className="site-btn sf-btn-light">Request access <ArrowRight size={15} /></Link>
            <Link to="/contact" className="site-btn sf-btn-dark">Talk to us <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div className="sf-top">
          <div className="sf-brand">
            <Link to="/home" aria-label="Synerax Mail home"><BrandLockup onDark /></Link>
            <p>Synerax Mail brings campaigns, sending accounts, replies and results into one secure workspace for your whole company.</p>
            <a href="mailto:hr@synerax.in" className="sf-contact"><Mail size={16} /> hr@synerax.in</a>
            <span className="sf-contact"><MapPin size={16} /> Noida, India</span>
          </div>
          {COLUMNS.map(([title, links]) => (
            <nav key={title} className="sf-col" aria-label={title}>
              <h2>{title}</h2>
              {links.map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}
            </nav>
          ))}
        </div>

        {/* The wrapper is what gets observed: a fully clipped element never counts as in view. */}
        <motion.div className="sf-giant" role="img" aria-label="Synerax" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
          <img src="/synerax-outline.png" alt="" />
          <motion.div className="sf-giant-fill" variants={{ hidden: { clipPath: 'inset(0 100% 0 0)' }, show: { clipPath: 'inset(0 39% 0 0)' } }} transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }} />
        </motion.div>

        <div className="sf-bottom">
          <span>© {new Date().getFullYear()} Synerax. All rights reserved.</span>
          <span>Permission-based email, by design.</span>
        </div>
      </div>
    </footer>
  )
}
