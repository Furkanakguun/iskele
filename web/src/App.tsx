import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './components/AppShell'
import { ActivityPage } from './pages/ActivityPage'
import { AddRepoPage } from './pages/AddRepoPage'
import { HomePage } from './pages/HomePage'
import { JobLogPage } from './pages/JobLogPage'
import { LoginPage } from './pages/LoginPage'
import { ModuleDetailPage } from './pages/ModuleDetailPage'
import { ModulesPage } from './pages/ModulesPage'
import { RepoDetailPage } from './pages/RepoDetailPage'
import { ReposPage } from './pages/ReposPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function LegacyJobRedirect() {
  const { jobId } = useParams()
  return <Navigate to={`/jobs/${jobId}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/giris" element={<Navigate to="/login" replace />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/repos" element={<ReposPage />} />
        <Route path="/repos/new" element={<AddRepoPage />} />
        <Route path="/repos/:repoId" element={<RepoDetailPage />} />
        <Route
          path="/repos/:repoId/branches/:branch"
          element={<ModulesPage />}
        />
        <Route
          path="/repos/:repoId/branches/:branch/modules/:moduleId"
          element={<ModuleDetailPage />}
        />
        <Route path="/jobs/:jobId" element={<JobLogPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/isler/:jobId" element={<LegacyJobRedirect />} />
        <Route path="/aktivite" element={<Navigate to="/activity" replace />} />
        <Route path="/ayarlar" element={<Navigate to="/settings" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
