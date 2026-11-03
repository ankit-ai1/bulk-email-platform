import { format, parseISO } from 'date-fns'
import { num, pct } from '../lib/api'
import { Stat, StatGrid } from './ui'

/** Collapses org-level daily rows into one chart series, filling gaps so the time axis stays true. */
export function dailySeries(rows, days = 30) {
  if (!rows?.length) return []
  const byDay = {}
  rows.forEach(r => {
    const d = (byDay[r.day] ||= { sent: 0, opened: 0, clicked: 0, bounced: 0, delivered: 0 })
    d.sent += Number(r.sent); d.opened += Number(r.opened); d.clicked += Number(r.clicked); d.bounced += Number(r.bounced); d.delivered += Number(r.delivered)
  })
  const out = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    out.push({ label: format(parseISO(day), 'MMM d'), day, ...(byDay[day] || { sent: 0, opened: 0, clicked: 0, bounced: 0, delivered: 0 }) })
  }
  return out
}

export function sumMetrics(rows) {
  const keys = ['total_scheduled', 'pending', 'sent', 'failed', 'delivered', 'unique_opens', 'total_opens', 'reopened', 'machine_opens', 'unique_clicks', 'total_clicks', 'bounced', 'hard_bounces', 'soft_bounces', 'unsubscribed', 'complaints', 'replies', 'conversions', 'revenue']
  return Object.fromEntries(keys.map(k => [k, (rows || []).reduce((s, r) => s + Number(r[k] || 0), 0)]))
}

export function MetricsGrid({ m }) {
  const engaged = m.unique_clicks + m.replies
  return (
    <>
      <StatGrid>
        <Stat label="Scheduled" value={num(m.total_scheduled)} hint={m.pending ? `${num(m.pending)} still queued` : undefined} />
        <Stat label="Sent" value={num(m.sent)} hint={`${num(m.failed)} failed`} />
        <Stat label="Delivered" value={num(m.delivered)} hint={`${pct(m.delivered, m.sent)} delivery rate`} />
        <Stat label="Unique opens (approx.)" value={num(m.unique_opens)} hint={`${pct(m.unique_opens, m.delivered)} open rate`} />
        <Stat label="Total opens (approx.)" value={num(m.total_opens)} hint={`${num(m.reopened)} reopened`} />
        <Stat label="Unique clicks" value={num(m.unique_clicks)} hint={`${pct(m.unique_clicks, m.delivered)} CTR`} />
        <Stat label="Total clicks" value={num(m.total_clicks)} />
        <Stat label="Replies" value={num(m.replies)} hint={`${pct(m.replies, m.delivered)} reply rate`} />
        <Stat label="Bounced" value={num(m.bounced)} hint={`${pct(m.bounced, m.sent)} · ${num(m.hard_bounces)} hard, ${num(m.soft_bounces)} soft`} />
        <Stat label="Unsubscribed" value={num(m.unsubscribed)} hint={`${pct(m.unsubscribed, m.delivered)} rate`} />
        <Stat label="Spam complaints" value={num(m.complaints)} hint={pct(m.complaints, m.delivered)} />
        <Stat label="Engagement" value={pct(engaged, m.delivered)} hint="Clicks and replies" />
        <Stat label="Conversions" value={num(m.conversions)} hint={`${pct(m.conversions, m.delivered)} of delivered`} />
        <Stat label="Conversion revenue" value={num(m.revenue)} hint="Attributed to campaigns" />
      </StatGrid>
      <p className="ui-muted" style={{ marginBottom: 20 }}>
        Opens are estimates: mail privacy features load images automatically and some clients block them, so an open is not proof a person read the email.
        Automated security scanners ({num(m.machine_opens)} detected) are excluded. Delivered means accepted by the receiving server with no bounce reported so far. Clicks and replies are the stronger signals.
      </p>
    </>
  )
}
