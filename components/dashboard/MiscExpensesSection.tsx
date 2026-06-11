'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, Modal, Input } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/button'
import { formatPeso } from '@/lib/utils'
import type { MiscExpense } from '@/types/types'

interface MiscExpensesSectionProps {
  expenses: MiscExpense[]
  onAdd:    (name: string, amount: number) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function MiscExpensesSection({ expenses, onAdd, onDelete }: MiscExpensesSectionProps) {
  const [open,     setOpen]     = useState(false)
  const [name,     setName]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [nameErr,  setNameErr]  = useState('')
  const [amtErr,   setAmtErr]   = useState('')

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  async function handleAdd() {
    setNameErr(''); setAmtErr('')
    if (!name.trim())                 { setNameErr('Required'); return }
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) { setAmtErr('Enter a valid amount'); return }
    setSaving(true)
    await onAdd(name.trim(), parsed)
    setSaving(false)
    setName(''); setAmount(''); setOpen(false)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await onDelete(id)
    setDeleting(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Misc. Expenses</CardTitle>
          <div className="flex items-center gap-2.5">
            {total > 0 && (
              <span className="text-xs font-mono font-bold text-expense tabular-nums">
                {formatPeso(total)}
              </span>
            )}
            <Button variant="ghost" size="xs" onClick={() => setOpen(true)}>
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
        </CardHeader>

        <div className="divide-y divide-border/40">
          {expenses.length === 0 && (
            <p className="px-5 py-7 text-xs text-text-faint text-center">
              No one-off expenses this month.
            </p>
          )}
          {expenses.map(exp => (
            <div key={exp.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-overlay/50 transition-colors group">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-[3px] h-4 bg-text-faint/30 flex-shrink-0 group-hover:bg-expense/40 transition-colors" />
                <span className="text-sm text-text truncate">{exp.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono tabular-nums text-text">{formatPeso(exp.amount)}</span>
                <button
                  onClick={() => handleDelete(exp.id)}
                  disabled={deleting === exp.id}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-text-faint hover:text-expense transition-all hover:bg-expense-dim disabled:opacity-30"
                >
                  {deleting === exp.id
                    ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    : <Trash2 className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Misc. Expense" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Description"
            placeholder="e.g. Doctor visit, Car repair"
            value={name}
            onChange={e => setName(e.target.value)}
            error={nameErr}
            autoFocus
          />
          <Input
            label="Amount"
            type="number"
            prefix="₱"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
            error={amtErr}
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleAdd}>Add</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
