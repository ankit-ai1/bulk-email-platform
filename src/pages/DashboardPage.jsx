import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays, addMonths, endOfMonth, endOfWeek, format, formatDistanceToNow, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { Bell, ChevronLeft, ChevronRight, Contact2, FileText, Gauge, MousePointerClick, Plus, Send, Trophy, Workflow } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { num, pct, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { Badge, DataTable, Empty, Panel, Stat, StatGrid, useLoad } from '../components/ui'
import { TrendChart } from '../components/charts'
import { dailySeries, sumMetrics } from '../components/analytics'
import { AdminOverviewPage } from './admin/AdminPages'

const dateOf = c => c.completed_at || c.launched_at || c.scheduled_at

function MiniCalendar({ campaigns }) {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const days = useMemo(() => {
    const out = []
    const end = endOfWeek(endOfMonth(month))
    for (let d = startOfWeek(month); d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  return (
    <Panel title="Campaign calendar" actions={
      <div className="mc-nav">
        <button aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft size={15} /></button>
        <span>{format(month, 'MMMM yyyy')}</span>
        <button aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={15} /></button>
      </div>
    }>
      <div className="mc-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="mc-head">{d}</div>)}
        {days.map(day => {
          const items = campaigns.filter(c => dateOf(c) && isSameDay(new Date(dateOf(c)), day))
          const sent = items.some(c => ['completed', 'sending'].includes(c.status))
          const tone = !items.length ? '' : sent ? 'sent' : 'planned'
          return (
            <button key={day.toISOString()} onClick={() => navigate('/calendar')}
              title={items.map(c => c.name).join(', ') || undefined}
              aria-label={`${format(day, 'MMMM d')}${items.length ? `, ${items.length} campaign(s)` : ''}`}
              className={`mc-day ${isSameMonth(day, month) ? '' : 'outside'} ${isSameDay(day, new Date()) ? 'today' : ''} ${tone}`}>
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
      <div className="mc-legend">
        <span><i className="sent" />Sent</span><span><i className="planned" />Planned</span><span><i className="today" />Today</span>
      </div>
    </Panel>
  )
}

function TopCampaigns({ campaigns, metrics }) {
  const top = campaigns
    .map(c => ({ ...c, m: metrics.find(x => x.campaign_id === c.id) }))
    .filter(c => Number(c.m?.sent) > 0)
    .sort((a, b) => (b.m.unique_clicks / (b.m.delivered || 1)) - (a.m.unique_clicks / (a.m.delivered || 1)))
    .slice(0, 3)
  return (
    <Panel title="Top campaigns" subtitle="Ranked by click rate">
      {top.length === 0
        ? <Empty icon={Trophy} title="No results yet" description="Your best campaigns appear here after they send." />
        : (
          <div className="top-tiles">
            {top.map((c, i) => (
              <Link key={c.id} to={`/campaigns/${c.id}`} className={`top-tile tone-${i}`}>
                <span className="top-tile-name">{c.name}</span>
                <span className="top-tile-value">{pct(c.m.unique_clicks, c.m.delivered)}</span>
                <span className="top-tile-note">{num(c.m.sent)} sent</span>
                <span className="top-tile-rank">{['1st', '2nd', '3rd'][i]}</span>
              </Link>
            ))}
          </div>
        )}
    </Panel>
  )
}

function CreditsRing({ left, total }) {
  const percent = total ? Math.max(0, Math.round((left / total) * 100)) : 0
  return (
    <Panel title="Email credits" actions={<Link to="/usage" className="btn btn-ghost btn-sm">Details</Link>}>
      <div className="credit-ring-row">
        <div className="credit-ring" style={{ '--ring': `${percent}%` }} role="img" aria-label={`${percent}% of credits left`}>
          <div><strong>{percent}%</strong><span>left</span></div>
        </div>
        <dl className="ui-kv">
          <dt>Remaining</dt><dd>{num(left)}</dd>
          <dt>Plan total</dt><dd>{num(total)}</dd>
        </dl>
      </div>
    </Panel>
  )
}

function TenantDashboard() {
  const { user, isClientAdmin, can, subscription } = useAuth()
  const { data, loading } = useLoad(async () => {
    const count = async t => (await supabase.from(t).select('id', { count: 'exact', head: true })).count || 0
    const [campaigns, metrics, daily, contacts, templates, automations, notifications] = await Promise.all([
      can('campaigns') ? supabase.from('campaigns').select('id, name, status, subject, created_at, scheduled_at, launched_at, completed_at').order('created_at', { ascending: false }).limit(200) : { data: [] },
      can('campaigns') ? supabase.from('campaign_metrics').select('*') : { data: [] },
      can('analytics') ? supabase.from('daily_stats').select('*').gte('day', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)) : { data: [] },
      can('contacts') ? count('contacts') : 0, can('templates') ? count('templates') : 0,
      can('automation') ? supabase.from('automations').select('id', { count: 'exact', head: true }).eq('status', 'active') : { count: 0 },
      supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])
    return { campaigns: unwrap(campaigns), metrics: unwrap(metrics), daily: unwrap(daily), contacts, templates, automations: automations.count || 0, notifications: notifications.data || [] }
  })

  const totals = useMemo(() => sumMetrics(data?.metrics), [data])
  const campaigns = data?.campaigns || []
  const metrics = data?.metrics || []
  const expiresIn = subscription?.expires_at ? Math.ceil((new Date(subscription.expires_at) - Date.now()) / 86400000) : null
  const creditsLeft = subscription ? subscription.email_credits_total - subscription.email_credits_used : 0
  const metricFor = id => metrics.find(m => m.campaign_id === id) || {}

  return (
    <>
      {isClientAdmin && subscription && expiresIn !== null && expiresIn <= 14 && (
        <p className="ui-note ui-note-warn">{expiresIn > 0 ? `Your subscription expires in ${expiresIn} day(s).` : 'Your subscription has expired.'} <Link to="/usage">Contact Synerax to renew</Link>.</p>
      )}
      {isClientAdmin && subscription && creditsLeft <= subscription.email_credits_total * 0.2 && (
        <p className="ui-note ui-note-warn">{num(creditsLeft)} email credits left. <Link to="/usage">Request more</Link>.</p>
      )}

      <StatGrid>
        {can('campaigns') && <Stat icon={Send} label="Emails sent" value={num(totals.sent)} hint={`${pct(totals.delivered, totals.sent)} delivered`} />}
        {can('campaigns') && <Stat icon={MousePointerClick} label="Click rate" value={pct(totals.unique_clicks, totals.delivered)} hint={`${num(totals.unique_clicks)} clicks`} />}
        {can('contacts') && <Stat icon={Contact2} label="Contacts" value={num(data?.contacts)} />}
        {can('templates') && <Stat icon={FileText} label="Templates" value={num(data?.templates)} />}
        {can('automation') && <Stat icon={Workflow} label="Automations" value={num(data?.automations)} hint="Active" />}
        {isClientAdmin && subscription && <Stat icon={Gauge} label="Credits left" value={num(creditsLeft)} hint={`of ${num(subscription.email_credits_total)}`} />}
      </StatGrid>

      <div className="dash-grid">
        <div className="dash-col">
          {can('campaigns') && <MiniCalendar campaigns={campaigns} />}
          <Panel title="Activity" subtitle="Your latest alerts">
            {(data?.notifications || []).length === 0
              ? <Empty icon={Bell} title="Nothing new" />
              : data.notifications.map(n => (
                <div key={n.id} className="activity-row">
                  <span className="ui-strong">{n.title}</span>
                  <span className="ui-muted">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
                  {n.body && <p>{n.body}</p>}
                </div>
              ))}
          </Panel>
        </div>
        <div className="dash-col">
          {can('analytics') && <Panel title="Sending performance" subtitle="Last 30 days. Opens are approximate."><TrendChart data={dailySeries(data?.daily)} height={250} /></Panel>}
          {can('campaigns') && <TopCampaigns campaigns={campaigns} metrics={metrics} />}
          {isClientAdmin && subscription && <CreditsRing left={creditsLeft} total={subscription.email_credits_total} />}
        </div>
      </div>

      {can('campaigns') && (
        <Panel title="Recent campaigns" actions={<>
          <Link to="/campaigns" className="btn btn-ghost btn-sm">View all</Link>
          <Link to="/campaigns?new=1" className="btn btn-primary btn-sm"><Plus size={14} /> New campaign</Link>
        </>}>
          <DataTable loading={loading} rows={campaigns.slice(0, 6)}
            empty={<Empty icon={Send} title="No campaigns yet" description="Your first campaign takes a few minutes to set up." />}
            columns={[
              { key: 'name', label: 'Campaign', render: c => <Link to={`/campaigns/${c.id}`} className="ui-strong">{c.name}</Link> },
              { key: 'status', label: 'Status', render: c => <Badge value={c.status} /> },
              { key: 'sent', label: 'Sent', align: 'right', sort: false, render: c => num(metricFor(c.id).sent) },
              { key: 'ctr', label: 'Click rate', align: 'right', sort: false, render: c => pct(metricFor(c.id).unique_clicks, metricFor(c.id).delivered) },
            ]} />
        </Panel>
      )}
    </>
  )
}

export default function DashboardPage() {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin ? <AdminOverviewPage /> : <TenantDashboard />
}
