'use client'
import { useState, useReducer, useEffect, useRef, useCallback } from 'react'
import { ShoppingCart, X, Delete, Plus, Trash2, Save, AlertTriangle, Wifi, WifiOff, ChevronRight } from 'lucide-react'
import gsap from 'gsap'
import { formatPeso } from '@/lib/utils'
import { getSupabase } from '@/lib/supabase'
import type { MonthlyExpense } from '@/types/types'
import { useGrocerySession } from '@/hooks/useGrocerySession'
import type { GroceryCategory, GroceryItem } from '@/hooks/useGrocerySession'

// ── Category config ───────────────────────────────────────────
type CategoryDef =
  | { id: GroceryCategory; label: string; emoji: string; group?: never }
  | { group: 'Person'; label: string; emoji: string; id?: never; children: GroceryCategory[] }

const CATEGORIES: CategoryDef[] = [
  { id: 'Frozen Food',       label: 'Frozen Food',       emoji: '🧊' },
  { id: 'Vegetables',        label: 'Vegetables',        emoji: '🥦' },
  { id: 'Meat',              label: 'Meat',              emoji: '🥩' },
  { id: 'Snacks',            label: 'Snacks',            emoji: '🍿' },
  { id: 'Laundry',           label: 'Laundry',           emoji: '🧺' },
  { id: 'Kitchen Essential', label: 'Kitchen Essential', emoji: '🍳' },
  { id: 'Dogs',              label: 'Dogs',              emoji: '🐶' },
  { id: 'Home Cleaning',     label: 'Home Cleaning',     emoji: '🧹' },
  {
    group: 'Person', label: 'Person', emoji: '👤',
    children: ['Vincent', 'Aiden', 'Karen', 'Lola', 'Ailene', 'Mikay'],
  },
]

const CATEGORY_EMOJI: Record<GroceryCategory, string> = {
  'Frozen Food': '🧊', 'Vegetables': '🥦', 'Meat': '🥩', 'Snacks': '🍿',
  'Laundry': '🧺', 'Kitchen Essential': '🍳', 'Dogs': '🐶', 'Home Cleaning': '🧹',
  'Vincent': '👤', 'Aiden': '👤', 'Karen': '👤', 'Lola': '👤', 'Ailene': '👤', 'Mikay': '👤',
}

// ── Calculator state (same as main Calculator) ────────────────
interface CalcState {
  display: string; expression: string
  prevValue: number | null; operator: string | null
  justEvaluated: boolean; waitingForOperand: boolean
}
type CalcAction =
  | { type: 'DIGIT'; digit: string } | { type: 'DECIMAL' }
  | { type: 'OPERATOR'; op: string } | { type: 'EQUALS' }
  | { type: 'CLEAR' } | { type: 'TOGGLE_SIGN' } | { type: 'PERCENT' } | { type: 'BACKSPACE' }
  | { type: 'SET'; value: number }

function calc(a: number, b: number, op: string): number {
  switch (op) {
    case '+': return a + b; case '−': return a - b
    case '×': return a * b; case '÷': return b !== 0 ? a / b : 0
    default: return b
  }
}
function fmt(n: number): string { const s = parseFloat(n.toFixed(10)); return isNaN(s) ? '0' : String(s) }
function formatDisplay(s: string): string {
  const [int, dec] = s.split('.')
  return dec !== undefined ? `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}` : int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const CALC_INIT: CalcState = { display: '0', expression: '', prevValue: null, operator: null, justEvaluated: false, waitingForOperand: false }

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  const { display, prevValue, operator, justEvaluated } = state
  const current = parseFloat(display)
  switch (action.type) {
    case 'DIGIT': {
      if (state.waitingForOperand || justEvaluated) return { ...state, display: action.digit, justEvaluated: false, waitingForOperand: false }
      if (display === '0') return { ...state, display: action.digit }
      if (display.replace('-', '').length >= 12) return state
      return { ...state, display: display + action.digit }
    }
    case 'DECIMAL': {
      if (state.waitingForOperand || justEvaluated) return { ...state, display: '0.', justEvaluated: false, waitingForOperand: false }
      if (display.includes('.')) return state
      return { ...state, display: display + '.', justEvaluated: false }
    }
    case 'OPERATOR': {
      if (prevValue != null && !justEvaluated && !state.waitingForOperand) {
        const result = calc(prevValue, current, operator!)
        return { ...state, display: fmt(result), expression: `${fmt(result)} ${action.op}`, prevValue: result, operator: action.op, justEvaluated: false, waitingForOperand: true }
      }
      return { ...state, expression: `${display} ${action.op}`, prevValue: current, operator: action.op, justEvaluated: false, waitingForOperand: true }
    }
    case 'EQUALS': {
      if (!operator || prevValue == null) return state
      const result = calc(prevValue, current, operator)
      return { display: fmt(result), expression: `${fmt(prevValue)} ${operator} ${display} =`, prevValue: null, operator: null, justEvaluated: true, waitingForOperand: false }
    }
    case 'CLEAR': return CALC_INIT
    case 'TOGGLE_SIGN': return { ...state, display: fmt(current * -1), waitingForOperand: false }
    case 'PERCENT': return { ...state, display: fmt(current / 100), waitingForOperand: false }
    case 'BACKSPACE': {
      if (justEvaluated) return { ...state, display: '0', justEvaluated: false }
      if (display.length === 1 || (display.length === 2 && display.startsWith('-'))) return { ...state, display: '0', waitingForOperand: false }
      return { ...state, display: display.slice(0, -1), waitingForOperand: false }
    }
    case 'SET': return { ...CALC_INIT, display: fmt(action.value), justEvaluated: true }
    default: return state
  }
}

// ── Category Picker Popup ─────────────────────────────────────
interface CategoryPickerProps {
  amount:   number
  onPick:   (cat: GroceryCategory) => void
  onCancel: () => void
}

function CategoryPicker({ amount, onPick, onCancel }: CategoryPickerProps) {
  const [personExpanded, setPersonExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(ref.current, { y: 20, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' })
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={onCancel} />
      <div ref={ref} className="fixed inset-x-4 bottom-4 z-50 bg-bg-raised border border-border shadow-modal rounded-[var(--radius)] overflow-hidden max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-[0.62rem] text-text-faint uppercase tracking-widest font-bold">Adding to grocery</p>
            <p className="text-lg font-mono font-bold text-brand tabular-nums">{formatPeso(amount)}</p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay transition-colors rounded-[var(--radius)]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Categories */}
        <div className="p-4">
          <p className="text-[0.6rem] text-text-faint uppercase tracking-[0.15em] font-bold mb-3">Select a category</p>

          {!personExpanded ? (
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                'group' in cat ? (
                  <button
                    key="person"
                    onClick={() => setPersonExpanded(true)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border bg-bg-overlay hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] transition-colors rounded-[var(--radius)] text-sm font-medium text-text"
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                    <ChevronRight className="w-3 h-3 text-text-faint" />
                  </button>
                ) : (
                  <button
                    key={cat.id}
                    onClick={() => onPick(cat.id)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border bg-bg-overlay hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] transition-colors rounded-[var(--radius)] text-sm font-medium text-text"
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                )
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => setPersonExpanded(false)} className="flex items-center gap-1.5 text-[0.7rem] text-text-faint hover:text-text mb-3 transition-colors">
                <ChevronRight className="w-3 h-3 rotate-180" /> Back to categories
              </button>
              <div className="flex flex-wrap gap-2">
                {(['Vincent', 'Aiden', 'Karen', 'Lola', 'Ailene', 'Mikay'] as GroceryCategory[]).map(name => (
                  <button
                    key={name}
                    onClick={() => onPick(name)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border bg-bg-overlay hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] transition-colors rounded-[var(--radius)] text-sm font-medium text-text"
                  >
                    <span>👤</span>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Save Modal ────────────────────────────────────────────────
interface SaveModalProps {
  total:             number
  activeMonthId:     string | null
  onSaveToMonthly:   (expenseId: string) => Promise<void>
  onSaveToMisc:      (name: string) => Promise<void>
  onClose:           () => void
}

function SaveModal({ total, activeMonthId, onSaveToMonthly, onSaveToMisc, onClose }: SaveModalProps) {
  const [mode,       setMode]       = useState<'pick' | 'monthly' | 'misc'>('pick')
  const [unlogged,   setUnlogged]   = useState<MonthlyExpense[]>([])
  const [selected,   setSelected]   = useState<string | null>(null)
  const [miscName,   setMiscName]   = useState('')
  const [saving,     setSaving]     = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(ref.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' })
  }, [])

  useEffect(() => {
    if (!activeMonthId) return
    getSupabase()
      .from('monthly_expenses')
      .select('*')
      .eq('month_id', activeMonthId)
      .is('amount', null)
      .order('sort_order')
      .then(({ data }: { data: MonthlyExpense[] | null }) => setUnlogged(data ?? []))
  }, [activeMonthId])

  async function handleSaveMonthly() {
    if (!selected) return
    setSaving(true)
    await onSaveToMonthly(selected)
    setSaving(false)
  }

  async function handleSaveMisc() {
    if (!miscName.trim()) return
    setSaving(true)
    await onSaveToMisc(miscName.trim())
    setSaving(false)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className="fixed inset-x-4 bottom-4 z-50 bg-bg-raised border border-border shadow-modal rounded-[var(--radius)] overflow-hidden max-w-sm mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-[0.62rem] text-text-faint uppercase tracking-widest font-bold">Save grocery session</p>
            <p className="text-lg font-mono font-bold text-brand tabular-nums">{formatPeso(total)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-text-faint hover:text-text hover:bg-bg-overlay transition-colors rounded-[var(--radius)]">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Pick mode */}
          {mode === 'pick' && (
            <>
              <p className="text-[0.7rem] text-text-muted">Where do you want to save this?</p>
              {unlogged.length > 0 && (
                <button onClick={() => setMode('monthly')} className="w-full flex items-center justify-between px-4 py-3 border border-border bg-bg-overlay hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] transition-colors rounded-[var(--radius)]">
                  <div className="text-left">
                    <p className="text-sm font-bold text-text">Save to Monthly Expense</p>
                    <p className="text-[0.68rem] text-text-faint mt-0.5">Log to an existing untracked expense</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-faint flex-shrink-0" />
                </button>
              )}
              <button onClick={() => setMode('misc')} className="w-full flex items-center justify-between px-4 py-3 border border-border bg-bg-overlay hover:border-brand/40 hover:bg-[oklch(from_var(--brand)_l_c_h_/_0.06)] transition-colors rounded-[var(--radius)]">
                <div className="text-left">
                  <p className="text-sm font-bold text-text">Save to Misc Expenses</p>
                  <p className="text-[0.68rem] text-text-faint mt-0.5">Add as a one-off expense with a description</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-faint flex-shrink-0" />
              </button>
              {unlogged.length === 0 && (
                <p className="text-[0.68rem] text-text-faint bg-bg-overlay border border-border px-3 py-2 rounded-[var(--radius)]">
                  No unlogged monthly expenses found. Add one in Setup first.
                </p>
              )}
            </>
          )}

          {/* Monthly expense picker */}
          {mode === 'monthly' && (
            <>
              <button onClick={() => setMode('pick')} className="flex items-center gap-1.5 text-[0.7rem] text-text-faint hover:text-text transition-colors">
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
              </button>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {unlogged.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => setSelected(exp.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 border transition-colors rounded-[var(--radius)] ${
                      selected === exp.id
                        ? 'border-brand bg-[oklch(from_var(--brand)_l_c_h_/_0.08)] text-brand'
                        : 'border-border bg-bg-overlay hover:border-brand/40 text-text'
                    }`}
                  >
                    <span className="text-sm font-medium">{exp.name}</span>
                    {selected === exp.id && <span className="text-[0.6rem] font-bold uppercase tracking-widest">Selected</span>}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveMonthly}
                disabled={!selected || saving}
                className="w-full h-10 bg-brand text-white text-[0.78rem] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all rounded-[var(--radius)]"
              >
                {saving ? 'Saving...' : '[ Save ]'}
              </button>
            </>
          )}

          {/* Misc expense */}
          {mode === 'misc' && (
            <>
              <button onClick={() => setMode('pick')} className="flex items-center gap-1.5 text-[0.7rem] text-text-faint hover:text-text transition-colors">
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
              </button>
              <div className="flex flex-col gap-1.5">
                <label className="text-[0.65rem] font-bold text-text-faint uppercase tracking-[0.15em]">Description</label>
                <input
                  type="text"
                  placeholder="e.g. SM Grocery June 15"
                  value={miscName}
                  onChange={e => setMiscName(e.target.value)}
                  className="h-10 bg-bg-overlay border border-border px-3.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-brand transition-colors rounded-[var(--radius)]"
                />
              </div>
              <button
                onClick={handleSaveMisc}
                disabled={!miscName.trim() || saving}
                className="w-full h-10 bg-brand text-white text-[0.78rem] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all rounded-[var(--radius)]"
              >
                {saving ? 'Saving...' : '[ Save ]'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ── Void Confirm ──────────────────────────────────────────────
function VoidConfirm({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const [input, setInput] = useState('')
  const correct = input === 'Grocery Delete'
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.fromTo(ref.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' })
  }, [])

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className="fixed inset-x-4 bottom-4 z-50 bg-bg-raised border border-expense/30 shadow-modal rounded-[var(--radius)] overflow-hidden max-w-sm mx-auto p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-expense flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-text">Void this session?</p>
            <p className="text-[0.72rem] text-text-muted mt-1">This will permanently delete all items in this grocery session. Type <span className="font-mono font-bold text-expense">Grocery Delete</span> to confirm.</p>
          </div>
        </div>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Grocery Delete"
          className="w-full h-10 bg-bg-overlay border border-border px-3.5 text-sm font-mono text-text placeholder:text-text-faint outline-none focus:border-expense transition-colors rounded-[var(--radius)]"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 border border-border text-text-faint text-[0.72rem] font-bold uppercase tracking-widest hover:bg-bg-overlay transition-colors rounded-[var(--radius)]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!correct}
            className="flex-1 h-9 bg-expense text-white text-[0.72rem] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-30 transition-all rounded-[var(--radius)]"
          >
            Void
          </button>
        </div>
      </div>
    </>
  )
}

// ── Delete Item Confirm ───────────────────────────────────────
function DeleteItemConfirm({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 bottom-4 z-50 bg-bg-raised border border-border shadow-modal rounded-[var(--radius)] max-w-sm mx-auto p-4 space-y-3">
        <p className="text-sm font-bold text-text">Remove this item?</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 border border-border text-text-faint text-[0.72rem] font-bold uppercase tracking-widest hover:bg-bg-overlay transition-colors rounded-[var(--radius)]">No</button>
          <button onClick={onConfirm} className="flex-1 h-9 bg-expense text-white text-[0.72rem] font-bold uppercase tracking-widest hover:opacity-90 transition-all rounded-[var(--radius)]">Remove</button>
        </div>
      </div>
    </>
  )
}

// ── Grocery Item Row ──────────────────────────────────────────
function GroceryItemRow({ item, onRemove, onUpdate }: {
  item: GroceryItem
  onRemove: () => void
  onUpdate: (patch: Partial<Pick<GroceryItem, 'name' | 'category'>>) => void
}) {
  const [showCatPicker, setShowCatPicker] = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [personExpanded, setPersonExpanded] = useState(false)

  return (
    <>
      <div className="flex items-start gap-2.5 px-4 py-3 border-b border-border/40 last:border-b-0">
        {/* Amount */}
        <span className="font-mono font-bold text-sm text-text tabular-nums flex-shrink-0 pt-0.5 min-w-[72px]">
          {formatPeso(item.amount)}
        </span>

        {/* Category badge (tappable) + name input */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <button
            onClick={() => setShowCatPicker(true)}
            className="self-start flex items-center gap-1 px-2 py-0.5 bg-bg-overlay border border-border hover:border-brand/40 transition-colors rounded-full text-[0.62rem] font-bold text-text-muted uppercase tracking-wide"
          >
            <span>{CATEGORY_EMOJI[item.category]}</span>
            <span>{item.category}</span>
          </button>
          <input
            type="text"
            value={item.name}
            onChange={e => onUpdate({ name: e.target.value })}
            placeholder="Add name (optional)"
            className="w-full bg-transparent border-b border-border/40 focus:border-brand outline-none text-xs text-text-muted placeholder:text-text-faint py-0.5 transition-colors"
          />
        </div>

        {/* Delete */}
        <button
          onClick={() => setShowDelete(true)}
          className="w-6 h-6 flex items-center justify-center text-text-faint hover:text-expense hover:bg-expense-dim transition-colors rounded flex-shrink-0 mt-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Category change picker */}
      {showCatPicker && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={() => { setShowCatPicker(false); setPersonExpanded(false) }} />
          <div className="fixed inset-x-4 bottom-4 z-50 bg-bg-raised border border-border shadow-modal rounded-[var(--radius)] max-w-sm mx-auto p-4">
            <p className="text-[0.6rem] text-text-faint uppercase tracking-[0.15em] font-bold mb-3">Change category</p>
            {!personExpanded ? (
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  'group' in cat ? (
                    <button key="person" onClick={() => setPersonExpanded(true)} className="flex items-center gap-1.5 px-3 py-2 border border-border bg-bg-overlay hover:border-brand/40 transition-colors rounded-[var(--radius)] text-sm font-medium text-text">
                      <span>{cat.emoji}</span><span>{cat.label}</span><ChevronRight className="w-3 h-3 text-text-faint" />
                    </button>
                  ) : (
                    <button key={cat.id} onClick={() => { onUpdate({ category: cat.id }); setShowCatPicker(false) }} className={`flex items-center gap-1.5 px-3 py-2 border transition-colors rounded-[var(--radius)] text-sm font-medium ${item.category === cat.id ? 'border-brand bg-[oklch(from_var(--brand)_l_c_h_/_0.08)] text-brand' : 'border-border bg-bg-overlay hover:border-brand/40 text-text'}`}>
                      <span>{cat.emoji}</span><span>{cat.label}</span>
                    </button>
                  )
                ))}
              </div>
            ) : (
              <div>
                <button onClick={() => setPersonExpanded(false)} className="flex items-center gap-1.5 text-[0.7rem] text-text-faint hover:text-text mb-3 transition-colors">
                  <ChevronRight className="w-3 h-3 rotate-180" /> Back
                </button>
                <div className="flex flex-wrap gap-2">
                  {(['Vincent', 'Aiden', 'Karen', 'Lola', 'Ailene', 'Mikay'] as GroceryCategory[]).map(name => (
                    <button key={name} onClick={() => { onUpdate({ category: name }); setShowCatPicker(false); setPersonExpanded(false) }} className={`flex items-center gap-1.5 px-3 py-2 border transition-colors rounded-[var(--radius)] text-sm font-medium ${item.category === name ? 'border-brand bg-[oklch(from_var(--brand)_l_c_h_/_0.08)] text-brand' : 'border-border bg-bg-overlay hover:border-brand/40 text-text'}`}>
                      <span>👤</span><span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {showDelete && (
        <DeleteItemConfirm
          onConfirm={() => { onRemove(); setShowDelete(false) }}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  )
}

// ── Budget Header ─────────────────────────────────────────────
function BudgetHeader({ budget, total, remaining, isOver }: {
  budget: number; total: number; remaining: number; isOver: boolean
}) {
  const pct = Math.min((total / budget) * 100, 100)
  const barColor = pct >= 100 ? 'bg-expense' : pct >= 80 ? 'bg-pending' : 'bg-income'

  return (
    <div className="border border-border bg-bg-raised shadow-card overflow-hidden">
      {/* Budget row */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em] mb-1">Budget</p>
        <p className="text-2xl font-mono font-bold text-text tabular-nums">{formatPeso(budget)}</p>
      </div>

      {/* Total + Remaining */}
      <div className="grid grid-cols-2 divide-x divide-border">
        <div className="px-4 py-3">
          <p className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em] mb-1">Total</p>
          <p className="text-lg font-mono font-bold text-expense tabular-nums">{formatPeso(total)}</p>
        </div>
        <div className="px-4 py-3">
          <p className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em] mb-1">Remaining</p>
          <p className={`text-lg font-mono font-bold tabular-nums ${isOver ? 'text-expense' : remaining < budget * 0.2 ? 'text-pending' : 'text-income'}`}>
            {isOver ? `-${formatPeso(Math.abs(remaining))}` : formatPeso(remaining)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-bg-overlay">
        <div className={`h-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ── Main GroceryMode Component ────────────────────────────────
interface GroceryModeProps {
  activeMonthId: string | null
}

export function GroceryMode({ activeMonthId }: GroceryModeProps) {
  const {
    session, loaded,
    startSession, addItem, removeItem, updateItem, voidSession,
    total, remaining, isOver,
  } = useGrocerySession()

  const [calcState,    dispatchCalc] = useReducer(calcReducer, CALC_INIT)
  const [budgetInput,  setBudgetInput]  = useState('')
  const [showCatPick,  setShowCatPick]  = useState(false)
  const [showSave,     setShowSave]     = useState(false)
  const [showVoid,     setShowVoid]     = useState(false)
  const [isOnline,     setIsOnline]     = useState(true)
  const [saving,       setSaving]       = useState(false)

  const listRef    = useRef<HTMLDivElement>(null)
  const headerRef  = useRef<HTMLDivElement>(null)

  // Online detection
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  // GSAP entrance
  useEffect(() => {
    if (!session) return
    gsap.from(headerRef.current, { y: -12, opacity: 0, duration: 0.3, ease: 'power2.out' })
    gsap.from('.grocery-calc', { y: 16, opacity: 0, duration: 0.35, delay: 0.1, ease: 'power2.out' })
  }, [!!session])

  // Animate new list items
  const prevCount = useRef(0)
  useEffect(() => {
    const count = session?.items.length ?? 0
    if (count > prevCount.current && listRef.current) {
      const rows = listRef.current.querySelectorAll('.grocery-item-row')
      const last = rows[rows.length - 1]
      if (last) gsap.fromTo(last, { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.22, ease: 'power2.out' })
    }
    prevCount.current = count
  }, [session?.items.length])

  function handleAddToGrocery() {
    const val = parseFloat(calcState.display)
    if (!val || val <= 0) return
    setShowCatPick(true)
  }

  function handleCategoryPick(cat: GroceryCategory) {
    const val = parseFloat(calcState.display)
    addItem(val, cat)
    setShowCatPick(false)
    dispatchCalc({ type: 'CLEAR' })
  }

  async function handleSaveToMonthly(expenseId: string) {
    await getSupabase()
      .from('monthly_expenses')
      .update({ amount: total, logged_at: new Date().toISOString() })
      .eq('id', expenseId)
    voidSession()
    setShowSave(false)
  }

  async function handleSaveToMisc(name: string) {
    if (!activeMonthId) return
    await getSupabase()
      .from('misc_expenses')
      .insert({ month_id: activeMonthId, name, amount: total })
    voidSession()
    setShowSave(false)
  }

  // ── Start screen ─────────────────────────────────────────────
  if (!loaded) return null

  if (!session) {
    return (
      <div className="relative min-h-[60vh] flex flex-col items-center justify-center">
        {/* Blurred preview */}
        <div className="absolute inset-0 pointer-events-none select-none blur-sm opacity-40 p-4 space-y-4">
          <div className="border border-border bg-bg-raised overflow-hidden">
            <div className="px-4 py-3 border-b border-border"><p className="text-[0.6rem] font-bold text-text-faint uppercase tracking-[0.18em] mb-1">Budget</p><p className="text-2xl font-mono font-bold text-text">₱3,000.00</p></div>
            <div className="grid grid-cols-2 divide-x divide-border">
              <div className="px-4 py-3"><p className="text-[0.6rem] font-bold text-text-faint uppercase mb-1">Total</p><p className="text-lg font-mono font-bold text-expense">₱1,245.00</p></div>
              <div className="px-4 py-3"><p className="text-[0.6rem] font-bold text-text-faint uppercase mb-1">Remaining</p><p className="text-lg font-mono font-bold text-income">₱1,755.00</p></div>
            </div>
            <div className="h-1 bg-bg-overlay"><div className="h-full w-2/5 bg-income" /></div>
          </div>
          <div className="border border-border bg-bg-raised h-64" />
        </div>

        {/* Start button overlay */}
        <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
          <div className="w-14 h-14 border border-brand/30 flex items-center justify-center" style={{ background: 'oklch(from var(--brand) l c h / 0.08)' }}>
            <ShoppingCart className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text uppercase tracking-widest">Grocery Mode</h2>
            <p className="text-[0.72rem] text-text-muted mt-1">Track your grocery spending in real time, even without internet.</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <input
              type="number"
              placeholder="Set your budget (₱)"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              className="h-11 bg-bg-raised border border-border px-4 text-sm text-text placeholder:text-text-faint outline-none focus:border-brand transition-colors text-center font-mono"
            />
            <button
              onClick={() => {
                const b = parseFloat(budgetInput)
                if (!b || b <= 0) return
                startSession(b)
              }}
              disabled={!budgetInput || parseFloat(budgetInput) <= 0}
              className="h-11 bg-brand text-white text-[0.8rem] font-bold uppercase tracking-[0.12em] hover:opacity-90 disabled:opacity-40 transition-all"
            >
              [ Start Grocery ]
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Active session ────────────────────────────────────────────
  const BUTTONS = [
    [
      { label: 'C',  action: { type: 'CLEAR' } as CalcAction,        style: 'fn' },
      { label: '±',  action: { type: 'TOGGLE_SIGN' } as CalcAction,  style: 'fn' },
      { label: '%',  action: { type: 'PERCENT' } as CalcAction,      style: 'fn' },
      { label: '÷',  action: { type: 'OPERATOR', op: '÷' } as CalcAction, style: 'op' },
    ],
    [
      { label: '7', action: { type: 'DIGIT', digit: '7' } as CalcAction },
      { label: '8', action: { type: 'DIGIT', digit: '8' } as CalcAction },
      { label: '9', action: { type: 'DIGIT', digit: '9' } as CalcAction },
      { label: '×', action: { type: 'OPERATOR', op: '×' } as CalcAction, style: 'op' },
    ],
    [
      { label: '4', action: { type: 'DIGIT', digit: '4' } as CalcAction },
      { label: '5', action: { type: 'DIGIT', digit: '5' } as CalcAction },
      { label: '6', action: { type: 'DIGIT', digit: '6' } as CalcAction },
      { label: '−', action: { type: 'OPERATOR', op: '−' } as CalcAction, style: 'op' },
    ],
    [
      { label: '1', action: { type: 'DIGIT', digit: '1' } as CalcAction },
      { label: '2', action: { type: 'DIGIT', digit: '2' } as CalcAction },
      { label: '3', action: { type: 'DIGIT', digit: '3' } as CalcAction },
      { label: '+', action: { type: 'OPERATOR', op: '+' } as CalcAction, style: 'op' },
    ],
    [
      { label: '⌫', action: { type: 'BACKSPACE' } as CalcAction, style: 'fn' },
      { label: '0', action: { type: 'DIGIT', digit: '0' } as CalcAction },
      { label: '.', action: { type: 'DECIMAL' } as CalcAction },
      { label: '=', action: { type: 'EQUALS' } as CalcAction, style: 'eq' },
    ],
  ]

  const btnBase = 'flex items-center justify-center text-sm font-semibold transition-all duration-100 active:scale-95 select-none cursor-pointer h-12 rounded-[var(--radius)]'
  const btnStyles: Record<string, string> = {
    default: 'bg-bg-overlay text-text hover:bg-bg-overlay/70 border border-border/50',
    fn:      'bg-bg-overlay/60 text-text-muted hover:bg-bg-overlay border border-border/50',
    op:      'bg-brand/10 text-brand hover:bg-brand/20 border border-brand/20 font-bold',
    eq:      'bg-brand text-white hover:opacity-90 font-bold shadow-sm',
  }

  const displayVal = parseFloat(calcState.display)
  const canAdd = displayVal > 0

  return (
    <div className="space-y-4 pb-4">

      {/* Budget header */}
      <div ref={headerRef}>
        <BudgetHeader
          budget={session.budget}
          total={total}
          remaining={remaining}
          isOver={isOver}
        />
      </div>

      {/* Offline notice */}
      {!isOnline && (
        <div className="flex items-start gap-2.5 bg-pending-dim border border-pending/25 px-4 py-3">
          <WifiOff className="w-4 h-4 text-pending flex-shrink-0 mt-0.5" />
          <p className="text-[0.72rem] text-pending leading-relaxed font-medium">
            This list is already saved within your phone. Don't clear your cache. Once you have signal or wifi, you can save it.
          </p>
        </div>
      )}

      {/* Calculator */}
      <div className="grocery-calc border border-border bg-bg-raised shadow-card overflow-hidden">
        {/* Display */}
        <div className="px-4 pt-4 pb-3 text-right border-b border-border">
          <p className="text-[0.68rem] text-text-faint font-mono min-h-[1rem] truncate">{calcState.expression || '\u00A0'}</p>
          <p className="text-[2rem] font-mono font-bold text-text tabular-nums leading-tight mt-0.5 truncate">{formatDisplay(calcState.display)}</p>
        </div>

        {/* Buttons */}
        <div className="px-3 py-3 grid grid-cols-4 gap-1.5">
          {BUTTONS.flat().map((btn, i) => (
            <button
              key={i}
              onClick={() => dispatchCalc(btn.action)}
              className={`${btnBase} ${btnStyles[btn.style ?? 'default']}`}
            >
              {btn.label === '⌫' ? <Delete className="w-4 h-4" /> : btn.label}
            </button>
          ))}
        </div>

        {/* Add to grocery button */}
        <div className="px-3 pb-3">
          <button
            onClick={handleAddToGrocery}
            disabled={!canAdd}
            className="w-full h-12 flex items-center justify-center gap-2 bg-income text-white text-[0.82rem] font-bold uppercase tracking-[0.1em] hover:opacity-90 disabled:opacity-30 transition-all rounded-[var(--radius)]"
          >
            <Plus className="w-4 h-4" />
            Add to Grocery
          </button>
        </div>
      </div>

      {/* Item list */}
      {session.items.length > 0 && (
        <div className="border border-border bg-bg-raised shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-[0.62rem] font-bold text-text-faint uppercase tracking-[0.18em]">
              {session.items.length} item{session.items.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[0.72rem] font-mono font-bold text-text tabular-nums">{formatPeso(total)}</span>
          </div>
          <div ref={listRef}>
            {[...session.items].reverse().map(item => (
              <div key={item.id} className="grocery-item-row">
                <GroceryItemRow
                  item={item}
                  onRemove={() => removeItem(item.id)}
                  onUpdate={patch => updateItem(item.id, patch)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {isOnline ? (
          <button
            onClick={() => setShowSave(true)}
            disabled={session.items.length === 0}
            className="flex-1 h-11 flex items-center justify-center gap-2 bg-brand text-white text-[0.78rem] font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-all rounded-[var(--radius)]"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        ) : (
          <div className="flex-1 h-11 flex items-center justify-center gap-2 border border-border bg-bg-overlay text-text-faint text-[0.72rem] font-bold uppercase tracking-widest rounded-[var(--radius)] cursor-not-allowed">
            <WifiOff className="w-3.5 h-3.5" />
            No Signal
          </div>
        )}
        <button
          onClick={() => setShowVoid(true)}
          className="h-11 px-4 flex items-center justify-center gap-1.5 border border-expense/30 text-expense hover:bg-expense-dim text-[0.72rem] font-bold uppercase tracking-widest transition-colors rounded-[var(--radius)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Void
        </button>
      </div>

      {/* Popups */}
      {showCatPick && (
        <CategoryPicker
          amount={parseFloat(calcState.display)}
          onPick={handleCategoryPick}
          onCancel={() => setShowCatPick(false)}
        />
      )}
      {showSave && (
        <SaveModal
          total={total}
          activeMonthId={activeMonthId}
          onSaveToMonthly={handleSaveToMonthly}
          onSaveToMisc={handleSaveToMisc}
          onClose={() => setShowSave(false)}
        />
      )}
      {showVoid && (
        <VoidConfirm
          onConfirm={() => { voidSession(); setShowVoid(false) }}
          onClose={() => setShowVoid(false)}
        />
      )}
    </div>
  )
}
