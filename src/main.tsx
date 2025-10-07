import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PasswordGate from './components/PasswordGate'
import { AuthProvider } from './auth/AuthContext'
import { FooterProvider } from './contexts/FooterContext.tsx'
import { ToastProvider } from './contexts/ToastProvider.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'


const App = lazy(() => import('./App'))

export function RootFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-theme-black-subtle text-theme-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-theme-white/30 border-t-theme-white" aria-hidden="true" />
        <span className="font-raleway text-sm uppercase tracking-[0.3em] text-theme-white/60">
          Loading…
        </span>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<RootFallback />}>
      <ThemeProvider>
        <PasswordGate>
          <AuthProvider>
            <ToastProvider>
              <FooterProvider>
                <App />
              </FooterProvider>
            </ToastProvider>
          </AuthProvider>
        </PasswordGate>
      </ThemeProvider>
    </Suspense>
  </StrictMode>,
)
