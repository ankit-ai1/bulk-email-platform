import { LOGO_URL, LOGO_URL_WHITE } from '../../lib/logo'

/** Compact mark for tight spaces: an M that doubles as an envelope, its fold in Synerax cyan. */
export function MailMark({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      <rect width="40" height="40" rx="11" fill="#173d5a" />
      <path d="M10 29V12M30 29V12" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      <path d="M10 12 20 21.5 30 12" stroke="#00b9ff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

/** Synerax Mail: the company wordmark with the product word set beside it. */
export function BrandLockup({ onDark = false, size = 'md' }) {
  return (
    <span className={`brand-lockup ${onDark ? 'on-dark' : ''} ${size === 'lg' ? 'lg' : ''}`} role="img" aria-label="Synerax Mail">
      <span className="brand-rail-mark"><MailMark /></span>
      <span className="brand-lockup-text">
        <img src={onDark ? LOGO_URL_WHITE : LOGO_URL} alt="" />
        <span className="brand-pill">Mail</span>
      </span>
    </span>
  )
}
