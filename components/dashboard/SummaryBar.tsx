'use client'
import { useEffect, useRef, useState } from 'react'
import { cn, formatPeso } from '@/lib/utils'
import gsap from 'gsap'
import type { MonthlySummary } from '@/types/types'

interface SummaryBarProps {
  summary: MonthlySummary
  loading?: boolean
}

interface DisplayValues {
  income:   number
  bills:    number
  expenses: number
  savings:  number
}

export function SummaryBar({ summary, loading }: SummaryBarProps) {
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
    {
      label: 'Income',
      value: display.income,
      color: 'text-income',
      border: 'border-income/20',
      indicator: 'bg-income',
    },
    {
      label: 'Bills',
      value: display.bills,
      color: 'text-expense',
      border: 'border-expense/20',
      indicator: 'bg-expense',
    },
    {
      label: 'Expenses',
      value: display.expenses,
      color: 'text-expense',
      border: 'border-expense/20',
      indicator: 'bg-expense',
    },
    {
      label:     isSaving ? 'You Saved' : 'Over Budget',
      value:     display.savings,
      color:     isSaving ? 'text-brand' : 'text-expense',
      border:    isSaving ? 'border-brand/20' : 'border-expense/20',
      indicator: isSaving ? 'bg-brand'   : 'bg-expense',
      rate:      `${(summary.savingsRate * 100).toFixed(1)}%`,
      featured:  true,
    },
  ] as const

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 border border-border shadow-card overflow-hidden">
      {cols.map((col, i) => (
        <div
          key={col.label}
          className={cn(
            'relative flex flex-col gap-1.5 px-5 py-5 bg-bg-raised',
            i < cols.length - 1 && 'border-r border-border',
            i < 2 && 'border-b lg:border-b-0 border-border',
          )}
        >
          {/* Top accent line */}
          <div className={cn('absolute top-0 left-0 right-0 h-[2px]', col.indicator)} />

          <div className="flex items-center gap-1.5">
            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', col.indicator)} />
            <span className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em]">
              {col.label}
            </span>
          </div>

          {loading ? (
            <div className="skeleton h-9 w-32" />
          ) : (
            <span className={cn('text-[1.55rem] font-mono font-bold tabular-nums leading-none', col.color)}>
              {formatPeso(Math.abs(col.value))}
            </span>
          )}

          {'rate' in col && !loading && (
            <span className="text-[0.7rem] font-mono text-text-faint">{col.rate} saved</span>
          )}
        </div>
      ))}
    </div>
  )
}
