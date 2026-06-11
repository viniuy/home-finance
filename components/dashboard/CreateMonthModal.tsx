'use client'
import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react'
import { Modal, Input, Select } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/button'
import { getCurrentYearMonth } from '@/lib/utils'
import type { IncomeOverride } from '@/hooks/UseMonths'
import type { IncomeSource } from '@/types/types'
import { getSupabase } from '@/lib/supabase'

interface CreateMonthModalProps {
  open:     boolean
  onClose:  () => void
  onCreate: (year: number, month: number, overrides: IncomeOverride[]) => Promise<unknown>
  existing: { year: number; month: number }[]
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

type Step = 1 | 2

export function CreateMonthModal({ open, onClose, onCreate, existing }: CreateMonthModalProps) {
  const { year: cy, month: cm } = getCurrentYearMonth()

  const [step,    setStep]    = useState<Step>(1)
  const [year,    setYear]    = useState(cy)
  const [month,   setMonth]   = useState(cm)
  const [sources, setSources] = useState<IncomeSource[]>([])
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [creating,setCreating]= useState(false)

  /* Load active income sources when modal opens */
  useEffect(() => {
    if (!open) return
    setStep(1)
    setErrors({})
    async function load() {
      setLoading(true)
      const { data } = await getSupabase()
        .from('income_sources')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      const srcs: IncomeSource[] = data ?? []
      setSources(srcs)
      // Pre-fill with default_amount (blank if 0)
      const init: Record<string, string> = {}
      for (const s of srcs) {
        init[s.id] = s.default_amount > 0 ? String(s.default_amount) : ''
      }
      setAmounts(init)
      setLoading(false)
    }
    load()
  }, [open])

  const alreadyExists = existing.some(e => e.year === year && e.month === month)

  const yearOpts = [-1, 0, 1].map(offset => {
    const y = cy + offset
    return { value: String(y), label: String(y) }
  })

  /* ── Step 1 → Step 2 ──────────────────────────── */
  function goToStep2() {
    if (alreadyExists) return
    if (sources.length === 0) {
      // No income sources — go directly (will have no income)
      setStep(2)
      return
    }
    setStep(2)
    setErrors({})
  }

  /* ── Validate amounts ─────────────────────────── */
  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const s of sources) {
      const v = parseFloat(amounts[s.id] ?? '')
      if (isNaN(v) || v <= 0) {
        errs[s.id] = 'Required'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Create ───────────────────────────────────── */
  async function handleCreate() {
    if (!validate()) return
    setCreating(true)
    const overrides: IncomeOverride[] = sources.map((s, i) => ({
      source_id:  s.id,
      name:       s.name,
      amount:     parseFloat(amounts[s.id] ?? '0'),
      sort_order: s.sort_order ?? i,
    }))
    await onCreate(year, month, overrides)
    setCreating(false)
    onClose()
  }

  function handleClose() {
    setStep(1)
    setErrors({})
    onClose()
  }

  const stepTitle  = step === 1 ? 'New Budget Month'   : 'Set Income Amounts'
  const stepSubtitle = step === 1 ? 'Choose the month and year' : `For ${MONTH_NAMES[month - 1]} ${year}`

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={stepTitle}
      subtitle={stepSubtitle}
      size="sm"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-5">
        {([1, 2] as Step[]).map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`
              w-5 h-5 flex items-center justify-center text-[0.62rem] font-bold border transition-colors
              ${step === s
                ? 'bg-brand border-brand text-white'
                : step > s
                  ? 'bg-income/20 border-income text-income'
                  : 'bg-bg-overlay border-border text-text-faint'}
            `}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-[0.65rem] uppercase tracking-widest ${step === s ? 'text-text' : 'text-text-faint'}`}>
              {s === 1 ? 'Period' : 'Income'}
            </span>
            {s < 2 && <ChevronRight className="w-3 h-3 text-text-faint" />}
          </div>
        ))}
      </div>

      {/* ── Step 1 ────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Month"
              value={String(month)}
              onChange={e => setMonth(Number(e.target.value))}
              options={MONTH_NAMES.map((n, i) => ({ value: String(i + 1), label: n }))}
            />
            <Select
              label="Year"
              value={String(year)}
              onChange={e => setYear(Number(e.target.value))}
              options={yearOpts}
            />
          </div>

          {alreadyExists && (
            <div className="flex items-start gap-2.5 bg-expense-dim border border-expense/25 px-3.5 py-3">
              <AlertTriangle className="w-3.5 h-3.5 text-expense flex-shrink-0 mt-0.5" />
              <p className="text-xs text-expense">
                {MONTH_NAMES[month - 1]} {year} already exists.
              </p>
            </div>
          )}

          <p className="text-[0.72rem] text-text-muted bg-bg-overlay border border-border px-3.5 py-3 leading-relaxed">
            Bills, income sources, and expense templates will be pre-filled from your current Setup.
            You&apos;ll confirm income amounts on the next step.
          </p>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={handleClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={alreadyExists || loading}
              onClick={goToStep2}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2 ────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="flex items-start gap-2.5 bg-pending-dim border border-pending/25 px-3.5 py-3">
              <AlertTriangle className="w-3.5 h-3.5 text-pending flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-muted leading-relaxed">
                No income sources configured. Go to{' '}
                <span className="text-brand">Setup → Income Sources</span> to add them first.
                The month will still be created with zero income.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map(s => (
                <Input
                  key={s.id}
                  label={s.name}
                  type="number"
                  prefix="₱"
                  placeholder="0.00"
                  value={amounts[s.id] ?? ''}
                  onChange={e => {
                    setAmounts(prev => ({ ...prev, [s.id]: e.target.value }))
                    if (errors[s.id]) setErrors(prev => ({ ...prev, [s.id]: '' }))
                  }}
                  error={errors[s.id]}
                />
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <Button className="flex-1" loading={creating} onClick={handleCreate}>
              Create Month
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
