import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Empty } from './ui'
import { BarChart3 } from 'lucide-react'

// Fixed order, validated for colorblind separation. Identity follows the metric, never its rank.
export const SERIES = {
  sent: { color: 'var(--series-1)', label: 'Sent' },
  opened: { color: 'var(--series-2)', label: 'Opened (approx.)' },
  clicked: { color: 'var(--series-3)', label: 'Clicked' },
  bounced: { color: 'var(--series-4)', label: 'Bounced' },
}

const axis = { fontSize: 12, fill: 'var(--text-muted)' }

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="ui-chart-tip">
      <div className="ui-chart-tip-title">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="ui-chart-tip-row">
          <span className="ui-legend-dot" style={{ background: p.color }} />
          <span>{p.name}</span><strong>{Number(p.value).toLocaleString()}</strong>
        </div>
      ))}
    </div>
  )
}

const noData = <Empty icon={BarChart3} title="No sending activity yet" description="Charts appear after your first campaign sends." />

export function TrendChart({ data, keys = ['sent', 'opened', 'clicked'], height = 280 }) {
  if (!data?.length) return noData
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} minTickGap={24} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        {keys.map(k => (
          <Area key={k} type="monotone" dataKey={k} name={SERIES[k].label} stroke={SERIES[k].color} strokeWidth={2}
            fill={SERIES[k].color} fillOpacity={0.08} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--bg-card)' }} dot={false} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CompareChart({ data, keys = ['sent', 'opened', 'clicked'], height = 300 }) {
  if (!data?.length) return noData
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2} barCategoryGap="24%">
        <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
        <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={{ stroke: 'var(--border)' }} interval={0}
          tickFormatter={v => (v.length > 14 ? `${v.slice(0, 13)}…` : v)} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--bg-elevated)', fillOpacity: 0.5 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        {keys.map(k => <Bar key={k} dataKey={k} name={SERIES[k].label} fill={SERIES[k].color} radius={[4, 4, 0, 0]} maxBarSize={22} />)}
      </BarChart>
    </ResponsiveContainer>
  )
}
