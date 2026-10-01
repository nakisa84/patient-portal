import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { MessageCard } from './components/Messages'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { UploadPage } from './pages/UploadPage'

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Layout>{children}</Layout>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <Routes>
      {/* "/*" lets Clerk's <SignIn routing="path"> handle its own sub-steps. */}
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/sessions/:sessionId" element={<Protected><SessionDetailPage /></Protected>} />
      <Route path="/upload" element={<Protected><UploadPage /></Protected>} />
      <Route path="*" element={<Protected><MessageCard title="Page not found" /></Protected>} />
    </Routes>
  )
}
