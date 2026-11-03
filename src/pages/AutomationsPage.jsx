import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp, Clock, GitBranch, GripVertical, Mail, Pause, Play, Plus, Trash2, Workflow } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { unwrap } from '../lib/api'
import { attempt, Badge, DataTable, Empty, Field, Modal, PageHeader, Panel, Row, Stat, StatGrid, useConfirm, useLoad } from '../components/ui'

const NEW_STEP = {
  send: { type: 'send', subject: '', body: '' },
  wait: { type: 'wait', hours: 48 },
  condition: { type: 'condition', event: 'clicked', within_hours: 48, yes: 'next', no: 'end' },
}
const STEP_META = { send: [Mail, 'Send email'], wait: [Clock, 'Wait'], condition: [GitBranch, 'If contact…'] }
const EXAMPLE_STEPS = [
  { type: 'send', subject: 'Hello {{first_name|there}}', body: '' },
  { type: 'condition', event: 'clicked', within_hours: 72, yes: 'end', no: 'next' },
  { type: 'send', subject: 'A quick follow-up', body: '' },
]

function Target({ label, value, onChange, count, self }) {
  return (
    <Field label={label}>
      <select className="input" value={String(value)} onChange={e => onChange(['next', 'end'].includes(e.target.value) ? e.target.value : Number(e.target.value))}>
        <option value="next">Continue to next step</option>
        <option value="end">End workflow</option>
        {/* Forward jumps only, so a workflow can never loop and re-mail someone endlessly. */}
        {Array.from({ length: count }, (_, i) => i).filter(i => i > self + 1).map(i => <option key={i} value={i}>Jump to step {i + 1}</option>)}
      </select>
    </Field>
  )
}

function Builder({ automation, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: automation?.name || '', description: automation?.description || '', smtp_account_id: automation?.smtp_account_id || '',
    trigger: automation?.trigger || { type: 'list_join', list_id: '' }, steps: automation?.steps?.length ? automation.steps : EXAMPLE_STEPS,
  })
  const [dragging, setDragging] = useState(null)
  const { data } = useLoad(async () => {
    const [lists, campaigns, smtp] = await Promise.all([
      supabase.from('contact_lists').select('id, name').order('name'),
      supabase.from('campaigns').select('id, name').order('created_at', { ascending: false }),
      supabase.from('smtp_accounts').select('id, label').neq('status', 'paused'),
    ])
    return { lists: unwrap(lists), campaigns: unwrap(campaigns), smtp: unwrap(smtp) }
  })

  const setStep = (i, patch) => setForm(f => ({ ...f, steps: f.steps.map((s, x) => (x === i ? { ...s, ...patch } : s)) }))
  // Jump targets refer to positions, so reordering resets them rather than silently pointing elsewhere.
  const clearJumps = steps => steps.map(s => (s.type !== 'condition' ? s : { ...s, yes: typeof s.yes === 'number' ? 'next' : s.yes, no: typeof s.no === 'number' ? 'end' : s.no }))
  const move = (from, to) => setForm(f => {
    if (to < 0 || to >= f.steps.length || from === to) return f
    const steps = [...f.steps]
    const [item] = steps.splice(from, 1)
    steps.splice(to, 0, item)
    return { ...f, steps: clearJumps(steps) }
  })
  const trigger = form.trigger
  const setTrigger = patch => setForm(f => ({ ...f, trigger: { ...f.trigger, ...patch } }))
  const usesList = trigger.type === 'list_join'

  async function save(e) {
    e.preventDefault()
    const row = { ...form, smtp_account_id: form.smtp_account_id || null, updated_at: new Date().toISOString() }
    const ok = await attempt(async () => unwrap(automation
      ? await supabase.from('automations').update(row).eq('id', automation.id)
      : await supabase.from('automations').insert({ ...row, status: 'draft' })), 'Workflow saved')
    if (ok) onSaved()
  }

  return (
    <Modal title={automation ? `Edit ${automation.name}` : 'New workflow'} onClose={onClose} width={720}>
      <form className="ui-form" onSubmit={save}>
        <Row>
          <Field label="Name *"><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus /></Field>
          <Field label="Send from *"><select className="input" value={form.smtp_account_id} onChange={e => setForm({ ...form, smtp_account_id: e.target.value })} required><option value="">Select account…</option>{data?.smtp.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select></Field>
        </Row>
        <Row>
          <Field label="Starts when">
            <select className="input" value={trigger.type} onChange={e => setForm({ ...form, trigger: { type: e.target.value } })}>
              <option value="list_join">A contact is on a list</option>
              <option value="campaign_click">A contact clicked a campaign</option>
              <option value="campaign_open">A contact opened a campaign (approximate)</option>
            </select>
          </Field>
          {usesList
            ? <Field label="List *"><select className="input" value={trigger.list_id || ''} onChange={e => setTrigger({ list_id: e.target.value })} required><option value="">Select…</option>{data?.lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
            : <Field label="Campaign *"><select className="input" value={trigger.campaign_id || ''} onChange={e => setTrigger({ campaign_id: e.target.value })} required><option value="">Select…</option>{data?.campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>}
        </Row>

        <div className="input-group">
          <span className="input-label">Steps <span className="ui-muted">(drag to reorder)</span></span>
          {form.steps.map((step, i) => {
            const [Icon, label] = STEP_META[step.type]
            return (
              <div key={i}>
                {i > 0 && <div className="wf-connector" />}
                <div className={`wf-step ${dragging === i ? 'dragging' : ''}`} draggable onDragStart={() => setDragging(i)} onDragEnd={() => setDragging(null)}
                  onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); move(dragging, i); setDragging(null) }}>
                  <GripVertical size={16} className="wf-handle" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wf-step-title">
                      <Icon size={15} /> {i + 1}. {label}
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                        <button type="button" className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={13} /></button>
                        <button type="button" className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Move step ${i + 1} down`} disabled={i === form.steps.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={13} /></button>
                        <button type="button" className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Remove step ${i + 1}`} onClick={() => setForm(f => ({ ...f, steps: clearJumps(f.steps.filter((_, x) => x !== i)) }))}><Trash2 size={13} /></button>
                      </span>
                    </div>
                    {step.type === 'send' && <div className="ui-form">
                      <Field label="Subject"><input className="input" value={step.subject} onChange={e => setStep(i, { subject: e.target.value })} required /></Field>
                      <Field label="Body" hint="Plain text or HTML. An unsubscribe link is added automatically."><textarea className="input" rows={4} value={step.body} onChange={e => setStep(i, { body: e.target.value })} required /></Field>
                    </div>}
                    {step.type === 'wait' && <Field label="Hours to wait"><input className="input" type="number" min="1" value={step.hours} onChange={e => setStep(i, { hours: Number(e.target.value) })} /></Field>}
                    {step.type === 'condition' && <div className="ui-form">
                      <Row>
                        <Field label="Contact has…"><select className="input" value={step.event} onChange={e => setStep(i, { event: e.target.value })}><option value="clicked">Clicked a link</option><option value="opened">Opened (approximate)</option><option value="replied">Replied</option></select></Field>
                        <Field label="Within hours of last email"><input className="input" type="number" min="1" value={step.within_hours} onChange={e => setStep(i, { within_hours: Number(e.target.value) })} /></Field>
                      </Row>
                      <Row>
                        <Target label="If yes" value={step.yes} count={form.steps.length} self={i} onChange={yes => setStep(i, { yes })} />
                        <Target label="If no" value={step.no} count={form.steps.length} self={i} onChange={no => setStep(i, { no })} />
                      </Row>
                    </div>}
                  </div>
                </div>
              </div>
            )
          })}
          <div className="ui-actions" style={{ marginTop: 8 }}>
            {Object.keys(NEW_STEP).map(t => <button key={t} type="button" className="btn btn-secondary btn-sm" onClick={() => setForm(f => ({ ...f, steps: [...f.steps, { ...NEW_STEP[t] }] }))}><Plus size={13} /> {STEP_META[t][1]}</button>)}
          </div>
        </div>
        <p className="ui-note">Before every email, Synerax Mail checks unsubscribes, suppression, consent, credits and account limits. A contact who unsubscribes leaves the workflow immediately, and a contact enters each workflow only once.</p>
        <div className="ui-form-actions"><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary">Save workflow</button></div>
      </form>
    </Modal>
  )
}

export default function AutomationsPage() {
  const confirm = useConfirm()
  const [builder, setBuilder] = useState(null)
  const [history, setHistory] = useState(null)
  const { data, loading, error, reload } = useLoad(async () => {
    const [items, runs] = await Promise.all([
      supabase.from('automations').select('*').order('created_at', { ascending: false }),
      supabase.from('automation_runs').select('automation_id, status'),
    ])
    const r = unwrap(runs)
    return unwrap(items).map(a => {
      const mine = r.filter(x => x.automation_id === a.id)
      return { ...a, running: mine.filter(x => x.status === 'running').length, completed: mine.filter(x => x.status === 'completed').length, stopped: mine.filter(x => x.status === 'stopped').length, failed: mine.filter(x => x.status === 'failed').length }
    })
  })
  const rows = data || []
  const setStatus = async (a, status) => { if (await attempt(async () => unwrap(await supabase.from('automations').update({ status }).eq('id', a.id)), status === 'active' ? 'Workflow started' : 'Workflow paused')) reload() }

  return (
    <>
      <PageHeader title="Automations" subtitle="Follow-ups that run on what contacts actually do" actions={<button className="btn btn-primary" onClick={() => setBuilder('new')}><Plus size={15} /> New workflow</button>} />
      <StatGrid>
        <Stat label="Active workflows" value={rows.filter(a => a.status === 'active').length} />
        <Stat label="Contacts in progress" value={rows.reduce((s, a) => s + a.running, 0)} />
        <Stat label="Completed" value={rows.reduce((s, a) => s + a.completed, 0)} />
      </StatGrid>
      <DataTable rows={rows} loading={loading} error={error} onRetry={reload} searchKeys={['name']}
        empty={<Empty icon={Workflow} title="No workflows yet" description="For example: if someone clicks, stop; if they don't within three days, send a follow-up." action={<button className="btn btn-primary btn-sm" onClick={() => setBuilder('new')}><Plus size={14} /> New workflow</button>} />}
        columns={[
          { key: 'name', label: 'Workflow', render: a => <span className="ui-strong">{a.name}</span> },
          { key: 'status', label: 'Status', render: a => <Badge value={a.status} /> },
          { key: 'steps', label: 'Steps', align: 'right', sort: false, render: a => a.steps.length },
          { key: 'running', label: 'In progress', align: 'right' }, { key: 'completed', label: 'Completed', align: 'right' }, { key: 'stopped', label: 'Stopped', align: 'right' }, { key: 'failed', label: 'Failed', align: 'right' },
          { key: 'x', label: '', sort: false, render: a => (
            <div className="ui-actions" style={{ flexWrap: 'nowrap' }}>
              {a.status === 'active'
                ? <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'paused')}><Pause size={13} /> Pause</button>
                : <button className="btn btn-ghost btn-sm" onClick={() => setStatus(a, 'active')}><Play size={13} /> Start</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => setHistory(a)}>History</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setBuilder(a)}>Edit</button>
              <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Delete ${a.name}`} onClick={async () => {
                if (await confirm({ title: `Delete ${a.name}?`, danger: true, confirmLabel: 'Delete', message: 'Its execution history is deleted too.' })
                  && await attempt(async () => unwrap(await supabase.from('automations').delete().eq('id', a.id)), 'Workflow deleted')) reload()
              }}><Trash2 size={14} /></button>
            </div>
          ) },
        ]} />
      {builder && <Builder automation={builder === 'new' ? null : builder} onClose={() => setBuilder(null)} onSaved={() => { setBuilder(null); reload() }} />}
      {history && <RunHistory automation={history} onClose={() => setHistory(null)} />}
    </>
  )
}

function RunHistory({ automation, onClose }) {
  const { data, loading } = useLoad(async () => {
    const runs = unwrap(await supabase.from('automation_runs').select('*, contacts(email)').eq('automation_id', automation.id).order('created_at', { ascending: false }).limit(500))
    return runs.map(r => ({ ...r, email: r.contacts?.email, last: r.log?.[r.log.length - 1]?.message }))
  }, [automation.id])
  return (
    <Modal title={`History: ${automation.name}`} onClose={onClose} width={760}>
      <DataTable rows={data || []} loading={loading} searchKeys={['email']} exportName="workflow-history" empty={<Empty title="No contacts have entered yet" />} columns={[
        { key: 'email', label: 'Contact' }, { key: 'status', label: 'Status', render: r => <Badge value={r.status === 'running' ? 'sending' : r.status} >{r.status}</Badge> },
        { key: 'step_index', label: 'Step', align: 'right', render: r => r.step_index + 1 }, { key: 'last', label: 'Latest' },
        { key: 'next_run_at', label: 'Next action', render: r => (r.status === 'running' ? format(new Date(r.next_run_at), 'MMM d, HH:mm') : '—') },
      ]} />
    </Modal>
  )
}
