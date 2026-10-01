import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function MessageCard({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</div>}
    </div>
  )
}

export function NotLinkedMessage() {
  return (
    <MessageCard title="Your account isn’t set up yet">
      You’re signed in, but your account hasn’t been connected to your care record. Please contact the clinic
      and they will finish setting it up.
    </MessageCard>
  )
}

export function ErrorMessage() {
  return (
    <MessageCard title="Something went wrong">
      Please try again in a moment. If this keeps happening, contact the clinic.
    </MessageCard>
  )
}

export function SessionNotFound() {
  return (
    <MessageCard title="We couldn’t find that session">
      <Link to="/" className="font-medium text-accent hover:underline">
        Back to my sessions
      </Link>
    </MessageCard>
  )
}
