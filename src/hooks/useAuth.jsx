import { createContext, useContext, useEffect, useState } from 'react'

const AuthContext = createContext({})

const DUMMY_USERS = [
  {
    email: 'admin@mailforge.com',
    password: 'password123',
    user_metadata: { full_name: 'Admin User' },
  },
  {
    email: 'test@example.com',
    password: 'password123',
    user_metadata: { full_name: 'Test User' },
  },
]

const STORAGE_KEY = 'mock_auth_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const signIn = async (email, password) => {
    const match = DUMMY_USERS.find(
      (u) => u.email === email && u.password === password
    )
    if (!match) {
      return { data: null, error: { message: 'Invalid email or password.' } }
    }
    const userObj = { email: match.email, user_metadata: match.user_metadata }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj))
    setUser(userObj)
    return { data: { user: userObj }, error: null }
  }

  const signUp = async (email, password, fullName) => {
    const exists = DUMMY_USERS.find((u) => u.email === email)
    if (exists) {
      return { data: null, error: { message: 'User already exists.' } }
    }
    const userObj = { email, user_metadata: { full_name: fullName } }
    DUMMY_USERS.push({ email, password, user_metadata: { full_name: fullName } })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj))
    setUser(userObj)
    return { data: { user: userObj }, error: null }
  }

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
