'use client'
import { useState } from 'react'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, Toggle, Input, Modal } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/useSettings'
import { useTemplates } from '@/hooks/useTemplates'
import type { BillTemplate, IncomeSource, MonthlyExpenseTemplate } from '@/types/types'

export function SettingsPanel() {
  const { settings, toggleRollover } = useSettings()
  const {
    incomeSources, billTemplates, expTemplates,
    addIncomeSource, updateIncomeSource, deleteIncomeSource,
    addBillTemplate, updateBillTemplate, deleteBillTemplate,
    addExpTemplate,  deleteExpTemplate,  updateExpTemplate,
  } = useTemplates()

  // Bill modal
  const [billModal,  setBillModal]  = useState(false)
  const [billName,   setBillName]   = useState('')
  const [billAmt,    setBillAmt]    = useState('')
  const [billVar,    setBillVar]    = useState(false)
  const [billDueDay, setBillDueDay] = useState('')
  const [billSaving, setBillSaving] = useState(false)
  const [billNameErr,setBillNameErr]= useState('')
  const [billAmtErr, setBillAmtErr] = useState('')

  // Income modal
  const [incModal,   setIncModal]   = useState(false)
  const [incName,    setIncName]    = useState('')
  const [incAmt,     setIncAmt]     = useState('')
  const [incSaving,  setIncSaving]  = useState(false)
  const [incNameErr, setIncNameErr] = useState('')
  const [incAmtErr,  setIncAmtErr]  = useState('')

  // Expense template modal
  const [expModal,   setExpModal]   = useState(false)
  const [expName,    setExpName]    = useState('')
  const [expSaving,  setExpSaving]  = useState(false)
  const [expNameErr, setExpNameErr] = useState('')

  async function handleAddBill() {
    setBillNameErr(''); setBillAmtErr('')
    if (!billName.trim()) { setBillNameErr('Required'); return }
    const amount = billVar ? 0 : parseFloat(billAmt)
    if (!billVar && (isNaN(amount) || amount < 0)) { setBillAmtErr('Enter a valid amount'); return }
    const dueDay = billDueDay ? parseInt(billDueDay) : null
    setBillSaving(true)
    await addBillTemplate(billName.trim(), amount, billVar, dueDay)
    setBillSaving(false)
    setBillName(''); setBillAmt(''); setBillVar(false); setBillDueDay(''); setBillModal(false)
  }

  async function handleAddIncome() {
    setIncNameErr(''); setIncAmtErr('')
    if (!incName.trim()) { setIncNameErr('Required'); return }
    const parsed = parseFloat(incAmt)
    if (isNaN(parsed) || parsed < 0) { setIncAmtErr('Enter a valid amount'); return }
    setIncSaving(true)
    await addIncomeSource(incName.trim(), parsed)
    setIncSaving(false)
    setIncName(''); setIncAmt(''); setIncModal(false)
  }

  async function handleAddExpTemplate() {
    setExpNameErr('')
    if (!expName.trim()) { setExpNameErr('Required'); return }
    setExpSaving(true)
    await addExpTemplate(expName.trim())
    setExpSaving(false)
    setExpName(''); setExpModal(false)
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* ── Rollover ──────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle>Savings Rollover</CardTitle></CardHeader>
        <div className="px-5 py-4">
          <Toggle
            checked={settings?.rollover_savings ?? false}
            onChange={toggleRollover}
            label="Roll over savings to next month"
            description="When creating a new month, leftover savings from the previous month are added as income."
          />
        </div>
      </Card>

      {/* ── Income Sources ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Income Sources</CardTitle>
          <Button variant="ghost" size="xs" onClick={() => setIncModal(true)}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </CardHeader>
        <p className="px-5 pt-3 pb-1 text-[0.72rem] text-text-faint">
          Default amounts are pre-filled when creating a month — you&apos;ll confirm them in the creation wizard.
        </p>
        <TemplateList
          items={incomeSources}
          renderAmount={(s: IncomeSource) => s.default_amount > 0 ? `₱${s.default_amount.toLocaleString()}` : 'no default'}
          onToggleActive={(s: IncomeSource) => updateIncomeSource(s.id, { is_active: !s.is_active })}
          onDelete={(s: IncomeSource) => deleteIncomeSource(s.id)}
        />
      </Card>

      {/* ── Bill Templates ────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Templates</CardTitle>
          <Button variant="ghost" size="xs" onClick={() => setBillModal(true)}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </CardHeader>
        <TemplateList
          items={billTemplates}
          renderAmount={(b: BillTemplate) =>
            b.is_variable ? 'variable' : `₱${b.default_amount.toLocaleString()}`
          }
          renderBadge={(b: BillTemplate) => b.is_variable
            ? <span className="text-[0.58rem] font-bold text-pending bg-pending-dim border border-pending/20 px-1.5 py-0.5 uppercase tracking-widest">Var</span>
            : <span className="text-[0.58rem] font-bold text-text-faint bg-bg-overlay border border-border px-1.5 py-0.5 uppercase tracking-widest">Fixed</span>
          }
          onToggleActive={(b: BillTemplate) => updateBillTemplate(b.id, { is_active: !b.is_active })}
          onDelete={(b: BillTemplate) => deleteBillTemplate(b.id)}
        />
      </Card>

      {/* ── Expense Templates ─────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Templates</CardTitle>
          <Button variant="ghost" size="xs" onClick={() => setExpModal(true)}>
            <Plus className="w-3 h-3" /> Add
          </Button>
        </CardHeader>
        <p className="px-5 pt-3 pb-1 text-[0.72rem] text-text-faint">
          Pre-populated in every new month. Log the amount when the expense happens.
        </p>
        <TemplateList
          items={expTemplates}
          onToggleActive={(t: MonthlyExpenseTemplate) => updateExpTemplate(t.id, { is_active: !t.is_active })}
          onDelete={(t: MonthlyExpenseTemplate) => deleteExpTemplate(t.id)}
        />
      </Card>

      {/* ── Modals ─────────────────────────────────── */}

      <Modal open={billModal} onClose={() => setBillModal(false)} title="Add Bill Template" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Bill Name"
            placeholder="e.g. Meralco, Prime Water, HOA"
            value={billName}
            onChange={e => setBillName(e.target.value)}
            error={billNameErr}
            autoFocus
          />

          <Toggle
            checked={billVar}
            onChange={v => { setBillVar(v); setBillAmtErr('') }}
            label="Variable amount"
            description="The bill changes each month — you'll log the amount in the Overview."
          />

          {!billVar && (
            <Input
              label="Default Amount"
              type="number"
              prefix="₱"
              placeholder="0.00"
              value={billAmt}
              onChange={e => setBillAmt(e.target.value)}
              error={billAmtErr}
              hint="Used as the starting value when creating a new month."
            />
          )}

          {billVar && (
            <p className="text-[0.72rem] text-text-faint bg-bg-overlay border border-border px-3.5 py-2.5">
              Variable bills start at ₱0 each month and show a <span className="text-pending font-bold">UPD</span> badge until you log the actual amount.
            </p>
          )}

          <Input
            label="Due Day (optional)"
            type="number"
            placeholder="e.g. 15"
            value={billDueDay}
            onChange={e => setBillDueDay(e.target.value)}
            hint="Day of the month this bill is due (1–31). Leave blank if no fixed due date."
          />

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setBillModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={billSaving} onClick={handleAddBill}>Add Bill</Button>
          </div>
        </div>
      </Modal>

      <Modal open={incModal} onClose={() => setIncModal(false)} title="Add Income Source" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            placeholder="e.g. Salary, Lola's Allowance"
            value={incName}
            onChange={e => setIncName(e.target.value)}
            error={incNameErr}
            autoFocus
          />
          <Input
            label="Default Amount"
            type="number"
            prefix="₱"
            placeholder="0.00"
            value={incAmt}
            onChange={e => setIncAmt(e.target.value)}
            error={incAmtErr}
            hint="Leave at 0 if the amount varies — you'll set it when creating each month."
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setIncModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={incSaving} onClick={handleAddIncome}>Add</Button>
          </div>
        </div>
      </Modal>

      <Modal open={expModal} onClose={() => setExpModal(false)} title="Add Expense Template" size="sm">
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            placeholder="e.g. SM Grocery, Palengke, Haircut"
            value={expName}
            onChange={e => setExpName(e.target.value)}
            error={expNameErr}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleAddExpTemplate() }}
            hint="Will appear in all future months, not past ones."
          />
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setExpModal(false)}>Cancel</Button>
            <Button className="flex-1" loading={expSaving} onClick={handleAddExpTemplate}>Add Template</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Generic template list ─────────────────────────────────────
function TemplateList<T extends { id: string; name: string; is_active: boolean }>({
  items, renderAmount, renderBadge, onToggleActive, onDelete,
}: {
  items:          T[]
  renderAmount?:  (item: T) => string
  renderBadge?:   (item: T) => React.ReactNode
  onToggleActive: (item: T) => void
  onDelete:       (item: T) => void
}) {
  if (items.length === 0) {
    return <p className="px-5 py-6 text-xs text-text-faint text-center">None yet.</p>
  }
  return (
    <div className="divide-y divide-border/40">
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-center justify-between px-5 py-3 group hover:bg-bg-overlay/50 transition-colors ${!item.is_active ? 'opacity-40' : ''}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-[3px] h-4 bg-border-light flex-shrink-0 group-hover:bg-brand/40 transition-colors" />
            <span className="text-sm text-text truncate">{item.name}</span>
            {renderBadge?.(item)}
          </div>
          <div className="flex items-center gap-1.5">
            {renderAmount && (
              <span className="text-xs font-mono text-text-muted tabular-nums mr-1">
                {renderAmount(item)}
              </span>
            )}
            <button
              onClick={() => onToggleActive(item)}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-text-faint hover:text-text transition-all hover:bg-bg-overlay"
              title={item.is_active ? 'Disable' : 'Enable'}
            >
              {item.is_active ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
            </button>
            <button
              onClick={() => onDelete(item)}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-text-faint hover:text-expense transition-all hover:bg-expense-dim"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
