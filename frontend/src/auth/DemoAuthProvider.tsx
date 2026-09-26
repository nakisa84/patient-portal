import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import { AuthContext, type AuthContextValue } from './AuthContext'

/** Used when no Clerk publishable key is configured. Synthetic accounts only. */
export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ token: string; firstName: string } | null>(null)

  const demoSignIn = useCallback(async (email: string, password: string) => {
    setSession(await api.signInDemo(email, password))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: 'demo',
      status: session ? 'signed-in' : 'signed-out',
      firstName: session?.firstName ?? null,
      getToken: async () => {
        if (!session) throw new Error('Not signed in')
        return session.token
      },
      signOut: async () => setSession(null),
      demoSignIn,
    }),
    [session, demoSignIn],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
