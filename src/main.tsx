import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PasswordGate from './components/PasswordGate'
import { AuthProvider } from './auth/AuthContext'
import { FooterProvider } from './contexts/FooterContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <AuthProvider>
        <FooterProvider>
          <App />
        </FooterProvider>
      </AuthProvider>
    </PasswordGate>
  </StrictMode>,
)
