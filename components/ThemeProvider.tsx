'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeCtx {
  theme:  Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('kasa-theme') as Theme | null
    const initial: Theme = saved ?? 'dark'
    apply(initial)
    setTheme(initial)
  }, [])

  function apply(t: Theme) {
    document.documentElement.classList.toggle('dark', t === 'dark')
  }

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('kasa-theme', next)
      apply(next)
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

/* Inline script string — paste into layout <head> to prevent flash */
export const themeScript = `(function(){var t=localStorage.getItem('kasa-theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark')})()`
