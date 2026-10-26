import type { SessionStatus } from '../types'

// Patient-friendly wording from plan section 5.1. "processing" is added for the short
// window between upload and the review queue.
export const STATUS_LABELS: Record<SessionStatus, string> = {
  processing: 'Being prepared',
  pending_review: 'Being reviewed',
  released: 'Ready to read',
  failed: 'Could not be prepared',
}

const STYLES: Record<SessionStatus, string> = {
  processing: 'bg-wait-soft text-wait',
  pending_review: 'bg-wait-soft text-wait',
  released: 'bg-ready-soft text-ready',
  failed: 'bg-problem-soft text-problem',
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
