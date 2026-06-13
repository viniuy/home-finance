'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, Modal, Input } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/button'
import { InlineEdit } from '@/components/ui/InlineEdit'
import { formatPeso } from '@/lib/utils'
import type { MonthlyExpense } from '@/types/types'

interface MonthlyExpensesSectionProps {
  expenses:    MonthlyExpense[]
  onLog:       (id: string, amount: number) => Promise<void>
  onClear:     (id: string) => Promise<void>
  onAddOneOff: (name: string) => Promise<void>
}

export function MonthlyExpensesSection({ expenses, onLog, onClear, onAddOneOff }: MonthlyExpensesSectionProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving,  setSaving]  = useState(false)

  const logged   = expenses.filter(e => e.amount != null)
  const unlogged = expenses.filter(e => e.amount == null)
  const total    = logged.reduce((s, e) => s + (e.amount ?? 0), 0)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    await onAddOneOff(newName.trim())
    setSaving(false)
    setNewName('')
    setAddOpen(false)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Monthly Expenses</CardTitle>
            {unlogged.length > 0 && (
              <span className="text-[0.6rem] text-text-faint bg-bg-overlay border border-border px-1.5 py-0.5 uppercase tracking-widest">
                {unlogged.length} not logged
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {total > 0 && (
              <span className="text-xs font-mono font-bold text-expense tabular-nums">
                {formatPeso(total)}
              </span>
            )}
            <Button variant="ghost" size="xs" onClick={() => setAddOpen(true)}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </CardHeader>

        <div className="divide-y divide-border/40">
          {expenses.length === 0 && (
            <p className="px-5 py-8 text-xs text-text-faint text-center">
              No expense templates. Add some in Setup.
            </p>
          )}

          {unlogged.map(exp => (
            <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-overlay/50 transition-colors group border-l-2 border-brand/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[3px] h-4 bg-brand/50 flex-shrink-0 group-hover:bg-brand transition-colors" />
                <span className="text-sm text-text truncate">{exp.name}</span>
              </div>
              <InlineEdit value={null} onSave={v => onLog(exp.id, v)} placeholder="Log amount" />
            </div>
          ))}

          {logged.map(exp => (
            <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-overlay/50 transition-colors group opacity-45 hover:opacity-70">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[3px] h-4 bg-income/30 flex-shrink-0 group-hover:bg-income/60 transition-colors" />
                <span className="text-sm text-text-muted line-through truncate">{exp.name}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <InlineEdit value={exp.amount} onSave={v => onLog(exp.id, v)} />
                <button
                  onClick={() => onClear(exp.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-text-faint hover:text-expense transition-all hover:bg-expense-dim"
                  title="Clear"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add One-Off Expense" subtitle="This month only — not a template" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Expense name"
            placeholder="e.g. Extra grocery, Haircut"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            autoFocus
            hint="For recurring expenses, add a template in Setup instead."
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>Add</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
