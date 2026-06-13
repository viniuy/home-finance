'use client'
import { useEffect, useRef } from 'react'
import { LayoutDashboard, BarChart2, Settings, X } from 'lucide-react'
import { LogOut } from 'lucide-react'
import { ThemePicker } from '@/components/ThemeProvider'
import type { Tab } from '@/app/dashboard/page'

interface MobileSidebarProps {
  open:     boolean
  onClose:  () => void
  tab:      Tab
  onTab:    (t: Tab) => void
  onSignOut: () => void
}

const NAV = [
  { id: 'overview' as Tab, label: 'Overview',  Icon: LayoutDashboard },
  { id: 'summary'  as Tab, label: 'Summary',   Icon: BarChart2       },
  { id: 'setup'    as Tab, label: 'Setup',      Icon: Settings        },
]

export function MobileSidebar({ open, onClose, tab, onTab, onSignOut }: MobileSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!sidebarRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={sidebarRef}
        className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-bg-raised border-r border-border flex flex-col lg:hidden transition-transform duration-250 ease-out"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/icons/icon-192.png" alt="MPL" className="w-6 h-6" />
            <span className="text-[0.72rem] font-bold text-text tracking-[0.1em] uppercase">
              Mikay Pay Later
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay border border-transparent hover:border-border transition-colors rounded-[var(--radius)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { onTab(id); onClose() }}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-[0.75rem] font-bold uppercase tracking-[0.08em] transition-colors rounded-[var(--radius)]
                ${tab === id
                  ? 'bg-bg-overlay text-text border border-border'
                  : 'text-text-faint hover:text-text hover:bg-bg-overlay/60 border border-transparent'}
              `}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Bottom: theme + logout */}
        <div className="px-4 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <ThemePicker dropdownAlign="left" dropdownSide="top" />
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-3 py-2 text-[0.72rem] font-bold uppercase tracking-[0.08em] text-text-faint hover:text-expense hover:bg-expense-dim border border-transparent hover:border-expense/25 transition-colors rounded-[var(--radius)]"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}
