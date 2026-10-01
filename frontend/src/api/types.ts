import type { DocumentTypeOption, FlagReason, SessionDetail, SessionListItem } from '../types'

export class NotFoundError extends Error {
  constructor() {
    super('Not found')
  }
}

export class AuthError extends Error {}

export class ValidationError extends Error {}

/** Signed in, but the account has no patient_id mapping yet (isolation test case in plan 6.4). */
export class NotLinkedError extends Error {
  constructor() {
    super('Account is not linked to a patient record')
  }
}

export interface InitiateUploadRequest {
  fileName: string
  sizeBytes: number
  documentType: string
}

export interface InitiateUploadResponse {
  documentId: string
  uploadUrl: string
}

/**
 * Client for the patient API (plan section 5.2).
 *
 * The client never sends a patient id. The server derives the patient from the
 * identity token (plan section 5.3), so every call only carries the token.
 */
export interface PortalApi {
  /** Demo mode only. With Clerk, sign-in happens in Clerk and the API just verifies the token. */
  signInDemo(email: string, password: string): Promise<{ token: string; firstName: string }>
  listSessions(token: string): Promise<SessionListItem[]>
  getSession(token: string, sessionId: string): Promise<SessionDetail>
  listDocumentTypes(): Promise<DocumentTypeOption[]>
  initiateUpload(token: string, req: InitiateUploadRequest): Promise<InitiateUploadResponse>
  uploadToSignedUrl(url: string, file: File, onProgress: (pct: number) => void): Promise<void>
  finalizeUpload(token: string, documentId: string): Promise<SessionListItem>
  flagSession(token: string, sessionId: string, reason: FlagReason, comment: string): Promise<void>
}

export const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.docx', '.pdf'] as const
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
