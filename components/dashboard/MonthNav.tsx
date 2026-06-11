'use client'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { Month } from '@/types/types'

interface MonthNavProps {
  months:        Month[]
  activeMonthId: string | null
  onSelect:      (id: string) => void
  onCreateMonth: () => void
}

export function MonthNav({ months, activeMonthId, onSelect, onCreateMonth }: MonthNavProps) {
  const idx    = months.findIndex(m => m.id === activeMonthId)
  const active = months[idx]

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
    </div>
  )
}
