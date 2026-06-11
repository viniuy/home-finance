'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, RotateCcw, Trash2 } from 'lucide-react'
import type { Month } from '@/types/types'

interface MonthNavProps {
  months:         Month[]
  activeMonthId:  string | null
  onSelect:       (id: string) => void
  onCreateMonth:  () => void
  onResetMonth:   () => void
  onDeleteMonth:  () => void
}

export function MonthNav({
  months, activeMonthId, onSelect, onCreateMonth, onResetMonth, onDeleteMonth,
}: MonthNavProps) {
  const idx        = months.findIndex(m => m.id === activeMonthId)
  const active     = months[idx]
  const [open, setOpen] = useState(false)
  const menuRef    = useRef<HTMLDivElement>(null)

  /* Close on outside click */
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="flex items-center gap-2">
      {/* Month stepper */}
      <div className="flex items-center border border-border bg-bg-overlay overflow-hidden">
        <button
          onClick={() => idx < months.length - 1 && onSelect(months[idx + 1].id)}
          disabled={idx >= months.length - 1}
          className="px-2.5 py-2 text-text-faint hover:text-text hover:bg-bg-raised disabled:opacity-20 disabled:cursor-not-allowed transition-colors border-r border-border"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <span className="px-4 py-2 text-[0.75rem] font-semibold text-text min-w-[148px] text-center tracking-tight font-mono">
          {active?.label ?? '—'}
        </span>

        <button
          onClick={() => idx > 0 && onSelect(months[idx - 1].id)}
          disabled={idx <= 0}
          className="px-2.5 py-2 text-text-faint hover:text-text hover:bg-bg-raised disabled:opacity-20 disabled:cursor-not-allowed transition-colors border-l border-border"
          aria-label="Next month"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New month */}
      <button
        onClick={onCreateMonth}
        className="h-8 px-3 flex items-center gap-1.5 border border-border text-text-muted text-[0.72rem] font-semibold uppercase tracking-widest hover:text-text hover:bg-bg-overlay hover:border-brand/30 transition-colors"
      >
        <Plus className="w-3 h-3" />
        <span className="hidden sm:block">New</span>
      </button>

      {/* ⋯ actions dropdown */}
      {active && (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className={`
              h-8 w-8 flex items-center justify-center border transition-colors
              ${open
                ? 'border-brand/40 bg-[oklch(from_var(--brand)_l_c_h_/_0.07)] text-brand'
                : 'border-border text-text-faint hover:text-text hover:bg-bg-overlay hover:border-border'}
            `}
            aria-label="Month actions"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 bg-bg-raised border border-border shadow-modal overflow-hidden">
              {/* Corner accents */}
              <span className="absolute top-0 left-0  w-2 h-2 border-t border-l border-brand/30" />
              <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-brand/30" />

              <button
                onClick={() => { setOpen(false); onResetMonth() }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[0.75rem] text-text-muted hover:text-text hover:bg-bg-overlay transition-colors border-b border-border"
              >
                <RotateCcw className="w-3.5 h-3.5 text-pending flex-shrink-0" />
                <span>Reset month</span>
              </button>

              <button
                onClick={() => { setOpen(false); onDeleteMonth() }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-[0.75rem] text-text-muted hover:text-expense hover:bg-expense-dim transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-expense flex-shrink-0" />
                <span>Delete month</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
