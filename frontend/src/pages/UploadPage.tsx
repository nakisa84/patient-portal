import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, NotLinkedError, ValidationError, api } from '../api'
import { useAuth } from '../auth/AuthContext'
import { NotLinkedMessage } from '../components/Messages'
import type { DocumentTypeOption } from '../types'

type Step = 'form' | 'uploading' | 'done'

function checkFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    return 'Please choose a .txt, .md, .docx, or .pdf file.'
  }
  if (file.size > MAX_UPLOAD_BYTES) return 'This file is larger than 10 MB.'
  return null
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function UploadPage() {
  const { getToken } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [types, setTypes] = useState<DocumentTypeOption[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [progress, setProgress] = useState(0)
  const [notLinked, setNotLinked] = useState(false)

  useEffect(() => {
    void api.listDocumentTypes().then(setTypes)
  }, [])

  function onPick(f: File | null) {
    setError(null)
    setFile(f)
    if (f) setError(checkFile(f))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) return setError('Please choose a file.')
    if (!docType) return setError('Please choose what kind of document this is.')
    const fileError = checkFile(file)
    if (fileError) return setError(fileError)

    setError(null)
    setStep('uploading')
    setProgress(0)
    try {
      const token = await getToken()
      const { documentId, uploadUrl } = await api.initiateUpload(token, {
        fileName: file.name,
        sizeBytes: file.size,
        documentType: docType,
      })
      await api.uploadToSignedUrl(uploadUrl, file, setProgress)
      await api.finalizeUpload(token, documentId)
      setStep('done')
    } catch (err) {
      setStep('form')
      if (err instanceof NotLinkedError) setNotLinked(true)
      else if (err instanceof ValidationError) setError(err.message)
      else setError('The upload didn’t finish. Please try again.')
    }
  }

  function reset() {
    setFile(null)
    setDocType('')
    setStep('form')
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (notLinked) return <NotLinkedMessage />

  return (
    <div>
      <h1 className="text-2xl font-semibold">Upload a session note</h1>
      <p className="mt-1 text-sm text-muted">
        Your care team will review the summary before you can read it. This usually takes a few days.
      </p>

      {step === 'done' ? (
        <div role="status" className="mt-6 rounded-xl border border-line bg-surface p-6">
          <p className="text-lg font-semibold">Thanks, we got your file</p>
          <p className="mt-1 text-sm text-muted">
            We’re preparing the summary now. It will show as “Being reviewed” on your sessions page until your care
            team has checked it.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-strong">
              Go to my sessions
            </Link>
            <button onClick={reset} className="rounded-lg px-4 py-2 text-sm text-muted hover:text-ink">
              Upload another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-xl border border-line bg-surface p-6" noValidate>
          <div>
            <span className="block text-sm font-medium">File</span>
            <label
              className={`mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center ${file ? 'border-accent bg-accent-soft/40' : 'border-line hover:border-accent'}`}
            >
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                className="sr-only"
                disabled={step === 'uploading'}
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <span className="font-medium">{file.name}</span>
                  <span className="mt-1 text-xs text-muted">{formatSize(file.size)} · Click to change</span>
                </>
              ) : (
                <>
                  <span className="font-medium text-accent">Choose a file</span>
                  <span className="mt-1 text-xs text-muted">.txt, .md, .docx, or .pdf, up to 10 MB</span>
                </>
              )}
            </label>
          </div>

          <label className="block text-sm font-medium">
            What kind of document is this?
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={step === 'uploading'}
              className="mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            >
              <option value="">Choose one</option>
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-problem-soft px-3 py-2 text-sm text-problem">
              {error}
            </p>
          )}

          {step === 'uploading' ? (
            <div aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">Uploading… {progress}%</p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-strong sm:w-auto"
            >
              Upload
            </button>
          )}
        </form>
      )}
    </div>
  )
}
