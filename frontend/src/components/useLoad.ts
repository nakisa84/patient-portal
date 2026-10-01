import { useCallback, useEffect, useRef, useState } from 'react'
import { NotFoundError, NotLinkedError } from '../api'
import { onMockChange } from '../api/mockApi'
import { useAuth } from '../auth/AuthContext'

export type LoadState<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T }
  | { kind: 'not-found' }
  | { kind: 'not-linked' }
  | { kind: 'error' }

/** Loads data with a fresh token and reloads when the mock backend changes state. */
export function useLoad<T>(loader: (token: string) => Promise<T>, deps: unknown[]): LoadState<T> {
  const { getToken } = useAuth()
  // Keep the latest getToken without re-running effects if its identity changes.
  const tokenRef = useRef(getToken)
  tokenRef.current = getToken
  const [state, setState] = useState<LoadState<T>>({ kind: 'loading' })

  const load = useCallback(loader, deps)

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const data = await load(await tokenRef.current())
        if (active) setState({ kind: 'ready', data })
      } catch (err) {
        if (!active) return
        if (err instanceof NotFoundError) setState({ kind: 'not-found' })
        else if (err instanceof NotLinkedError) setState({ kind: 'not-linked' })
        else setState({ kind: 'error' })
      }
    }
    void run()
    const unsubscribe = onMockChange(() => void run())
    return () => {
      active = false
      unsubscribe()
    }
  }, [load])

  return state
}
