// Supabase is replaced by mock auth — this stub prevents import errors
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Use mock auth' } }),
    signUp: async () => ({ data: null, error: { message: 'Use mock auth' } }),
    signOut: async () => {},
  },
}
