import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import App from './App.tsx'
import { ClerkAuthProvider } from './auth/ClerkAuthProvider.tsx'
import { DemoAuthProvider } from './auth/DemoAuthProvider.tsx'
import './index.css'

// With a Clerk key, sign-in goes through Clerk. Without one, the app runs in demo mode.
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
// VITE_MEMORY_ROUTER=true builds a self-contained demo that doesn't depend on the page URL.
const Router = import.meta.env.VITE_MEMORY_ROUTER === 'true' ? MemoryRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      {clerkKey ? (
        <ClerkAuthProvider publishableKey={clerkKey}>
          <App />
        </ClerkAuthProvider>
      ) : (
        <DemoAuthProvider>
          <App />
        </DemoAuthProvider>
      )}
    </Router>
  </StrictMode>,
)
