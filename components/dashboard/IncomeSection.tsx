'use client'
import { Card, CardHeader, CardTitle } from '@/components/ui/Primitives'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { formatPeso } from '@/lib/utils'
import type { Month, MonthlyIncome } from '@/types/types'

interface IncomeSectionProps {
  month:    Month | null
  income:   MonthlyIncome[]
  onUpdate: (id: string, amount: number) => Promise<void>
}

export function IncomeSection({ month, income, onUpdate }: IncomeSectionProps) {
  const base     = income.reduce((s, r) => s + r.amount, 0)
  const rollover = month?.rollover_amount ?? 0
  const total    = base + rollover

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income</CardTitle>
        <span className="text-xs font-mono font-bold text-income tabular-nums">
          {formatPeso(total)}
        </span>
      </CardHeader>

      <div className="divide-y divide-border/40">
        {income.map(row => (
          <div
            key={row.id}
            className="flex items-center justify-between px-5 py-3 hover:bg-bg-overlay/50 transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-[3px] h-4 bg-income/30 flex-shrink-0 group-hover:bg-income/70 transition-colors" />
              <span className="text-sm text-text truncate">{row.name}</span>
            </div>
            <InlineEdit value={row.amount} onSave={v => onUpdate(row.id, v)} />
          </div>
        ))}

        {rollover > 0 && (
          <div className="flex items-center justify-between px-5 py-3 bg-income-dim/40">
            <div className="flex items-center gap-2.5">
              <span className="w-[3px] h-4 bg-income/50 flex-shrink-0" />
              <span className="text-sm text-income font-medium">Rolled-over savings</span>
              <span className="text-[0.6rem] font-bold text-income bg-income-dim border border-income/20 px-1.5 py-0.5 uppercase tracking-widest">
                Prev
              </span>
            </div>
            <span className="text-sm font-mono text-income tabular-nums">{formatPeso(rollover)}</span>
          </div>
        )}

        {income.length === 0 && (
          <p className="px-5 py-8 text-xs text-text-faint text-center">
            No income sources. Add them in Setup.
          </p>
        )}
      </div>
    </Card>
  )
}
