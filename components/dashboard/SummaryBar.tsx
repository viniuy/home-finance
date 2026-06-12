'use client'
import { useEffect, useRef, useState } from 'react'
import { cn, formatPeso } from '@/lib/utils'
import gsap from 'gsap'
import type { MonthlySummary } from '@/types/types'
import type { MobileSection } from '@/components/dashboard/BottomNav'

interface SummaryBarProps {
  summary:       MonthlySummary
  loading?:      boolean
  activeSection?: MobileSection  // passed from mobile bottom nav
}

interface DisplayValues {
  income: number; bills: number; expenses: number; savings: number
}

// Map mobile section → which summary bar col is "active"
const SECTION_MAP: Record<MobileSection, number> = {
  income:   0,
  bills:    1,
  expenses: 2,
  misc:     2,  // misc maps to expenses col (same pool)
}

export function SummaryBar({ summary, loading, activeSection }: SummaryBarProps) {
  const [display, setDisplay] = useState<DisplayValues>({ income: 0, bills: 0, expenses: 0, savings: 0 })
  const objRef   = useRef({ income: 0, bills: 0, expenses: 0, savings: 0 })
  const tweenRef = useRef<gsap.core.Tween | null>(null)

  useEffect(() => {
    if (loading) return
    tweenRef.current?.kill()

    const target = {
      income:   summary.totalIncome,
      bills:    summary.totalBills,
      expenses: summary.totalMonthlyExpenses + summary.totalMisc,
      savings:  summary.savings,
    }

    tweenRef.current = gsap.to(objRef.current, {
      ...target,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => setDisplay({ ...objRef.current }),
    })

    return () => { tweenRef.current?.kill() }
  }, [summary.totalIncome, summary.totalBills, summary.savings, loading])

  const isSaving = summary.savings >= 0

  const cols = [
    { label: 'Income',   value: display.income,   color: 'text-income', indicator: 'bg-income', border: 'border-income/20' },
    { label: 'Bills',    value: display.bills,     color: 'text-expense', indicator: 'bg-expense', border: 'border-expense/20' },
    { label: 'Expenses', value: display.expenses,  color: 'text-expense', indicator: 'bg-expense', border: 'border-expense/20' },
    {
      label:     isSaving ? 'You Saved' : 'Over Budget',
      value:     display.savings,
      color:     isSaving ? 'text-brand' : 'text-expense',
      indicator: isSaving ? 'bg-brand'   : 'bg-expense',
      border:    isSaving ? 'border-brand/20' : 'border-expense/20',
      rate:      `${(summary.savingsRate * 100).toFixed(1)}%`,
      featured:  true,
    },
  ] as const

  // Active column index on mobile (undefined on desktop = no highlight)
  const activeColIdx = activeSection !== undefined ? SECTION_MAP[activeSection] : undefined

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-border shadow-card overflow-hidden">
      {cols.map((col, i) => {
        const isActive = activeColIdx === i

        return (
          <div
            key={col.label}
            className={cn(
              'relative flex flex-col gap-1.5 px-4 py-4 sm:px-5 sm:py-5 bg-bg-raised transition-colors duration-200',
              i < cols.length - 1 && 'border-r border-border',
              i < 2 && 'border-b lg:border-b-0 border-border',
              // Mobile active: very subtle background tint — not loud
              isActive && 'bg-bg-overlay',
            )}
          >
            {/* Top accent line — slightly thicker + brighter when active on mobile */}
            <div className={cn(
              'absolute top-0 left-0 right-0 transition-all duration-200',
              isActive ? 'h-[3px] opacity-100' : 'h-[2px] opacity-60 lg:opacity-100',
              col.indicator,
            )} />

            <div className="flex items-center gap-1.5">
              <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', col.indicator)} />
              <span className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em]">
                {col.label}
              </span>
            </div>

            {loading ? (
              <div className="skeleton h-8 sm:h-9 w-28 sm:w-32" />
            ) : (
              <span className={cn(
                'font-mono font-bold tabular-nums leading-none',
                'text-[1.2rem] sm:text-[1.55rem]',
                col.color,
              )}>
                {formatPeso(Math.abs(col.value))}
              </span>
            )}

            {'rate' in col && !loading && (
              <span className="text-[0.7rem] font-mono text-text-faint">{col.rate} saved</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
