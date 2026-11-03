import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/api'
import { attempt, Field, Modal, PageHeader, useLoad } from '../components/ui'

const dateOf = c => c.completed_at || c.launched_at || c.scheduled_at
// Only plans that haven't gone out can move; a sent campaign's date is history.
const movable = c => ['draft', 'scheduled'].includes(c.status)

export default function CalendarPage() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [planning, setPlanning] = useState(null)
  const [dragId, setDragId] = useState(null)
  const { data, reload } = useLoad(async () => unwrap(await supabase.from('campaigns')
    .select('id, name, status, scheduled_at, launched_at, completed_at').order('created_at', { ascending: false })))

  const days = useMemo(() => {
    const out = []
    const end = endOfWeek(endOfMonth(month))
    for (let d = startOfWeek(month); d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  const onDay = day => (data || []).filter(c => dateOf(c) && isSameDay(new Date(dateOf(c)), day))
  const unscheduled = (data || []).filter(c => !dateOf(c))

  async function move(day) {
    const campaign = data.find(c => c.id === dragId)
    setDragId(null)
    if (!campaign || !movable(campaign)) return
    const when = new Date(day)
    const prior = campaign.scheduled_at ? new Date(campaign.scheduled_at) : null
    when.setHours(prior ? prior.getHours() : 10, prior ? prior.getMinutes() : 0, 0, 0)
    if (await attempt(async () => unwrap(await supabase.from('campaigns').update({ scheduled_at: when.toISOString() }).eq('id', campaign.id)), `Moved to ${format(when, 'MMM d')}`)) reload()
  }

  async function plan(e) {
    e.preventDefault()
    const row = { name: planning.name.trim(), status: 'draft', scheduled_at: new Date(planning.at).toISOString() }
    const created = await attempt(async () => unwrap(await supabase.from('campaigns').insert(row).select('id').single()), 'Added to the calendar')
    if (created) { setPlanning(null); reload() }
  }

  const chip = c => (
    <button key={c.id} draggable={movable(c)} onDragStart={() => setDragId(c.id)} onClick={e => { e.stopPropagation(); navigate(`/campaigns/${c.id}`) }}
      className={`cal-chip cal-${c.status}`} title={`${c.name} (${c.status})`}>{c.name}</button>
  )

  return (
    <>
      <PageHeader title="Campaign calendar" subtitle="Plan what goes out and when. Drag a draft or scheduled campaign to another day." actions={
        <button className="btn btn-primary" onClick={() => setPlanning({ name: '', at: format(new Date(), "yyyy-MM-dd'T'10:00") })}><Plus size={15} /> Plan campaign</button>
      } />
      <div className="cal-toolbar">
        <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label="Previous month" onClick={() => setMonth(m => addMonths(m, -1))}><ChevronLeft size={17} /></button>
        <h2 className="cal-title">{format(month, 'MMMM yyyy')}</h2>
        <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label="Next month" onClick={() => setMonth(m => addMonths(m, 1))}><ChevronRight size={17} /></button>
        <button className="btn btn-secondary btn-sm" onClick={() => setMonth(startOfMonth(new Date()))}>Today</button>
        <div className="cal-legend">
          {[['draft', 'Planned'], ['scheduled', 'Scheduled'], ['sending', 'Sending'], ['completed', 'Sent']].map(([s, l]) => <span key={s}><i className={`cal-dot cal-${s}`} />{l}</span>)}
        </div>
      </div>
      <div className="cal-scroll">
        <div className="cal-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="cal-head">{d}</div>)}
          {days.map(day => (
            <div key={day.toISOString()} className={`cal-day ${isSameMonth(day, month) ? '' : 'outside'} ${isSameDay(day, new Date()) ? 'today' : ''}`}
              onClick={() => setPlanning({ name: '', at: format(day, "yyyy-MM-dd'T'10:00") })}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); move(day) }}>
              <span className="cal-num">{format(day, 'd')}</span>
              {onDay(day).map(chip)}
            </div>
          ))}
        </div>
      </div>
      {unscheduled.length > 0 && (
        <div className="cal-backlog"><span className="input-label">No date yet (drag onto a day)</span><div className="ui-actions">{unscheduled.map(chip)}</div></div>
      )}
      {planning && (
        <Modal title="Plan a campaign" onClose={() => setPlanning(null)} width={440}>
          <form className="ui-form" onSubmit={plan}>
            <Field label="Campaign name *"><input className="input" value={planning.name} onChange={e => setPlanning({ ...planning, name: e.target.value })} required autoFocus /></Field>
            <Field label="Planned date" hint="This saves a draft for planning. Nothing is sent until you launch it."><input className="input" type="datetime-local" value={planning.at} onChange={e => setPlanning({ ...planning, at: e.target.value })} required /></Field>
            <div className="ui-form-actions"><button className="btn btn-primary">Add to calendar</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
