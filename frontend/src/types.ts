// Shapes mirror the structured output and endpoints in the project plan (sections 5.2 and 7.2).

export type SessionStatus = 'processing' | 'pending_review' | 'released' | 'failed'

export interface Concept {
  term: string
  plain_language: string
  first_seen: string // ISO date
  recurring: boolean
}

export interface HistoryConnection {
  prior_session_id: string
  prior_session: string // ISO date of the prior session
  relationship: string
}

/** Patient-visible list item. Summary text is only present once released. */
export interface SessionListItem {
  id: string
  session_date: string // ISO date
  status: SessionStatus
  preview?: string
}

/** Patient-visible detail. Content fields only exist when status is "released". */
export interface SessionDetail extends SessionListItem {
  summary?: string
  concepts?: Concept[]
  connections_to_history?: HistoryConnection[]
  released_at?: string
}

export interface DocumentTypeOption {
  value: string
  label: string
  eligible: boolean
}

export type FlagReason = 'inaccurate' | 'confusing' | 'other'

export interface Patient {
  firstName: string
  email: string
}
