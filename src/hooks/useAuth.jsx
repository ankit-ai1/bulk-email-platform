import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { api } from '../lib/api'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [context, setContext] = useState(null)
  const [loading, setLoading] = useState(true)

  // UI convenience only. Every rule here is enforced again by RLS and the worker.
  const loadContext = useCallback(async () => {
    const { data } = await supabase.rpc('get_my_context')
    setContext(data || null)
    return data
  }, [])

  useEffect(() => {
    const apply = async (session) => {
      setUser(session?.user ?? null)
      if (session?.user) await loadContext()
      else setContext(null)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data: { session } }) => apply(session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Deferred: calling Supabase inside this callback can deadlock its auth lock.
      setTimeout(() => apply(session), 0)
    })

    return () => subscription.unsubscribe()
  }, [loadContext])

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { data, error }
      api('/api/me/login').catch(() => {})
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const profile = context?.profile ?? null
  const role = profile?.role ?? null
  const isSuperAdmin = role === 'super_admin'
  const isClientAdmin = role === 'client_admin'
  const features = context?.subscription?.features ?? {}

  const can = (permission) => isClientAdmin || (role === 'campaign_manager' && profile?.permissions?.[permission] === true)
  const hasFeature = (feature) => features[feature] === true

  return (
    <AuthContext.Provider value={{
      user, loading, signIn, signOut, refreshContext: loadContext,
      context, profile, role, isSuperAdmin, isClientAdmin, can, hasFeature,
      organization: context?.organization ?? null,
      subscription: context?.subscription ?? null,
      planName: context?.plan_name ?? null,
      mfaRequired: context?.mfa_required === true,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
