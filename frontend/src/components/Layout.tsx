import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function PrototypeBanner() {
  return (
    <div className="bg-ink px-4 py-1.5 text-center text-xs text-white/85">
      Prototype with synthetic data. Do not enter real patient information.
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { status, signOut } = useAuth()
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-accent-soft text-accent-strong' : 'text-muted hover:text-ink'}`

  return (
    <div className="min-h-screen">
      <PrototypeBanner />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-base font-semibold text-ink">
            <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-accent text-sm text-white">
              M
            </span>
            Meridian Patient Portal
          </Link>
          <nav className="flex items-center gap-1" aria-label="Main">
            <NavLink to="/" end className={navClass}>
              My sessions
            </NavLink>
            <NavLink to="/upload" className={navClass}>
              Upload
            </NavLink>
            {status === 'signed-in' && (
              <button onClick={() => void signOut()} className="rounded-md px-3 py-2 text-sm text-muted hover:text-ink">
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
