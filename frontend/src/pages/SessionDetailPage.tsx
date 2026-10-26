import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { AiNotice } from '../components/AiNotice'
import { formatDate, formatShortDate } from '../components/format'
import { ErrorMessage, MessageCard, NotLinkedMessage, SessionNotFound } from '../components/Messages'
import { StatusBadge } from '../components/StatusBadge'
import { useLoad } from '../components/useLoad'
import type { FlagReason, SessionDetail } from '../types'

export function SessionDetailPage() {
  const { sessionId = '' } = useParams()
  const state = useLoad((token) => api.getSession(token, sessionId), [sessionId])

  return (
    <div>
      <Link to="/" className="text-sm font-medium text-accent hover:underline">
        ← My sessions
      </Link>
      <div className="mt-4">
        {state.kind === 'loading' && <p className="text-sm text-muted">Loading…</p>}
        {state.kind === 'not-found' && <SessionNotFound />}
        {state.kind === 'not-linked' && <NotLinkedMessage />}
        {state.kind === 'error' && <ErrorMessage />}
        {state.kind === 'ready' && <SessionView session={state.data} />}
      </div>
    </div>
  )
}

function SessionView({ session }: { session: SessionDetail }) {
  if (session.status !== 'released') {
    return (
      <MessageCard title={formatDate(session.session_date)}>
        <div className="mb-3 flex justify-center">
          <StatusBadge status={session.status} />
        </div>
        This summary isn’t ready to read yet.
      </MessageCard>
    )
  }

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted">Session on</p>
          <h1 className="text-2xl font-semibold">{formatDate(session.session_date)}</h1>
        </div>
        <StatusBadge status={session.status} />
      </header>

      <AiNotice />

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">What we talked about</h2>
        <p className="mt-3 text-[17px] leading-8">{session.summary}</p>
      </section>

      {session.concepts && session.concepts.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Ideas from this session</h2>
          <ul className="mt-3 space-y-3">
            {session.concepts.map((c) => (
              <li key={c.term} className="rounded-lg bg-canvas px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block font-medium first-letter:uppercase">{c.term}</span>
                  {c.recurring && (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-strong">
                      Came up before
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted">{c.plain_language}</p>
                {c.recurring && (
                  <p className="mt-1 text-xs text-muted">First talked about on {formatShortDate(c.first_seen)}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {session.connections_to_history && session.connections_to_history.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Connected to earlier sessions</h2>
          <ul className="mt-3 divide-y divide-line">
            {session.connections_to_history.map((c) => (
              <li key={c.prior_session_id}>
                <Link
                  to={`/sessions/${c.prior_session_id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:text-accent"
                >
                  <span>
                    <span className="block font-medium">{formatDate(c.prior_session)}</span>
                    <span className="block text-sm text-muted">{c.relationship}</span>
                  </span>
                  <span aria-hidden className="text-muted">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FlagSummary sessionId={session.id} />
    </article>
  )
}

const REASONS: { value: FlagReason; label: string }[] = [
  { value: 'inaccurate', label: 'Something is not accurate' },
  { value: 'confusing', label: 'Something is confusing' },
  { value: 'other', label: 'Something else' },
]

function FlagSummary({ sessionId }: { sessionId: string }) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<FlagReason | null>(null)
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!reason) return
    setState('sending')
    try {
      await api.flagSession(await getToken(), sessionId, reason, comment)
      setState('sent')
    } catch {
      setState('error')
    }
  }

  if (state === 'sent') {
    return (
      <p role="status" className="rounded-xl bg-ready-soft px-5 py-4 text-sm text-ready">
        Thanks for letting us know. Your care team will look at this summary.
      </p>
    )
  }

  if (!open) {
    return (
      <div className="text-center">
        <button onClick={() => setOpen(true)} className="text-sm font-medium text-muted underline hover:text-ink">
          Something wrong or confusing? Let your care team know
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-surface p-6">
      <fieldset>
        <legend className="font-semibold">What’s the problem with this summary?</legend>
        <div className="mt-3 space-y-2">
          {REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-accent"
              />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-medium">
        Anything you’d like to add? (optional)
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-line px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
        />
      </label>
      {state === 'error' && <p className="mt-3 text-sm text-problem">That didn’t send. Please try again.</p>}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={!reason || state === 'sending'}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-50"
        >
          Send to care team
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-sm text-muted">
          Cancel
        </button>
      </div>
    </form>
  )
}
