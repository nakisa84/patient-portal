// In-memory mock of the patient API. Lets the UI run before the FastAPI backend exists.
// It follows the same rules the real API must follow:
//  - patient identity comes only from the token
//  - another patient's session returns NotFound, never "forbidden"
//  - summary content is hidden until status is "released"

import { ACCOUNTS, DEMO_UPLOAD_RESULT, SESSIONS, type StoredSession } from '../data/synthetic'
import type { DocumentTypeOption, SessionDetail, SessionListItem } from '../types'
import {
  ACCEPTED_EXTENSIONS,
  AuthError,
  MAX_UPLOAD_BYTES,
  NotFoundError,
  NotLinkedError,
  ValidationError,
  type PortalApi,
} from './types'

// Placeholder list until the clinic confirms approved types (GitHub issue #5).
const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { value: 'session_note_patient_copy', label: 'Session note (patient copy)', eligible: true },
  { value: 'homework_worksheet', label: 'Homework or worksheet', eligible: true },
  { value: 'other', label: 'Something else', eligible: false },
]

const sessions: StoredSession[] = structuredClone(SESSIONS)
const tokens = new Map<string, string>() // token -> patientId
const pendingUploads = new Map<string, { patientId: string; documentType: string }>()
const listeners = new Set<() => void>()

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
const notify = () => listeners.forEach((fn) => fn())

/** Reads the payload of a Clerk session JWT. DEMO ONLY: the real API must verify the signature. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

/** Mirrors the server rule: patient identity comes only from the token (plan section 5.3). */
function patientFor(token: string): string {
  const demoPatient = tokens.get(token)
  if (demoPatient) return demoPatient

  const claim = decodeJwtPayload(token)?.patient_id
  if (typeof claim === 'string' && ACCOUNTS.some((a) => a.patientId === claim)) return claim
  if (claim === undefined) throw new NotLinkedError()
  throw new AuthError('Session expired')
}

function toListItem(s: StoredSession): SessionListItem {
  return {
    id: s.id,
    session_date: s.session_date,
    status: s.status,
    preview: s.status === 'released' ? s.summary?.slice(0, 140) : undefined,
  }
}

function toDetail(s: StoredSession): SessionDetail {
  if (s.status !== 'released') return toListItem(s)
  return {
    ...toListItem(s),
    summary: s.summary,
    concepts: s.concepts,
    connections_to_history: s.connections_to_history,
    released_at: s.released_at,
  }
}

export const mockApi: PortalApi = {
  async signInDemo(email, password) {
    await delay(400)
    const account = ACCOUNTS.find((a) => a.email === email.trim().toLowerCase())
    if (!account || password.length === 0) throw new AuthError('Email or password is not correct')
    const token = crypto.randomUUID()
    tokens.set(token, account.patientId)
    return { token, firstName: account.firstName }
  },

  async listSessions(token) {
    await delay(250)
    const patientId = patientFor(token)
    return sessions
      .filter((s) => s.patientId === patientId)
      .sort((a, b) => b.session_date.localeCompare(a.session_date))
      .map(toListItem)
  },

  async getSession(token, sessionId) {
    await delay(250)
    const patientId = patientFor(token)
    const s = sessions.find((x) => x.id === sessionId && x.patientId === patientId)
    if (!s) throw new NotFoundError()
    return toDetail(s)
  },

  async listDocumentTypes() {
    return DOCUMENT_TYPES
  },

  async initiateUpload(token, req) {
    await delay(300)
    const patientId = patientFor(token)
    const ext = req.fileName.slice(req.fileName.lastIndexOf('.')).toLowerCase()
    if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
      throw new ValidationError('This file type is not supported.')
    }
    if (req.sizeBytes > MAX_UPLOAD_BYTES) throw new ValidationError('This file is larger than 10 MB.')
    const type = DOCUMENT_TYPES.find((t) => t.value === req.documentType)
    if (!type) throw new ValidationError('Please choose a document type.')
    if (!type.eligible) {
      throw new ValidationError('This kind of document cannot be summarized. Please check with your care team.')
    }
    const documentId = `doc_${crypto.randomUUID().slice(0, 8)}`
    pendingUploads.set(documentId, { patientId, documentType: req.documentType })
    // The real API returns a short-lived signed URL scoped to one server-built object path.
    return { documentId, uploadUrl: `mock://signed/${documentId}` }
  },

  async uploadToSignedUrl(_url, _file, onProgress) {
    for (let pct = 10; pct <= 100; pct += 15) {
      await delay(120)
      onProgress(Math.min(pct, 100))
    }
    onProgress(100)
  },

  async finalizeUpload(token, documentId) {
    await delay(300)
    const patientId = patientFor(token)
    const pending = pendingUploads.get(documentId)
    if (!pending || pending.patientId !== patientId) throw new NotFoundError()
    pendingUploads.delete(documentId)

    const session: StoredSession = {
      id: `ses_${documentId.slice(4)}`,
      patientId,
      session_date: new Date().toISOString().slice(0, 10),
      status: 'processing',
    }
    sessions.push(session)

    // Simulate the processing worker finishing and placing the item in the review queue.
    setTimeout(() => {
      session.status = 'pending_review'
      notify()
    }, 3000)

    return toListItem(session)
  },

  async flagSession(token, sessionId, _reason, _comment) {
    await delay(300)
    const patientId = patientFor(token)
    if (!sessions.some((s) => s.id === sessionId && s.patientId === patientId)) throw new NotFoundError()
  },
}

// ---------- Demo-only helpers (not part of the patient API) ----------

/** Subscribe to background status changes so screens can refresh. */
export function onMockChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Stands in for the clinician review queue until it exists (GitHub issues #24, #25). */
export function demoReleaseAllPending(token: string): number {
  const patientId = patientFor(token)
  let count = 0
  for (const s of sessions) {
    if (s.patientId === patientId && s.status === 'pending_review') {
      Object.assign(s, structuredClone(DEMO_UPLOAD_RESULT))
      s.status = 'released'
      s.released_at = new Date().toISOString().slice(0, 10)
      count++
    }
  }
  if (count) notify()
  return count
}
