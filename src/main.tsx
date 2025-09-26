import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PasswordGate from './components/PasswordGate'
import { AuthProvider } from './auth/AuthContext'
import { FooterProvider } from './contexts/FooterContext.tsx'

const App = lazy(() => import('./App'))

export function RootFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-d-black text-d-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-d-white/30 border-t-d-white" aria-hidden="true" />
        <span className="font-raleway text-sm uppercase tracking-[0.3em] text-d-white/60">
          Loading…
        </span>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<RootFallback />}>
      <PasswordGate>
        <AuthProvider>
          <FooterProvider>
            <App />
          </FooterProvider>
        </AuthProvider>
      </PasswordGate>
    </Suspense>
  </StrictMode>,
)
