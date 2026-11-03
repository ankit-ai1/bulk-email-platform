import { useMemo, useState } from 'react'
import { Columns, GripVertical, Heading, Image, Minus, MousePointerClick, Trash2, Type } from 'lucide-react'
import { Field } from './ui'

const BLOCKS = {
  heading: { icon: Heading, label: 'Heading', make: () => ({ type: 'heading', text: 'Your headline' }) },
  text: { icon: Type, label: 'Text', make: () => ({ type: 'text', text: 'Hi {{first_name|there}},\n\nWrite your message here.' }) },
  image: { icon: Image, label: 'Image', make: () => ({ type: 'image', src: '', alt: '' }) },
  button: { icon: MousePointerClick, label: 'Button', make: () => ({ type: 'button', text: 'Learn more', href: 'https://' }) },
  divider: { icon: Minus, label: 'Divider', make: () => ({ type: 'divider' }) },
  columns: { icon: Columns, label: 'Two columns', make: () => ({ type: 'columns', left: 'Left column', right: 'Right column' }) },
}

// Personalization tokens must survive escaping, so only the HTML metacharacters are encoded.
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const safeUrl = u => (/^https?:\/\//i.test(u || '') || /^\{\{/.test(u || '') ? esc(u) : '#')
const paragraph = 'margin:0 0 16px;font-size:16px;line-height:1.6;color:#374151;'

/** Table-based, inline-styled output: the only layout that renders reliably across email clients. */
export function renderBlocks(blocks, brandColor) {
  const accent = /^#[0-9a-f]{3,8}$/i.test(brandColor || '') ? brandColor : '#4f46e5'
  const body = blocks.map(b => {
    switch (b.type) {
      case 'heading': return `<h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#111827;">${esc(b.text)}</h1>`
      case 'text': return esc(b.text).split(/\n{2,}/).map(p => `<p style="${paragraph}">${p.replace(/\n/g, '<br>')}</p>`).join('')
      case 'image': return b.src ? `<img src="${safeUrl(b.src)}" alt="${esc(b.alt)}" style="display:block;max-width:100%;height:auto;margin:0 0 16px;border-radius:6px;">` : ''
      case 'button': return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td style="background:${accent};border-radius:6px;"><a href="${safeUrl(b.href)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${esc(b.text)}</a></td></tr></table>`
      case 'divider': return '<hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0;">'
      case 'columns': return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;"><tr><td width="50%" valign="top" style="padding-right:8px;font-size:15px;line-height:1.5;color:#374151;">${esc(b.left).replace(/\n/g, '<br>')}</td><td width="50%" valign="top" style="padding-left:8px;font-size:15px;line-height:1.5;color:#374151;">${esc(b.right).replace(/\n/g, '<br>')}</td></tr></table>`
      default: return ''
    }
  }).join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;"><tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;">\n${body}\n</td></tr></table></td></tr></table>`
}

function BlockEditor({ block, onChange }) {
  const set = k => e => onChange({ ...block, [k]: e.target.value })
  switch (block.type) {
    case 'heading': return <input className="input" aria-label="Heading text" value={block.text} onChange={set('text')} />
    case 'text': return <textarea className="input" rows={4} aria-label="Text" value={block.text} onChange={set('text')} />
    case 'image': return <><Field label="Image URL"><input className="input" value={block.src} onChange={set('src')} placeholder="https://" /></Field><Field label="Alt text"><input className="input" value={block.alt} onChange={set('alt')} /></Field></>
    case 'button': return <><Field label="Label"><input className="input" value={block.text} onChange={set('text')} /></Field><Field label="Link"><input className="input" value={block.href} onChange={set('href')} /></Field></>
    case 'columns': return <><textarea className="input" rows={2} aria-label="Left column" value={block.left} onChange={set('left')} /><textarea className="input" rows={2} aria-label="Right column" value={block.right} onChange={set('right')} /></>
    default: return <p className="ui-muted">A horizontal line.</p>
  }
}

const heading = text => ({ type: 'heading', text })
const text = t => ({ type: 'text', text: t })
const button = t => ({ type: 'button', text: t, href: 'https://' })
const divider = { type: 'divider' }
// Starting points, all single-column on phones.
const STARTERS = {
  Newsletter: [heading('This month at {{company|our company}}'), text('Hi {{first_name|there}},\n\nHere is what is new.'), divider, heading('Top story'), text('Share your main update here.'), button('Read more')],
  Promotion: [heading('A special offer for you'), { type: 'image', src: '', alt: 'Offer' }, text('Hi {{first_name|there}},\n\nSay what the offer is, who it is for and when it ends.'), button('Shop the offer')],
  Welcome: [heading('Welcome, {{first_name|friend}}'), text('Thanks for joining us. Here is how to get started.'), { type: 'columns', left: 'Step 1\nDescribe the first step.', right: 'Step 2\nDescribe the next step.' }, button('Get started')],
}

export default function EmailBuilder({ blocks, onChange, brandColor }) {
  const [dragIndex, setDragIndex] = useState(null)
  const preview = useMemo(() => renderBlocks(blocks, brandColor), [blocks, brandColor])

  const insert = (type, at = blocks.length) => {
    const next = [...blocks]
    next.splice(at, 0, BLOCKS[type].make())
    onChange(next)
  }
  function drop(e, at) {
    e.preventDefault()
    e.stopPropagation()
    const newType = e.dataTransfer.getData('new-block')
    if (newType) { insert(newType, at); return }
    if (dragIndex === null || dragIndex === at) return
    const next = [...blocks]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(at, 0, moved)
    onChange(next)
    setDragIndex(null)
  }

  return (
    <div className="eb">
      <div className="eb-palette">
        <span className="input-label">Start from</span>
        {Object.entries(STARTERS).map(([name, preset]) => <button key={name} type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(preset.map(b => ({ ...b })))}>{name}</button>)}
        <span className="input-label" style={{ marginTop: 8 }}>Drag or click to add</span>
        {Object.entries(BLOCKS).map(([type, { icon: Icon, label }]) => (
          <button key={type} type="button" className="btn btn-secondary btn-sm" draggable onDragStart={e => e.dataTransfer.setData('new-block', type)} onClick={() => insert(type)}><Icon size={14} /> {label}</button>
        ))}
      </div>
      <div className="eb-canvas" onDragOver={e => e.preventDefault()} onDrop={e => drop(e, blocks.length)}>
        {blocks.length === 0 && <p className="ui-muted" style={{ textAlign: 'center', margin: 'auto' }}>Add blocks to start your email</p>}
        {blocks.map((block, i) => (
          <div key={i} className={`wf-step ${dragIndex === i ? 'dragging' : ''}`} draggable onDragStart={e => { e.stopPropagation(); setDragIndex(i) }} onDragEnd={() => setDragIndex(null)} onDragOver={e => e.preventDefault()} onDrop={e => drop(e, i)}>
            <GripVertical size={16} className="wf-handle" />
            <div className="ui-form" style={{ flex: 1, minWidth: 0, gap: 8 }}><BlockEditor block={block} onChange={b => onChange(blocks.map((x, n) => (n === i ? b : x)))} /></div>
            <button type="button" className="btn btn-ghost btn-sm ui-icon-btn" aria-label={`Remove ${block.type} block`} style={{ alignSelf: 'flex-start' }} onClick={() => onChange(blocks.filter((_, n) => n !== i))}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <iframe className="eb-preview" title="Email preview" sandbox="" srcDoc={preview} />
    </div>
  )
}
