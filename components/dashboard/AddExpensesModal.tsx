'use client'

import { useEffect, useState } from 'react'
import { Expense, Category, BillSubcategory } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'bill', label: 'Bill' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'palengke', label: 'Palengke' },
  { value: 'extra', label: 'Extra' },
]

const BILL_SUBCATEGORIES: BillSubcategory[] = [
  'Meralco',
  'Prime Water',
  'Internet',
  'HOA',
  'Netflix',
  'Gas',
  'Mineral',
  'Credit Card',
  'Amazon Prime',
]

interface AddExpenseModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    description: string
    amount: number
    category: Category
    date: string | null
  }) => Promise<void>
  initialData?: Expense | null
}

export function AddExpenseModal({
  open,
  onClose,
  onSave,
  initialData,
}: AddExpenseModalProps) {
  const [category, setCategory] = useState<Category>('bill')
  const [description, setDescription] = useState('')
  const [billSubcategory, setBillSubcategory] = useState<BillSubcategory | ''>('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const isEditing = !!initialData

  useEffect(() => {
    if (initialData) {
      setCategory(initialData.category)
      setDescription(initialData.description)
      setAmount(String(initialData.amount))
      setDate(initialData.date ?? '')
      if (initialData.category === 'bill') {
        const match = BILL_SUBCATEGORIES.find((s) => s === initialData.description)
        setBillSubcategory(match ?? '')
      }
    } else {
      setCategory('bill')
      setDescription('')
      setBillSubcategory('')
      setAmount('')
      setDate('')
    }
  }, [initialData, open])

  function resolvedDescription() {
    if (category === 'bill' && billSubcategory) return billSubcategory
    return description
  }

  async function handleSubmit() {
    const parsed = parseFloat(amount)
    if (!resolvedDescription() || isNaN(parsed) || parsed <= 0) return
    setSaving(true)
    try {
      await onSave({
        description: resolvedDescription(),
        amount: parsed,
        category,
        date: date || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {category === 'bill' ? (
            <div className="space-y-1.5">
              <Label>Bill Type</Label>
              <Select
                value={billSubcategory}
                onValueChange={(v) => setBillSubcategory(v as BillSubcategory)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bill type" />
                </SelectTrigger>
                <SelectContent>
                  {BILL_SUBCATEGORIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="e.g. SM groceries, Jollibee"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Amount (₱)</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}