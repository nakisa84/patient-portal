import { mockApi } from './mockApi'
import type { PortalApi } from './types'

// Swap for an HTTP client once the FastAPI backend exists.
export const api: PortalApi = mockApi

export * from './types'
