import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { attempt } from '../ui'

function GateCard({ icon: Icon, title, children }) {
  const { signOut } = useAuth()
  return (
    <div className="gate">
      <div className="gate-card">
        <Icon size={26} style={{ color: 'var(--accent)', marginBottom: 12 }} />
        <h1>{title}</h1>
        {children}
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={signOut}>Sign out</button>
      </div>
    </div>
  )
}

function MfaChallenge() {
  const { refreshContext } = useAuth()
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState(null)

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => setFactorId(data?.totp?.[0]?.id ?? null))
  }, [])

  async function submit(e) {
    e.preventDefault()
    await attempt(async () => {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code })
      if (error) throw error
      await refreshContext()
    })
  }

  return (
    <GateCard icon={ShieldCheck} title="Two-factor verification">
      <p>Enter the 6-digit code from your authenticator app.</p>
      <form onSubmit={submit} className="ui-form">
        <input className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label="Verification code"
          value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} required autoFocus />
        <button className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={code.length !== 6 || !factorId}>Verify</button>
      </form>
    </GateCard>
  )
}

function ForcePasswordChange() {
  const { refreshContext, user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm && password !== confirm

  async function submit(e) {
    e.preventDefault()
    await attempt(async () => {
      await api('/api/me/password', { body: { password } })
      // Supabase ends every session when a password changes, so sign straight back in.
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password })
      if (error) throw error
      await refreshContext()
    }, 'Password updated')
  }

  return (
    <GateCard icon={KeyRound} title="Set your password">
      <p>You signed in with a temporary password. Choose your own to continue.</p>
      <form onSubmit={submit} className="ui-form">
        <input className="input" type="password" autoComplete="new-password" placeholder="New password (10+ characters)" aria-label="New password"
          minLength={10} value={password} onChange={e => setPassword(e.target.value)} required />
        <input className="input" type="password" autoComplete="new-password" placeholder="Confirm password" aria-label="Confirm password"
          value={confirm} onChange={e => setConfirm(e.target.value)} required />
        {mismatch && <span className="ui-hint" role="alert">Passwords don't match</span>}
        <button className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={password.length < 10 || password !== confirm}>Save password</button>
      </form>
    </GateCard>
  )
}

/** Decides whether the signed-in user may enter the app at all. */
export default function AccountGate({ children }) {
  const { context, profile, organization, mfaRequired } = useAuth()

  if (!context || !profile) {
    return (
      <GateCard icon={ShieldAlert} title="This account isn't set up">
        <p>Your login isn't linked to an organization. Accounts are created by Synerax or your company administrator.</p>
      </GateCard>
    )
  }
  if (mfaRequired) return <MfaChallenge />
  if (profile.status !== 'active') {
    return (
      <GateCard icon={ShieldAlert} title={`Your account is ${profile.status}`}>
        <p>Contact your company administrator to restore access.</p>
      </GateCard>
    )
  }
  if (organization && organization.status !== 'active') {
    return (
      <GateCard icon={ShieldAlert} title={`${organization.name} is ${organization.status}`}>
        <p>Access to this organization is paused. Contact Synerax support to restore it.</p>
      </GateCard>
    )
  }
  if (profile.must_change_password) return <ForcePasswordChange />
  return children
}
