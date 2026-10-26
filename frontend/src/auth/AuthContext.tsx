import { createContext, useContext, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out'

export interface AuthContextValue {
  mode: 'clerk' | 'demo'
  status: AuthStatus
  firstName: string | null
  /** Returns a fresh identity token to send to the API. The API derives patient_id from it. */
  getToken: () => Promise<string>
  signOut: () => Promise<void>
  /** Demo mode only. Clerk mode uses Clerk's <SignIn /> component. */
  demoSignIn?: (email: string, password: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an auth provider')
  return ctx
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') {
    return <p className="p-8 text-center text-sm text-muted">Loading…</p>
  }
  if (status === 'signed-out') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <>{children}</>
}
