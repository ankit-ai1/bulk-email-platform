import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import { BrandLockup } from './Brand'

const navLinks = [
  ['Home', '/home'],
  ['Features', '/features'],
  ['About', '/about'],
  ['Pricing', '/pricing'],
  ['Contact', '/contact'],
]

export default function SiteNavbar() {
  const { pathname, hash } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = to => (pathname === to && !hash) || (to === '/home' && pathname === '/' && !hash)

  return (
    <header className={`site-nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="site-nav-inner">
        <Link to="/home" className="site-nav-brand" onClick={() => setOpen(false)} aria-label="Synerax Mail home"><BrandLockup /></Link>

        <nav className="site-nav-menu" aria-label="Main">
          {navLinks.map(([label, to]) => <Link key={to} to={to} className={isActive(to) ? 'active' : ''}>{label}</Link>)}
        </nav>

        <div className="site-nav-actions">
          <Link to="/login" className="site-nav-signin">Sign in</Link>
          <Link to="/apply" className="site-btn site-btn-primary site-btn-sm">Request access <ArrowRight size={14} /></Link>
        </div>

        <button className="site-nav-toggle" onClick={() => setOpen(v => !v)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="site-nav-drawer">
          {navLinks.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>)}
          <Link to="/login" onClick={() => setOpen(false)}>Sign in</Link>
          <Link to="/apply" className="site-btn site-btn-primary" onClick={() => setOpen(false)}>Request access</Link>
        </div>
      )}
    </header>
  )
}
