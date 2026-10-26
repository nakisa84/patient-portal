import { ClerkProvider, useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react'
import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from './AuthContext'

/**
 * Clerk-backed auth. Must be rendered inside <BrowserRouter> so Clerk can use client-side navigation.
 *
 * Patient mapping: each Clerk user gets public_metadata.patient_id (an opaque UUID), exposed to the
 * API as a `patient_id` claim in the session token. See frontend/README.md.
 */
export function ClerkAuthProvider({ publishableKey, children }: { publishableKey: string; children: ReactNode }) {
  const navigate = useNavigate()
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/login"
      afterSignOutUrl="/login"
    >
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  )
}

function ClerkBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { user } = useUser()
  const clerk = useClerk()

  const value = useMemo<AuthContextValue>(
    () => ({
      mode: 'clerk',
      status: !isLoaded ? 'loading' : isSignedIn ? 'signed-in' : 'signed-out',
      firstName: user?.firstName ?? null,
      getToken: async () => {
        const token = await getToken()
        if (!token) throw new Error('Not signed in')
        return token
      },
      signOut: () => clerk.signOut(),
    }),
    [isLoaded, isSignedIn, getToken, user?.firstName, clerk],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
