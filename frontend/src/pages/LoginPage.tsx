import { SignIn } from '@clerk/react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { PrototypeBanner } from '../components/Layout'

export function LoginPage() {
  const { mode, status } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (status === 'signed-in') return <Navigate to={from} replace />

  return (
    <div className="min-h-screen">
      <PrototypeBanner />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-12">
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-accent text-xl text-white">
          M
        </span>
        <h1 className="mt-4 text-2xl font-semibold">Meridian Patient Portal</h1>
        <p className="mt-1 text-center text-sm text-muted">Read summaries of your sessions, in plain language.</p>
        <div className="mt-8 w-full">
          {mode === 'clerk' ? (
            <div className="flex justify-center">
              {/* Sign-up is off: accounts are created by the clinic (plan section 6.1). */}
              <SignIn routing="path" path="/login" fallbackRedirectUrl={from} />
            </div>
          ) : (
            <DemoLoginForm redirectTo={from} />
          )}
        </div>
      </div>
    </div>
  )
}

function DemoLoginForm({ redirectTo }: { redirectTo: string }) {
  const { demoSignIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await demoSignIn?.(email, password)
      navigate(redirectTo, { replace: true })
    } catch {
      setError('That email or password is not correct.')
    } finally {
      setBusy(false)
    }
  }

  const input =
    'mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft'

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-surface p-6 shadow-sm" noValidate>
      <label className="block text-sm font-medium">
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
      </label>
      <label className="mt-4 block text-sm font-medium">
        Password
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
      </label>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-problem-soft px-3 py-2 text-sm text-problem">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-strong disabled:opacity-60"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      <p className="mt-4 text-center text-xs text-muted">
        Demo mode: sign in as <strong>dana@example.com</strong> with any password.
      </p>
    </form>
  )
}
