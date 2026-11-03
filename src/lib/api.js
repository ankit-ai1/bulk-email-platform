import { supabase } from './supabase'

const WORKER_URL = (import.meta.env.VITE_WORKER_URL || 'http://localhost:3001').replace(/\/$/, '')

/** Call the worker with the signed-in user's token. Throws with the server's message. */
export async function api(path, { method = 'POST', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  let res
  try {
    res = await fetch(`${WORKER_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error('Could not reach the Synerax Mail service. Check your connection and try again.')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    // The session was ended elsewhere (for example by a password change): send the user back to sign in.
    await supabase.auth.signOut()
    throw new Error('Your session has ended. Please sign in again.')
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

/** Unwraps a Supabase response, throwing on error so callers share one failure path. */
export function unwrap({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

export function downloadCsv(filename, rows) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  // A leading =, +, - or @ would run as a formula when the export opens in Excel.
  const cell = (v) => {
    let s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return `"${s.replace(/"/g, '""')}"`
  }
  const csv = [headers.map(cell).join(','), ...rows.map(r => headers.map(h => cell(r[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const pct = (part, whole) => (whole ? `${((Number(part) / Number(whole)) * 100).toFixed(1)}%` : '—')
export const num = (n) => Number(n || 0).toLocaleString()
