'use client'

import { Summary } from '@/types'
import { formatPeso } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CategoryBreakdownProps {
  summary: Summary
}

interface BarRowProps {
  label: string
  amount: number
  total: number
  colorClass: string
}

function BarRow({ label, amount, total, colorClass }: BarRowProps) {
  const pct = total > 0 ? (amount / total) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{formatPeso(amount)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export function CategoryBreakdown({ summary }: CategoryBreakdownProps) {
  const rows = [
    { label: 'Bills', amount: summary.totalBills, colorClass: 'bg-blue-500' },
    { label: 'Grocery', amount: summary.totalGroceries, colorClass: 'bg-green-500' },
    { label: 'Palengke', amount: summary.totalPalengke, colorClass: 'bg-orange-500' },
    { label: 'Extras', amount: summary.totalExtras, colorClass: 'bg-purple-500' },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Spending Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <BarRow
            key={row.label}
            {...row}
            total={summary.totalIncome}
          />
        ))}
        <div className="pt-2 border-t flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Spent</span>
          <span className="font-semibold tabular-nums">{formatPeso(summary.totalExpenses)}</span>
        </div>
      </CardContent>
    </Card>
  )
}