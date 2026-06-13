'use client'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Moon, Sun, Flower2 } from 'lucide-react'

export type Theme = 'dark' | 'light' | 'sakura' | 'mango'

interface ThemeCtx {
  theme:  Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'dark', setTheme: () => {} })

function apply(t: Theme) {
  const root = document.documentElement
  root.classList.remove('dark', 'sakura', 'mango')
  if (t === 'dark')   root.classList.add('dark')
  if (t === 'sakura') root.classList.add('sakura')
  if (t === 'mango') root.classList.add('mango')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('kasa-theme') as Theme | null
    const initial: Theme = saved ?? 'dark'
    apply(initial)
    setThemeState(initial)
  }, [])

  function setTheme(t: Theme) {
    localStorage.setItem('kasa-theme', t)
    apply(t)
    setThemeState(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

/* ── Theme Picker dropdown ───────────────────────────────────── */
const THEMES: { id: Theme; label: string; Icon: React.ElementType; swatch: string }[] = [
  { id: 'dark',   label: 'Dark',   Icon: Moon,    swatch: 'oklch(0.148 0.004 228.8)' },
  { id: 'light',  label: 'Light',  Icon: Sun,     swatch: 'oklch(0.98 0.002 214.3)'  },
  { id: 'sakura', label: 'Sakura', Icon: Flower2, swatch: 'oklch(0.62 0.18 350)'     },
  { id: 'mango', label: 'Mango', Icon: Sun, swatch: 'oklch(0.68 0.19 58)' }
]

export function ThemePicker({
  dropdownAlign = 'right',
  dropdownSide  = 'bottom',
}: {
  dropdownAlign?: 'left' | 'right'
  dropdownSide?:  'top'  | 'bottom'
}) {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = THEMES.find(t => t.id === theme)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`
          h-8 px-2.5 flex items-center gap-1.5 border transition-colors text-[0.7rem] font-bold uppercase tracking-[0.08em]
          ${open
            ? 'border-brand/40 bg-[oklch(from_var(--brand)_l_c_h_/_0.08)] text-brand'
            : 'border-border text-text-faint hover:text-text hover:bg-bg-overlay border-transparent hover:border-border'}
        `}
        title="Switch theme"
      >
        <span className="w-2.5 h-2.5 rounded-full border border-border flex-shrink-0" style={{ background: current.swatch }} />
        <current.Icon className="w-3 h-3" />
      </button>

      {open && (
        <div className={`
          absolute z-50 w-36 bg-bg-raised border border-border shadow-modal overflow-hidden
          ${dropdownAlign === 'left' ? 'left-0' : 'right-0'}
          ${dropdownSide  === 'top'  ? 'bottom-[calc(100%+4px)]' : 'top-[calc(100%+4px)]'}
        `}>
          <span className="absolute top-0 left-0  w-2 h-2 border-t border-l border-brand/30" />
          <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-brand/30" />

          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false) }}
              className={`
                w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[0.72rem] transition-colors
                ${theme === t.id
                  ? 'text-brand bg-[oklch(from_var(--brand)_l_c_h_/_0.07)]'
                  : 'text-text-muted hover:text-text hover:bg-bg-overlay'}
                ${t.id !== 'sakura' ? 'border-b border-border' : ''}
              `}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-border flex-shrink-0" style={{ background: t.swatch }} />
              <t.Icon className="w-3 h-3 flex-shrink-0" />
              <span className="font-semibold">{t.label}</span>
              {theme === t.id && <span className="ml-auto text-brand text-[8px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Anti-flash script — paste into layout <head> */
export const themeScript = `(function(){
  var t=localStorage.getItem('kasa-theme')||'dark';
  var r=document.documentElement;
  r.classList.remove('dark','sakura','mango');
  if(t==='dark')   r.classList.add('dark');
  if(t==='sakura') r.classList.add('sakura');
  if(t==='mango')  r.classList.add('mango');
})()`
