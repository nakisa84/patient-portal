import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { demoReleaseAllPending } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'
import { formatDate } from '../components/format'
import { ErrorMessage, MessageCard, NotLinkedMessage } from '../components/Messages'
import { StatusBadge } from '../components/StatusBadge'
import { useLoad } from '../components/useLoad'
import type { SessionListItem } from '../types'

const WAITING_TEXT: Record<string, string> = {
  processing: 'We’re preparing this summary.',
  pending_review: 'Your care team is reviewing this summary. You’ll be able to read it once it’s ready.',
  failed: 'We couldn’t prepare a summary for this session. Your care team has been notified.',
}

export function DashboardPage() {
  const { firstName } = useAuth()
  const state = useLoad((token) => api.listSessions(token), [])

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{firstName ? `Hi ${firstName}` : 'My sessions'}</h1>
          <p className="mt-1 text-sm text-muted">Summaries of your sessions, newest first.</p>
        </div>
        <Link
          to="/upload"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong"
        >
          Upload a session note
        </Link>
      </div>

      <div className="mt-6">
        {state.kind === 'loading' && <p className="text-sm text-muted">Loading your sessions…</p>}
        {state.kind === 'not-linked' && <NotLinkedMessage />}
        {(state.kind === 'error' || state.kind === 'not-found') && <ErrorMessage />}
        {state.kind === 'ready' &&
          (state.data.length === 0 ? (
            <MessageCard title="No sessions yet">Summaries will appear here after your sessions.</MessageCard>
          ) : (
            <ul className="space-y-3">
              {state.data.map((s) => (
                <SessionCard key={s.id} session={s} />
              ))}
            </ul>
          ))}
      </div>

      {state.kind === 'ready' && state.data.some((s) => s.status === 'pending_review') && <DemoReviewControl />}
    </div>
  )
}

function SessionCard({ session }: { session: SessionListItem }) {
  const released = session.status === 'released'
  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{formatDate(session.session_date)}</h2>
        <StatusBadge status={session.status} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {released ? `${session.preview}…` : WAITING_TEXT[session.status]}
      </p>
    </>
  )
  return (
    <li>
      {released ? (
        <Link
          to={`/sessions/${session.id}`}
          className="block rounded-xl border border-line bg-surface p-5 transition hover:border-accent"
        >
          {body}
        </Link>
      ) : (
        <div className="rounded-xl border border-line bg-surface p-5">{body}</div>
      )}
    </li>
  )
}

/** Demo stand-in for the clinician review queue (GitHub issues #24, #25). Not shown to real patients. */
function DemoReviewControl() {
  const { getToken } = useAuth()
  const [busy, setBusy] = useState(false)
  const release = useCallback(async () => {
    setBusy(true)
    demoReleaseAllPending(await getToken())
    setBusy(false)
  }, [getToken])

  return (
    <div className="mt-8 rounded-xl border border-dashed border-wait/40 bg-wait-soft/50 p-4 text-sm">
      <p className="font-medium text-wait">Demo only: clinician review</p>
      <p className="mt-1 text-muted">
        The clinician review screen isn’t built yet. Use this to simulate a clinician approving the summary.
      </p>
      <button
        onClick={() => void release()}
        disabled={busy}
        className="mt-3 rounded-lg border border-wait/40 bg-surface px-3 py-1.5 font-medium text-wait hover:bg-wait-soft"
      >
        Approve pending summaries
      </button>
    </div>
  )
}
