import { useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  ChevronsLeft, ChevronsRight, Mail, Search, LayoutDashboard, Send, Users, FileText, BarChart3, Settings, LogOut, Menu, Sun, Moon, Globe, Bell, Building2,
  CalendarDays, CreditCard, LifeBuoy, ScrollText, Inbox, Workflow, Server, UserCog, Gauge, Contact2, ClipboardList, Landmark,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { BrandLockup } from './Brand'
import { useTheme } from '../../hooks/useTheme'
import { supabase } from '../../lib/supabase'
import { format, formatDistanceToNow } from 'date-fns'

const SUPER_NAV = [
  { group: 'Platform', items: [
    { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
    { to: '/admin/companies', icon: Building2, label: 'Clients' },
    { to: '/admin/enquiries', icon: Mail, label: 'Enquiries' },
    { to: '/admin/applications', icon: ClipboardList, label: 'Applications' },
  ] },
  { group: 'Commercial', items: [
    { to: '/admin/plans', icon: CreditCard, label: 'Plans' },
    { to: '/admin/requests', icon: Gauge, label: 'Credit requests' },
    { to: '/admin/invoices', icon: Landmark, label: 'Invoices' },
  ] },
  { group: 'Operations', items: [
    { to: '/support', icon: LifeBuoy, label: 'Support tickets' },
    { to: '/audit', icon: ScrollText, label: 'Audit log' },
    { to: '/settings', icon: Settings, label: 'My account' },
  ] },
]

function tenantNav({ can, isClientAdmin, hasFeature }) {
  const groups = [
    { group: 'Workspace', items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true }] },
    { group: 'Engage', items: [
      can('campaigns') && { to: '/campaigns', icon: Send, label: 'Campaigns' },
      can('campaigns') && { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
      can('automation') && hasFeature('automation') && { to: '/automations', icon: Workflow, label: 'Automations' },
      can('templates') && { to: '/templates', icon: FileText, label: 'Templates' },
      can('inbox') && hasFeature('inbox') && { to: '/inbox', icon: Inbox, label: 'Inbox' },
    ] },
    { group: 'Audience', items: [
      can('contacts') && { to: '/crm', icon: Contact2, label: 'All contacts' },
      can('contacts') && { to: '/contacts', icon: Users, label: 'Lists & imports' },
    ] },
    { group: 'Insights', items: [
      can('analytics') && { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      can('analytics') && { to: '/logs', icon: ScrollText, label: 'Send logs' },
    ] },
    { group: 'Organization', items: [
      isClientAdmin && { to: '/infrastructure', icon: Server, label: 'Domains & SMTP' },
      isClientAdmin && { to: '/team', icon: UserCog, label: 'Team' },
      isClientAdmin && { to: '/usage', icon: Gauge, label: 'Plan & usage' },
      can('support') && { to: '/support', icon: LifeBuoy, label: 'Support' },
      isClientAdmin && { to: '/organization', icon: Building2, label: 'Organization' },
      { to: '/settings', icon: Settings, label: 'My account' },
    ] },
  ]
  return groups.map(g => ({ ...g, items: g.items.filter(Boolean) })).filter(g => g.items.length)
}

const ROLE_LABEL = { super_admin: 'Synerax admin', client_admin: 'Client admin', campaign_manager: 'Campaign manager' }

function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])

  useEffect(() => {
    const load = () => supabase.from('notifications').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20).then(({ data }) => setItems(data || []))
    load()
    const timer = setInterval(load, 60000)
    return () => clearInterval(timer)
  }, [user.id])

  const unread = items.filter(n => !n.read_at).length

  async function select(n) {
    setOpen(false)
    if (!n.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id)
      setItems(list => list.map(x => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
    }
    if (n.link) navigate(n.link)
  }

  return (
    <>
      <button className="app-tool ui-bell" onClick={() => setOpen(o => !o)} aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell size={17} />{unread > 0 && <span className="ui-bell-count">{unread}</span>}
      </button>
      {open && (
        <div className="ui-popover">
          {items.length === 0 ? <div className="ui-empty ui-muted" style={{ textAlign: 'center' }}>You're all caught up</div> : items.map(n => (
            <button key={n.id} className={`ui-popover-item ${n.read_at ? '' : 'unread'}`} onClick={() => select(n)}>
              <strong>{n.title}</strong>{n.body}
              <div className="ui-muted">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function UserMenu({ initials, name, email, role, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDown = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className="user-menu" ref={ref}>
      <button className="app-topbar-user" onClick={() => setOpen(o => !o)} aria-label="Account menu" aria-haspopup="menu" aria-expanded={open}>{initials}</button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <div className="user-menu-head">
            <span className="app-topbar-user" aria-hidden="true">{initials}</span>
            <div>
              <strong>{name}</strong>
              <small>{email}</small>
              <em>{role}</em>
            </div>
          </div>
          <Link to="/settings" role="menuitem" onClick={() => setOpen(false)}><Settings size={16} /> My account</Link>
          <button role="menuitem" className="danger" onClick={onSignOut}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  )
}

/** Jump to any page this role can open. */
function PageSearch({ items }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const matches = query.trim() ? items.filter(i => i.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : items.slice(0, 6)

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = to => { setQuery(''); setOpen(false); inputRef.current?.blur(); navigate(to) }

  return (
    <div className="app-search">
      <Search size={15} />
      <input ref={inputRef} aria-label="Jump to a page" placeholder="Jump to a page…" value={query} onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={e => { if (e.key === 'Enter' && matches[0]) go(matches[0].to); if (e.key === 'Escape') { setOpen(false); e.target.blur() } }} />
      <kbd>Ctrl K</kbd>
      {open && matches.length > 0 && (
        <div className="app-search-menu">
          {matches.map(({ to, label, icon: Icon }) => <button key={to} onMouseDown={e => e.preventDefault()} onClick={() => go(to)}><Icon size={15} /> {label}</button>)}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const auth = useAuth()
  const { user, signOut, profile, role, isSuperAdmin, isClientAdmin, organization, subscription, planName } = auth
  const { pathname } = useLocation()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('sidebar') === 'rail' } catch { return false } })
  const toggleCollapsed = () => setCollapsed(c => {
    try { localStorage.setItem('sidebar', c ? 'full' : 'rail') } catch { /* stays for this visit */ }
    return !c
  })

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const name = profile?.full_name || user?.email || ''
  const initials = name.split(/[\s@]/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
  const brand = organization?.brand_name || organization?.name
  const nav = isSuperAdmin ? SUPER_NAV : tenantNav(auth)
  const [newEnquiries, setNewEnquiries] = useState(0)
  useEffect(() => {
    if (!isSuperAdmin) return undefined
    const load = () => supabase.from('applications').select('id', { count: 'exact', head: true }).eq('plan', 'contact').eq('status', 'pending')
      .then(({ count }) => setNewEnquiries(count || 0))
    load()
    const timer = setInterval(load, 60000)
    window.addEventListener('enquiries-changed', load)
    return () => { clearInterval(timer); window.removeEventListener('enquiries-changed', load) }
  }, [isSuperAdmin])
  const allItems = useMemo(() => nav.flatMap(g => g.items), [role, profile, subscription]) // eslint-disable-line
  const current = allItems.filter(i => (i.exact ? pathname === i.to : pathname.startsWith(i.to) && i.to !== '/')).sort((a, b) => b.to.length - a.to.length)[0] || allItems[0]
  const creditsLeft = subscription ? subscription.email_credits_total - subscription.email_credits_used : 0
  const creditPct = subscription?.email_credits_total ? Math.max(0, Math.round((creditsLeft / subscription.email_credits_total) * 100)) : 0

  return (
    <div className="app-shell">
      <div className={`app-overlay ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} />

      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''} ${collapsed ? 'rail' : ''}`}>
        <div className="app-brand-row">
          <Link to="/" className="app-brand">
            {organization?.brand_name ? (
              <span className="app-brand-text">
                {organization.logo_url && <img className="app-client-logo" src={organization.logo_url} alt="" />}
                <span className="app-brand-name">{organization.brand_name}</span>
              </span>
            ) : <BrandLockup onDark={theme === 'dark'} />}
          </Link>
          <button className="app-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          </button>
        </div>

        {!isSuperAdmin && organization?.name && !organization.brand_name && <div className="app-org-chip" title={organization.name}><i />{organization.name}</div>}
        {isSuperAdmin && <div className="app-org-chip"><i />Platform console</div>}

        <nav className="app-nav" aria-label="Main">
          {nav.map(({ group, items }) => (
            <div key={group} className="app-nav-section">
              <div className="app-nav-group">{group}</div>
              {items.map(({ to, icon: Icon, label, exact }) => (
                <NavLink key={to} to={to} end={exact} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `app-nav-link ${isActive ? 'active' : ''}`}>
                  <span className="app-nav-icon"><Icon size={16} /></span><span className="app-nav-label">{label}</span>
                  {to === '/admin/enquiries' && newEnquiries > 0 && <span className="app-nav-count" aria-label={`${newEnquiries} new`}>{newEnquiries}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {isClientAdmin && subscription && (
          <Link to="/usage" className="app-credit-card">
            <span className="app-credit-head"><span>{planName || 'Your plan'}</span><strong>{creditPct}%</strong></span>
            <span className="app-credit-track"><span style={{ width: `${creditPct}%` }} /></span>
            <span className="app-credit-foot">{creditsLeft.toLocaleString()} credits left</span>
          </Link>
        )}

        <svg className="app-waves" viewBox="0 0 260 90" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 52 C50 22 88 70 140 44 S226 18 260 42 V90 H0 Z" fill="#5c8ca8" opacity=".35" />
          <path d="M0 68 C60 44 104 84 160 62 S232 50 260 62 V90 H0 Z" fill="#e0bd8c" opacity=".3" />
        </svg>

        <div className="app-user">
          <div className="app-avatar">{initials}</div>
          <div className="app-user-text">
            <div className="app-user-name">{name}</div>
            <div className="app-user-role">{ROLE_LABEL[role]}</div>
          </div>
          <button className="app-collapse" onClick={handleSignOut} aria-label="Sign out" title="Sign out"><LogOut size={15} /></button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-topbar">
          <button className="app-tool app-menu-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="app-crumb">
            <span className="app-crumb-page">{pathname === '/' ? `Welcome, ${name.split(/[\s@]/)[0]}` : current?.label}</span>
            <span className="app-crumb-root">{pathname === '/' ? format(new Date(), 'EEEE, MMMM d') : (isSuperAdmin ? 'Synerax Mail' : brand)}</span>
          </div>
          <PageSearch items={allItems} />
          <div className="app-topbar-end">
            <Link to="/home" className="app-tool" aria-label="Visit website" title="Visit website"><Globe size={17} /></Link>
            <Notifications />
            <UserMenu initials={initials} name={name} email={user?.email} role={ROLE_LABEL[role]} onSignOut={handleSignOut} />
          </div>
        </header>
        <div className="app-content">
          <div className="app-content-inner"><Outlet /></div>
        </div>
      </main>
    </div>
  )
}
