'use client'

import { useState } from 'react'
import { MonthlyIncome } from '@/types'
import { formatPeso } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PencilIcon, CheckIcon, XIcon } from 'lucide-react'

interface IncomeSectionProps {
  monthlyIncome: MonthlyIncome[]
  onUpdate: (id: string, amount: number) => Promise<void>
}

interface IncomeRowProps {
  item: MonthlyIncome
  onUpdate: (id: string, amount: number) => Promise<void>
}

function IncomeRow({ item, onUpdate }: IncomeRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(item.amount))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const parsed = parseFloat(value)
    if (isNaN(parsed)) return
    setSaving(true)
    await onUpdate(item.id, parsed)
    setSaving(false)
    setEditing(false)
  }

  function handleCancel() {
    setValue(String(item.amount))
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">
        {item.income_sources?.name ?? 'Unknown'}
      </span>
      {editing ? (
        <div className="flex items-center gap-1">
          <Input
            className="h-7 w-32 text-right tabular-nums text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type="number"
            min={0}
            autoFocus
          />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={saving}>
            <CheckIcon className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
            <XIcon className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold tabular-nums">{formatPeso(item.amount)}</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
            <PencilIcon className="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function IncomeSection({ monthlyIncome, onUpdate }: IncomeSectionProps) {
  const total = monthlyIncome.reduce((sum, i) => sum + i.amount, 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Income Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {monthlyIncome.length === 0 ? (
          <p className="text-sm text-muted-foreground">No income sources set for this month.</p>
        ) : (
          monthlyIncome.map((item) => (
            <IncomeRow key={item.id} item={item} onUpdate={onUpdate} />
          ))
        )}
        {monthlyIncome.length > 0 && (
          <div className="pt-2 border-t flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold tabular-nums">{formatPeso(total)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}