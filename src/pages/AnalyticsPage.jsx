import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Printer } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { downloadCsv, num, pct, unwrap } from '../lib/api'
import { DataTable, Empty, PageHeader, Panel, Tabs, useLoad } from '../components/ui'
import { CompareChart, TrendChart } from '../components/charts'
import { dailySeries, MetricsGrid, sumMetrics } from '../components/analytics'

const RANGES = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [365, 'Last 12 months']]

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [tab, setTab] = useState('campaigns')
  const { data, loading, error, reload } = useLoad(async () => {
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const [campaigns, metrics, daily, smtp, smtpMetrics, domains] = await Promise.all([
      supabase.from('campaigns').select('id, name, subject, subject_b, launched_at').gte('created_at', since).order('created_at', { ascending: false }),
      supabase.from('campaign_metrics').select('*'),
      supabase.from('daily_stats').select('*').gte('day', since.slice(0, 10)),
      supabase.from('smtp_accounts').select('id, label, from_email, status'),
      supabase.from('smtp_metrics').select('*'),
      supabase.from('domains').select('domain'),
    ])
    const m = unwrap(metrics)
    const list = unwrap(campaigns).map(c => ({ ...c, m: m.find(x => x.campaign_id === c.id) || {} }))
    return { campaigns: list, metrics: m.filter(x => list.some(c => c.id === x.campaign_id)), daily: unwrap(daily), smtp: unwrap(smtp), smtpMetrics: unwrap(smtpMetrics), domains: unwrap(domains) }
  }, [days])

  const totals = useMemo(() => sumMetrics(data?.metrics), [data])
  const sent = (data?.campaigns || []).filter(c => Number(c.m.sent) > 0)
  const compare = sent.slice(0, 8).reverse().map(c => ({ label: c.name, sent: Number(c.m.sent), opened: Number(c.m.unique_opens), clicked: Number(c.m.unique_clicks) }))
  const accounts = (data?.smtp || []).map(a => {
    const m = data.smtpMetrics.find(x => x.smtp_account_id === a.id) || {}
    return { ...a, domain: a.from_email.split('@')[1], sent: Number(m.sent || 0), bounced: Number(m.bounced || 0), opens: Number(m.unique_opens || 0), clicks: Number(m.unique_clicks || 0), complaints: Number(m.complaints || 0) }
  })
  const domains = Object.values(accounts.reduce((acc, a) => {
    const d = (acc[a.domain] ||= { id: a.domain, domain: a.domain, sent: 0, bounced: 0, opens: 0, clicks: 0, complaints: 0 })
    d.sent += a.sent; d.bounced += a.bounced; d.opens += a.opens; d.clicks += a.clicks; d.complaints += a.complaints
    return acc
  }, {}))

  const exportSummary = () => downloadCsv('campaign-performance.csv', (data?.campaigns || []).map(c => ({
    campaign: c.name, subject: c.subject, scheduled: c.m.total_scheduled || 0, sent: c.m.sent || 0, delivered: c.m.delivered || 0, failed: c.m.failed || 0,
    unique_opens_approx: c.m.unique_opens || 0, total_opens_approx: c.m.total_opens || 0, reopened: c.m.reopened || 0, unique_clicks: c.m.unique_clicks || 0, total_clicks: c.m.total_clicks || 0,
    hard_bounces: c.m.hard_bounces || 0, soft_bounces: c.m.soft_bounces || 0, unsubscribed: c.m.unsubscribed || 0, complaints: c.m.complaints || 0, replies: c.m.replies || 0, conversions: c.m.conversions || 0, revenue: c.m.revenue || 0,
  })))

  const reputation = [
    { key: 'bounced', label: 'Bounce rate', align: 'right', value: r => (r.sent ? r.bounced / r.sent : 0), render: r => pct(r.bounced, r.sent) },
    { key: 'complaints', label: 'Complaint rate', align: 'right', value: r => (r.sent ? r.complaints / r.sent : 0), render: r => pct(r.complaints, r.sent) },
    { key: 'clicks', label: 'Click rate', align: 'right', value: r => (r.sent ? r.clicks / r.sent : 0), render: r => pct(r.clicks, r.sent) },
  ]

  return (
    <>
      <PageHeader title="Analytics" subtitle="Delivery and engagement across your campaigns" actions={<>
        <select className="input" style={{ width: 'auto' }} aria-label="Date range" value={days} onChange={e => setDays(Number(e.target.value))}>{RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="btn btn-secondary btn-sm" onClick={exportSummary}><Download size={14} /> CSV</button>
        <button className="btn btn-secondary btn-sm" onClick={() => window.print()}><Printer size={14} /> PDF</button>
      </>} />
      <MetricsGrid m={totals} />
      <Panel title="Daily trend"><TrendChart data={dailySeries(data?.daily, Math.min(days, 90))} keys={['sent', 'opened', 'clicked', 'bounced']} /></Panel>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'campaigns', label: 'Campaigns' }, { value: 'subjects', label: 'Subject lines' }, { value: 'accounts', label: 'SMTP accounts' }, { value: 'domains', label: 'Domains' }]} />
      {tab === 'campaigns' && <>
        {compare.length > 1 && <Panel title="Campaign comparison" subtitle="Your most recent sent campaigns"><CompareChart data={compare} /></Panel>}
        <DataTable rows={data?.campaigns || []} loading={loading} error={error} onRetry={reload} searchKeys={['name']} empty={<Empty title="No campaigns in this period" />} columns={[
          { key: 'name', label: 'Campaign', render: c => <Link to={`/campaigns/${c.id}`} className="ui-strong">{c.name}</Link> },
          { key: 'sent', label: 'Sent', align: 'right', value: c => Number(c.m.sent || 0), render: c => num(c.m.sent) },
          { key: 'delivery', label: 'Delivery', align: 'right', value: c => (c.m.sent ? c.m.delivered / c.m.sent : 0), render: c => pct(c.m.delivered, c.m.sent) },
          { key: 'open', label: 'Open (approx.)', align: 'right', value: c => (c.m.delivered ? c.m.unique_opens / c.m.delivered : 0), render: c => pct(c.m.unique_opens, c.m.delivered) },
          { key: 'ctr', label: 'CTR', align: 'right', value: c => (c.m.delivered ? c.m.unique_clicks / c.m.delivered : 0), render: c => pct(c.m.unique_clicks, c.m.delivered) },
          { key: 'bounce', label: 'Bounce', align: 'right', value: c => (c.m.sent ? c.m.bounced / c.m.sent : 0), render: c => pct(c.m.bounced, c.m.sent) },
          { key: 'unsub', label: 'Unsub.', align: 'right', value: c => (c.m.delivered ? c.m.unsubscribed / c.m.delivered : 0), render: c => pct(c.m.unsubscribed, c.m.delivered) },
          { key: 'replies', label: 'Replies', align: 'right', value: c => Number(c.m.replies || 0), render: c => num(c.m.replies) },
          { key: 'revenue', label: 'Revenue', align: 'right', value: c => Number(c.m.revenue || 0), render: c => num(c.m.revenue) },
        ]} />
      </>}
      {tab === 'subjects' && <DataTable rows={sent} searchKeys={['subject']} empty={<Empty title="No sent campaigns yet" />} columns={[
        { key: 'subject', label: 'Subject line', render: c => <span className="ui-strong">{c.subject}</span> },
        { key: 'sent', label: 'Sent', align: 'right', value: c => Number(c.m.sent), render: c => num(c.m.sent) },
        { key: 'open', label: 'Open (approx.)', align: 'right', value: c => (c.m.delivered ? c.m.unique_opens / c.m.delivered : 0), render: c => pct(c.m.unique_opens, c.m.delivered) },
        { key: 'ctr', label: 'CTR', align: 'right', value: c => (c.m.delivered ? c.m.unique_clicks / c.m.delivered : 0), render: c => pct(c.m.unique_clicks, c.m.delivered) },
      ]} />}
      {tab === 'accounts' && <DataTable rows={accounts} empty={<Empty title="No SMTP accounts" />} columns={[
        { key: 'label', label: 'Account', render: a => <><div className="ui-strong">{a.label}</div><div className="ui-muted">{a.from_email}</div></> },
        { key: 'sent', label: 'All-time sent', align: 'right', render: a => num(a.sent) }, ...reputation,
      ]} />}
      {tab === 'domains' && <DataTable rows={domains} empty={<Empty title="No sending domains yet" />} columns={[
        { key: 'domain', label: 'Domain', render: d => <span className="ui-strong">{d.domain}</span> },
        { key: 'sent', label: 'All-time sent', align: 'right', render: d => num(d.sent) }, ...reputation,
      ]} />}
    </>
  )
}
