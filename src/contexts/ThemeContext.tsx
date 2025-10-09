import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'night' | 'day'

type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'daygen-theme'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'night'
  }

  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
  if (stored === 'day' || stored === 'night') {
    return stored
  }

  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'night' : 'day'
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initial = readInitialTheme()
    applyTheme(initial)
    return initial
  })

  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Ignore storage errors (e.g., in private mode)
    }
  }, [theme])

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'night' ? 'day' : 'night'))
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
