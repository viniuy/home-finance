'use client'
import { Card, CardHeader, CardTitle } from '@/components/ui/Primitives'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { formatPeso } from '@/lib/utils'
import type { MonthlyBill } from '@/types/types'

interface BillsSectionProps {
  bills:    MonthlyBill[]
  onUpdate: (id: string, amount: number) => Promise<void>
}

export function BillsSection({ bills, onUpdate }: BillsSectionProps) {
  const total        = bills.reduce((s, b) => s + b.amount, 0)
  const pendingCount = bills.filter(b => b.is_variable && !b.is_updated).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Bills</CardTitle>
          {pendingCount > 0 && (
            <span className="text-[0.6rem] font-bold bg-pending-dim text-pending border border-pending/25 px-1.5 py-0.5 uppercase tracking-widest">
              {pendingCount} pending
            </span>
          )}
        </div>
        <span className="text-xs font-mono font-bold text-expense tabular-nums">
          {formatPeso(total)}
        </span>
      </CardHeader>

      <div className="divide-y divide-border/40">
        {bills.length === 0 && (
          <p className="px-5 py-8 text-xs text-text-faint text-center">
            No bill templates configured.
          </p>
        )}
        {bills.map(bill => {
          const isPending = bill.is_variable && !bill.is_updated
          return (
            <div
              key={bill.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-bg-overlay/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`
                  w-[3px] h-4 flex-shrink-0 transition-colors
                  ${isPending ? 'bg-pending/50 group-hover:bg-pending' :
                    bill.is_variable ? 'bg-income/40 group-hover:bg-income/70' :
                    'bg-border group-hover:bg-border-light'}
                `} />
                <span className="text-sm text-text truncate">{bill.name}</span>
                {bill.is_variable && (
                  <span className={`
                    text-[0.6rem] font-bold px-1.5 py-0.5 uppercase tracking-widest
                    hidden group-hover:inline-block
                    ${isPending
                      ? 'text-pending bg-pending-dim border border-pending/20'
                      : 'text-text-faint bg-bg-overlay border border-border'}
                  `}>
                    {isPending ? 'var' : 'ok'}
                  </span>
                )}
              </div>
              <InlineEdit
                value={bill.amount}
                onSave={v => onUpdate(bill.id, v)}
                pending={isPending}
              />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
