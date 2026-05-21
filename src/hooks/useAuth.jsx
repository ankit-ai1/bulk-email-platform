import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check if session user has confirmed email
      if (session?.user && !session.user.email_confirmed_at) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(session?.user ?? null)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Check if session user has confirmed email
      if (session?.user && !session.user.email_confirmed_at) {
        supabase.auth.signOut()
        setUser(null)
      } else {
        setUser(session?.user ?? null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) return { data, error }
      
      // Check if email is confirmed - if not, sign them out immediately
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        return {
          data: null,
          error: {
            message: 'Please verify your email before signing in. Check your inbox for the verification link.',
            code: 'email_not_confirmed'
          }
        }
      }
      
      return { data, error }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/confirm-email`,
      }
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
