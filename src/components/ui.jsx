import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Copy, Download, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { downloadCsv } from '../lib/api'

/** Loads async data with shared loading/error state. reload() refetches without flashing skeletons. */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const reload = useCallback(async () => {
    try {
      const data = await fn()
      setState({ data, loading: false, error: null })
      return data
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err.message }))
    }
    // eslint-disable-next-line
  }, deps)
  useEffect(() => { setState(s => ({ ...s, loading: true })); reload() }, [reload])
  return { ...state, reload }
}

/** Runs an action with a success toast and surfaces any failure as an error toast. */
export async function attempt(fn, success) {
  try {
    const result = await fn()
    if (success) toast.success(success)
    return result ?? true
  } catch (err) {
    toast.error(err.message || 'Something went wrong')
    return null
  }
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="ui-page-header">
      <div style={{ minWidth: 0 }}>
        {back}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-actions">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, icon: Icon }) {
  return (
    <div className="ui-stat">
      {Icon && <span className="ui-stat-icon"><Icon size={24} /></span>}
      <div className="ui-stat-body">
        <div className="ui-stat-label">{label}</div>
        <div className="ui-stat-value">{value}</div>
        {hint && <div className="ui-stat-hint">{hint}</div>}
      </div>
    </div>
  )
}

export const StatGrid = ({ children }) => <div className="ui-stat-grid">{children}</div>

export function Panel({ title, subtitle, actions, children, flush }) {
  return (
    <section className={`ui-panel ${flush ? 'ui-panel-flush' : ''}`}>
      {(title || actions) && (
        <header className="ui-panel-head">
          <div><h2 className="ui-panel-title">{title}</h2>{subtitle && <p className="ui-panel-sub">{subtitle}</p>}</div>
          {actions && <div className="ui-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

const TONE = {
  active: 'success', healthy: 'success', completed: 'success', sent: 'success', paid: 'success', resolved: 'success', approved: 'success',
  sending: 'info', in_progress: 'info', scheduled: 'info', open: 'info', issued: 'info', pending: 'info',
  paused: 'warning', degraded: 'warning', waiting_client: 'warning', untested: 'warning', draft: 'neutral', skipped: 'neutral', closed: 'neutral',
  suspended: 'error', failed: 'error', error: 'error', deactivated: 'error', stopped: 'error', expired: 'error', rejected: 'error', cancelled: 'error', urgent: 'error', high: 'warning',
}
export const Badge = ({ value, children }) => (
  <span className={`badge badge-${TONE[value] || 'neutral'}`}>{children ?? String(value || '').replace(/_/g, ' ')}</span>
)

export function Modal({ title, onClose, children, width = 560 }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="btn btn-ghost btn-sm ui-icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const ConfirmContext = createContext(() => Promise.resolve(false))
export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const confirm = useCallback(options => new Promise(resolve => setRequest({ ...options, resolve })), [])
  const close = value => { request.resolve(value); setRequest(null) }
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <Modal title={request.title} onClose={() => close(false)} width={440}>
          <div className="ui-confirm">
            {request.danger && <AlertTriangle size={20} className="ui-confirm-icon" />}
            <p>{request.message}</p>
          </div>
          <div className="ui-form-actions">
            <button className="btn btn-secondary" onClick={() => close(false)}>Cancel</button>
            <button className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)}>{request.confirmLabel || 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function Empty({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state ui-empty">
      {Icon && <div className="empty-icon"><Icon size={26} /></div>}
      <p className="empty-title">{title}</p>
      {description && <p className="empty-desc">{description}</p>}
      {action}
    </div>
  )
}

export const Skeleton = ({ height = 16, width = '100%' }) => <div className="ui-skeleton" style={{ height, width }} />
export function SkeletonRows({ rows = 5 }) {
  return <div className="ui-skeleton-rows">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} height={40} />)}</div>
}
export const ErrorNote = ({ message, onRetry }) => (
  <div className="ui-error"><AlertTriangle size={16} /><span>{message}</span>{onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Retry</button>}</div>
)

export function Field({ label, hint, children }) {
  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      {children}
      {hint && <span className="ui-hint">{hint}</span>}
    </label>
  )
}

export const Row = ({ children }) => <div className="ui-form-row">{children}</div>

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map(t => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={`ui-tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}{t.count !== undefined && <span className="ui-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Meter({ label, used, total }) {
  const ratio = total ? Math.min(1, used / total) : 0
  const tone = ratio >= 0.95 ? 'critical' : ratio >= 0.8 ? 'warning' : 'ok'
  return (
    <div className="ui-meter">
      <div className="ui-meter-head"><span>{label}</span><span>{Number(used).toLocaleString()} / {Number(total).toLocaleString()}</span></div>
      <div className="ui-meter-track" role="progressbar" aria-valuenow={Math.round(ratio * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`ui-meter-bar ${tone}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

/** Shows a generated secret exactly once, with copy. It cannot be retrieved later. */
export function SecretReveal({ title, note, items, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="ui-note ui-note-warn">{note || 'Copy this now. For security it will not be shown again.'}</p>
      <div className="ui-secrets">
        {items.map(([label, value]) => (
          <div key={label} className="ui-secret">
            <span className="input-label">{label}</span>
            <div className="ui-secret-value">
              <code>{value}</code>
              <button className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Copy ${label}`}
                onClick={() => navigator.clipboard.writeText(value).then(() => toast.success('Copied'))}><Copy size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="ui-form-actions"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
    </Modal>
  )
}

/**
 * columns: { key, label, render?(row), sort?: false, value?(row), align?, csv?: false }
 * Searches, sorts, paginates and exports client-side.
 */
export function DataTable({ columns, rows, loading, error, onRetry, searchKeys, filters, actions, onRowClick, empty, exportName, pageSize = 15 }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(null)
  const [page, setPage] = useState(0)

  const valueOf = useCallback((row, key) => {
    const col = columns.find(c => c.key === key)
    return col?.value ? col.value(row) : row[key]
  }, [columns])

  const shown = useMemo(() => {
    let list = rows || []
    const q = query.trim().toLowerCase()
    if (q && searchKeys) list = list.filter(r => searchKeys.some(k => String(r[k] ?? '').toLowerCase().includes(q)))
    if (sort) {
      list = [...list].sort((a, b) => {
        const x = valueOf(a, sort.key), y = valueOf(b, sort.key)
        const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''))
        return sort.dir === 'asc' ? order : -order
      })
    }
    return list
  }, [rows, query, sort, searchKeys, valueOf])

  useEffect(() => setPage(0), [query, sort, rows])
  const pages = Math.max(1, Math.ceil(shown.length / pageSize))
  const visible = shown.slice(page * pageSize, (page + 1) * pageSize)

  const toggleSort = key => setSort(s => (s?.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null))
  const doExport = () => downloadCsv(`${exportName}.csv`, shown.map(r => Object.fromEntries(
    columns.filter(c => c.csv !== false && c.label).map(c => [c.label, valueOf(r, c.key)]))))

  return (
    <div className="ui-table-wrap">
      {(searchKeys || filters || actions || exportName) && (
        <div className="ui-toolbar">
          {searchKeys && (
            <div className="ui-search">
              <Search size={15} />
              <input className="input" aria-label="Search" placeholder="Search…" value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          )}
          {filters}
          <div className="ui-toolbar-end">
            {exportName && <button className="btn btn-secondary btn-sm" onClick={doExport} disabled={!shown.length}><Download size={14} /> Export CSV</button>}
            {actions}
          </div>
        </div>
      )}
      {error ? <ErrorNote message={error} onRetry={onRetry} />
        : loading ? <SkeletonRows />
        : shown.length === 0 ? (empty || <Empty title={query ? 'No matches' : 'Nothing here yet'} />)
        : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>{columns.map(c => (
                    <th key={c.key} style={{ textAlign: c.align }} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {c.sort === false || !c.label ? c.label : (
                        <button className="ui-sort" onClick={() => toggleSort(c.key)}>
                          {c.label}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      )}
                    </th>
                  ))}</tr>
                </thead>
                <tbody>
                  {visible.map((row, i) => (
                    <tr key={row.id ?? i} className={onRowClick ? 'ui-row-link' : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                      {columns.map(c => <td key={c.key} style={{ textAlign: c.align }}>{c.render ? c.render(row) : (row[c.key] ?? '—')}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="ui-pager">
                <span>{shown.length.toLocaleString()} results</span>
                <button className="btn btn-ghost btn-sm ui-icon-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
                <span>{page + 1} / {pages}</span>
                <button className="btn btn-ghost btn-sm ui-icon-btn" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
              </div>
            )}
          </>
        )}
    </div>
  )
}
