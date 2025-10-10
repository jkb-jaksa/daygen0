import { createContext } from 'react'

export type ThemeMode = 'night' | 'day'

export type ThemeContextValue = {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
