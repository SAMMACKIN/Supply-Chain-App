// This file is kept as a stub to prevent import errors during migration

export const supabase = {
  from: () => {
    throw new Error('Supabase has been removed. Use Railway API instead.')
  },
  auth: {
    signInWithPassword: () => {
      throw new Error('Supabase auth removed. Use MockAuthProvider.')
    },
    signUp: () => {
      throw new Error('Supabase auth removed. Use MockAuthProvider.')
    },
    signOut: () => {
      throw new Error('Supabase auth removed. Use MockAuthProvider.')
    },
    getSession: () => {
      return { data: { session: null }, error: null }
    },
    getUser: () => {
      return { data: { user: null }, error: null }
    },
    onAuthStateChange: () => {
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  functions: {
    invoke: () => {
      throw new Error('Supabase functions removed. Use Railway API.')
    }
  }
}

export const supabaseConfig = {
  url: 'removed',
  anonKey: 'removed'
}