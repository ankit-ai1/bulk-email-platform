import { useState } from 'react'
import { format } from 'date-fns'
import { LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { api, unwrap } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { attempt, Badge, DataTable, Empty, Field, Modal, PageHeader, Panel, Tabs, useConfirm, useLoad } from '../components/ui'

function ProfileTab() {
  const { profile, user, refreshContext } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  return (
    <div style={{ maxWidth: 560 }}>
      <Panel title="Profile">
        <form className="ui-form" onSubmit={async e => {
          e.preventDefault()
          if (await attempt(async () => {
            unwrap(await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id))
            await supabase.auth.updateUser({ data: { full_name: fullName } })
          }, 'Profile saved')) refreshContext()
        }}>
          <Field label="Full name"><input className="input" value={fullName} onChange={e => setFullName(e.target.value)} /></Field>
          <Field label="Email" hint="Contact your administrator to change it."><input className="input" value={user.email} disabled /></Field>
          <div><button className="btn btn-primary btn-sm">Save</button></div>
        </form>
      </Panel>
    </div>
  )
}

function TwoFactor() {
  const confirm = useConfirm()
  const [enroll, setEnroll] = useState(null)
  const [code, setCode] = useState('')
  const { data: factors, reload } = useLoad(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) throw error
    return data.totp.filter(f => f.status === 'verified')
  })
  const active = factors?.[0]

  async function start() {
    const result = await attempt(async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Synerax Mail ${Date.now()}` })
      if (error) throw error
      return data
    })
    if (result) setEnroll(result)
  }

  return (
    <Panel title="Two-factor authentication" subtitle="Require a code from an authenticator app at every sign-in."
      actions={active
        ? <button className="btn btn-danger btn-sm" onClick={async () => {
          if (!await confirm({ title: 'Turn off two-factor?', danger: true, confirmLabel: 'Turn off', message: 'Your account will be protected by your password alone.' })) return
          if (await attempt(async () => { const { error } = await supabase.auth.mfa.unenroll({ factorId: active.id }); if (error) throw error }, 'Two-factor turned off')) reload()
        }}>Turn off</button>
        : <button className="btn btn-primary btn-sm" onClick={start}><ShieldCheck size={14} /> Set up</button>}>
      {active ? <Badge value="active">On</Badge> : <Badge value="draft">Off</Badge>}
      {enroll && (
        <Modal title="Set up two-factor" onClose={async () => { await supabase.auth.mfa.unenroll({ factorId: enroll.id }); setEnroll(null) }} width={420}>
          <p className="ui-muted" style={{ marginBottom: 12 }}>Scan this with an authenticator app, then enter the 6-digit code.</p>
          <img src={enroll.totp.qr_code} alt="Two-factor QR code" width={200} height={200} style={{ display: 'block', margin: '0 auto 12px', background: '#fff', borderRadius: 8 }} />
          <p className="ui-mono" style={{ textAlign: 'center', marginBottom: 12 }}>{enroll.totp.secret}</p>
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            const ok = await attempt(async () => {
              const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code })
              if (error) throw error
            }, 'Two-factor is on')
            if (ok) { setEnroll(null); setCode(''); reload() }
          }}>
            <input className="input" inputMode="numeric" maxLength={6} aria-label="Verification code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required />
            <button className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={code.length !== 6}>Verify & turn on</button>
          </form>
        </Modal>
      )}
    </Panel>
  )
}

function SecurityTab() {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const { data: logins, loading } = useLoad(async () => unwrap(await supabase.from('login_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(25)))
  return (
    <>
      <div className="ui-grid-2">
        <Panel title="Change password">
          <form className="ui-form" onSubmit={async e => {
            e.preventDefault()
            if (await attempt(async () => {
              await api('/api/me/password', { body: { password } })
              // Supabase ends every session when a password changes, so sign straight back in.
              const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
              if (error) throw error
            }, 'Password changed')) setPassword('')
          }}>
            <Field label="New password" hint="At least 10 characters."><input className="input" type="password" autoComplete="new-password" minLength={10} value={password} onChange={e => setPassword(e.target.value)} required /></Field>
            <div><button className="btn btn-primary btn-sm">Update password</button></div>
          </form>
        </Panel>
        <div>
          <TwoFactor />
          <Panel title="Sessions" subtitle="Sign out everywhere except this device." actions={
            <button className="btn btn-secondary btn-sm" onClick={() => attempt(async () => { const { error } = await supabase.auth.signOut({ scope: 'others' }); if (error) throw error }, 'Other sessions signed out')}><LogOut size={14} /> Sign out others</button>
          } />
        </div>
      </div>
      <Panel title="Your recent sign-ins">
        <DataTable rows={logins || []} loading={loading} empty={<Empty title="No sign-ins recorded yet" />} columns={[
          { key: 'created_at', label: 'When', render: l => format(new Date(l.created_at), 'MMM d, yyyy HH:mm') }, { key: 'ip', label: 'IP' }, { key: 'user_agent', label: 'Device', render: l => <span className="ui-muted">{(l.user_agent || '').slice(0, 80)}</span> },
        ]} />
      </Panel>
    </>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('profile')
  return (
    <>
      <PageHeader title="My account" subtitle="Your profile and security" />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'profile', label: 'Profile' }, { value: 'security', label: 'Security' }]} />
      {tab === 'profile' ? <ProfileTab /> : <SecurityTab />}
    </>
  )
}
