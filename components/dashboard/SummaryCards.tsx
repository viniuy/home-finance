'use client'

import { Summary } from '@/types'
import { formatPeso } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUpIcon, ReceiptIcon, ShoppingCartIcon, PiggyBankIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryCardsProps {
  summary: Summary
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Total Income',
      value: formatPeso(summary.totalIncome),
      icon: TrendingUpIcon,
      description: 'This month',
      className: 'text-green-600',
    },
    {
      title: 'Bills',
      value: formatPeso(summary.totalBills),
      icon: ReceiptIcon,
      description: 'Utilities & subscriptions',
      className: 'text-blue-600',
    },
    {
      title: 'Groceries & Market',
      value: formatPeso(summary.totalGroceries + summary.totalPalengke),
      icon: ShoppingCartIcon,
      description: `Grocery ${formatPeso(summary.totalGroceries)} · Palengke ${formatPeso(summary.totalPalengke)}`,
      className: 'text-orange-600',
    },
    {
      title: 'You Saved',
      value: formatPeso(summary.savings),
      icon: PiggyBankIcon,
      description: `${summary.savingsRate.toFixed(1)}% savings rate`,
      className: summary.savings >= 0 ? 'text-green-600' : 'text-destructive',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={cn('h-4 w-4', card.className)} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', card.className)}>{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}