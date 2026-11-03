import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Monitor, Moon, Smartphone } from 'lucide-react'

/** Known rendering and deliverability traps. Static checks, not screenshots from real mail clients. */
export function checkEmail(html, subject = '') {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const size = new Blob([html || '']).size
  const issues = []
  const add = (level, text) => issues.push({ level, text })
  if (size > 102 * 1024) add('error', `Gmail clips emails over 102 KB. This one is ${Math.round(size / 1024)} KB.`)
  if (doc.querySelector('script')) add('error', 'Remove <script>: mail clients strip it and spam filters penalize it.')
  if (doc.querySelector('form, video, iframe')) add('warning', 'Forms, video and iframes do not work in most mail clients.')
  if (doc.querySelector('link[rel="stylesheet"]')) add('warning', 'External stylesheets are often removed. Use inline styles.')
  if (/display\s*:\s*(flex|grid)/i.test(html || '')) add('warning', 'Outlook on Windows ignores flexbox and grid. Use tables for layout.')
  if (/position\s*:\s*(absolute|fixed)/i.test(html || '')) add('warning', 'Positioned elements break in many mail clients.')
  const noAlt = [...doc.images].filter(i => !i.getAttribute('alt')).length
  if (noAlt) add('warning', `${noAlt} image(s) have no alt text, so they show nothing when images are blocked.`)
  const wide = [...doc.querySelectorAll('[width]')].filter(el => Number(el.getAttribute('width')) > 640).length
  if (wide) add('warning', `${wide} element(s) are wider than 640px and may scroll sideways on phones.`)
  if (doc.images.length > 0 && (doc.body?.textContent || '').trim().length < 50) add('warning', 'Mostly images and little text: spam filters often flag this.')
  if (subject.length > 60) add('warning', `The subject is ${subject.length} characters; phones cut it off around 40 to 60.`)
  if (/\b(free!!!|act now|100% free|guaranteed|winner)\b/i.test(`${subject} ${doc.body?.textContent || ''}`)) add('warning', 'Contains wording that spam filters often flag.')
  if ((subject.match(/[A-Z]/g) || []).length > 12 && subject === subject.toUpperCase()) add('warning', 'An all-caps subject hurts deliverability.')
  return issues
}

const VIEWS = { desktop: [Monitor, 'Desktop', '100%'], mobile: [Smartphone, 'Phone', '375px'], dark: [Moon, 'Dark mode', '100%'] }

export default function EmailCheck({ html, subject }) {
  const [view, setView] = useState('desktop')
  const issues = useMemo(() => checkEmail(html, subject), [html, subject])
  // Approximates the color inversion some clients apply; each client's real result differs.
  const doc = view === 'dark' ? `<style>html{filter:invert(1) hue-rotate(180deg);background:#fff}img{filter:invert(1) hue-rotate(180deg)}</style>${html}` : html
  return (
    <div>
      <div className="ui-tabs" role="tablist" style={{ marginBottom: 12 }}>
        {Object.entries(VIEWS).map(([key, [Icon, label]]) => (
          <button key={key} type="button" role="tab" aria-selected={view === key} className={`ui-tab ${view === key ? 'active' : ''}`} onClick={() => setView(key)}><Icon size={14} /> {label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: 10, padding: 10 }}>
        <iframe title="Email preview" sandbox="" srcDoc={doc} style={{ width: VIEWS[view][2], maxWidth: '100%', height: 400, border: 0, background: '#fff', borderRadius: 6 }} />
      </div>
      <div style={{ marginTop: 12 }}>
        {issues.length === 0
          ? <p className="ui-check-row ok"><CheckCircle2 size={15} /> No common rendering or spam problems found.</p>
          : issues.map(i => <p key={i.text} className={`ui-check-row ${i.level}`}><AlertTriangle size={15} /> {i.text}</p>)}
        <p className="ui-muted" style={{ marginTop: 6 }}>A quick automated check and preview. For exact results in each mail client, also send a test or use a tool like Litmus.</p>
      </div>
    </div>
  )
}
