import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppConfigProvider } from './auth/AppConfigContext'
import { AuthProvider } from './auth/AuthContext'
import { WorkspaceProvider } from './workspace/WorkspaceContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppConfigProvider>
          <WorkspaceProvider>
            <App />
          </WorkspaceProvider>
        </AppConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
